"""
orchestrator.py
---------------
Core query orchestration for Neel Drishti.

The orchestrator:
  1. Classifies the user query
  2. Builds a DataRequest and calls data_manager.get_dataset()
  3. Passes validated rows to trend_service or response builder
  4. Streams SSE events back to the route handler

The orchestrator NEVER imports erddap_service or processor_service directly.
All data access goes through data_manager.
"""

import logging
import json
from app.modules.classifier import classifier
from app.data_manager import data_manager, DataRequest
from app.services.trend_service import trend_service
from app.services.llm_service import llm_service
from app.cache.simple_cache import cache
from app.models.response_model import UnifiedResponse, QueryType
from app.utils.metric_resolver import metric_resolver
from app.config.settings import settings
import re

logger = logging.getLogger(__name__)

# ── Default DataRequest region from settings ───────────────────────────────────
_REGION = dict(
    lat_min=settings.LAT_MIN,
    lat_max=settings.LAT_MAX,
    lon_min=settings.LON_MIN,
    lon_max=settings.LON_MAX,
)


def _extract_depth_filter(query: str):
    """
    Parse depth/pressure constraints from natural language.
    Returns (min_pres, max_pres) or None if no constraint found.

    Examples:
      "deeper than 1000 meters"  → (1000, None)
      "below 500m"               → (500, None)
      "shallower than 200m"      → (None, 200)
      "between 100 and 500m"     → (100, 500)
    """
    q = query.lower()
    # "between X and Y meters/m"
    btw = re.search(r'between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)\s*(?:m|meters?|dbar)?', q)
    if btw:
        return float(btw.group(1)), float(btw.group(2))

    # "deeper than X" / "below X" / "more than X meters deep"
    deeper = re.search(r'(?:deeper\s+than|below|more\s+than|greater\s+than|over)\s+(\d+(?:\.\d+)?)\s*(?:m|meters?|dbar)?', q)
    if deeper:
        return float(deeper.group(1)), None

    # "shallower than X" / "above X" / "less than X meters"
    shallower = re.search(r'(?:shallower\s+than|above|less\s+than|under)\s+(\d+(?:\.\d+)?)\s*(?:m|meters?|dbar)?', q)
    if shallower:
        return None, float(shallower.group(1))

    return None  # no depth filter


class Orchestrator:

    async def process_query(self, user_query: str, context: list = None) -> UnifiedResponse:
        """Non-streaming query handler (kept for compatibility with /analyze endpoint)."""
        if not context:
            cached = cache.get(user_query)
            if cached:
                logger.info(f"Simple cache hit for: {user_query}")
                return cached

        query_type = classifier.classify(user_query)
        logger.info(f"Query classified as: {query_type}")
        response = None

        try:
            if query_type == QueryType.GREETING:
                response = UnifiedResponse(
                    query_type=query_type,
                    message="Hello! I am Neel Drishti, your oceanographic assistant. "
                            "Ask me about current Argo float data, trends, or ocean concepts.",
                    data=[],
                )

            elif query_type == QueryType.DATA_CURRENT:
                req = DataRequest(metric="all", days=1, **_REGION)
                result = await data_manager.get_dataset(req)
                if result.error:
                    msg = "Unable to fetch current data — no valid observations available."
                else:
                    msg = "Here is the latest oceanographic data from Argo floats."
                response = UnifiedResponse(
                    query_type=query_type,
                    message=msg,
                    data=result.rows,
                )

            elif query_type == QueryType.DATA_TREND:
                metric_key, _ = metric_resolver.resolve(user_query)
                req = DataRequest(metric=metric_key, days=30, **_REGION)
                result = await data_manager.get_dataset(req)
                trend_data = trend_service.generate_trends(result.rows) if not result.error else []
                response = UnifiedResponse(
                    query_type=query_type,
                    message="Here is the 30-day trend analysis.",
                    data=trend_data,
                )

            elif query_type == QueryType.INFO:
                explanation = await llm_service.generate_explanation(user_query, context=context)
                response = UnifiedResponse(query_type=query_type, message=explanation, data=[])

            elif query_type == QueryType.UNKNOWN:
                response = UnifiedResponse(
                    query_type=QueryType.UNKNOWN,
                    message="I'm not sure I understand. Try asking about 'current floats', "
                            "'temperature trends', or 'what is salinity'.",
                    data=[],
                )
            else:
                response = UnifiedResponse(
                    query_type=QueryType.INVALID,
                    message="I can only help with oceanographic data queries.",
                    data=[],
                )

        except Exception as e:
            logger.error(f"Error processing query: {e}")
            response = UnifiedResponse(
                query_type=QueryType.INVALID,
                message="An internal error occurred while processing your request.",
                data=[],
            )

        if response and response.query_type != QueryType.INVALID:
            cache.set(user_query, response)

        return response

    async def stream_query(self, user_query: str, context: list = None):
        """
        Streaming SSE handler — yields event strings to the route.

        Event types emitted:
            metadata      → {query_type, data, fingerprint, source, retrieved_at}
            visualization → {type, metric, dataKey, data}
            chunk         → text token (word or LLM token)
            error         → error message string
        """
        query_type = classifier.classify(user_query)
        logger.info(f"Stream query classified as: {query_type}")

        metadata = {"query_type": query_type, "data": []}

        try:
            # ── Data queries ──────────────────────────────────────────────────
            if query_type == QueryType.DATA_CURRENT:
                req = DataRequest(metric="all", days=1, **_REGION)
                result = await data_manager.get_dataset(req)

                # Parse depth/pressure filter from the query
                rows = result.rows
                depth_filter = _extract_depth_filter(user_query)
                if depth_filter and rows:
                    min_pres, max_pres = depth_filter
                    rows = [
                        r for r in rows
                        if r.get("pres") is not None
                        and (min_pres is None or float(r["pres"]) >= min_pres)
                        and (max_pres is None or float(r["pres"]) <= max_pres)
                    ]
                    logger.info(f"Depth filter pres=[{min_pres},{max_pres}]: {len(rows)} rows")

                metadata["data"] = rows
                metadata["fingerprint"] = result.fingerprint
                metadata["source"] = result.source
                metadata["retrieved_at"] = result.retrieved_at

                # Emit table visualization with top 10 rows
                if rows:
                    table_rows = rows[:10]
                    table_payload = {
                        "type": "table",
                        "columns": ["platform_number", "time", "latitude", "longitude", "pres", "temp", "psal"],
                        "rows": table_rows,
                        "total": len(rows),
                    }
                    yield f"event: visualization\ndata: {json.dumps(table_payload)}\n\n"

            elif query_type == QueryType.DATA_TREND:
                metric_key, metric_label = metric_resolver.resolve(user_query)
                req = DataRequest(metric=metric_key, days=30, **_REGION)
                result = await data_manager.get_dataset(req)

                # Map metric key to the trend output field name
                data_key_map = {
                    "temp": "avg_temp",
                    "psal": "avg_salinity",
                    "pres": "avg_pressure",
                }
                viz_data_key = data_key_map.get(metric_key, "avg_temp")

                logger.info(f"Trend rows after DML: {len(result.rows)} (metric={metric_key}, source={result.source})")
                trend_data = trend_service.generate_trends(result.rows) if not result.error else []
                logger.info(f"Trend points generated: {len(trend_data)}")

                metadata["data"] = trend_data
                metadata["fingerprint"] = result.fingerprint
                metadata["source"] = result.source
                metadata["retrieved_at"] = result.retrieved_at

                if trend_data:
                    viz_payload = {
                        "type": "line_chart",
                        "metric": metric_label,
                        "dataKey": viz_data_key,
                        "data": trend_data,
                    }
                    yield f"event: visualization\ndata: {json.dumps(viz_payload)}\n\n"

            # ── Always yield metadata ─────────────────────────────────────────
            yield f"event: metadata\ndata: {json.dumps(metadata)}\n\n"

            # ── Text response ─────────────────────────────────────────────────
            if query_type == QueryType.INFO:
                async for chunk in llm_service.stream_explanation(user_query, context=context):
                    if chunk:
                        yield f"event: chunk\ndata: {json.dumps(chunk)}\n\n"

            elif query_type == QueryType.DATA_CURRENT:
                rows = metadata.get("data", [])
                total = len(rows)
                if total == 0:
                    msg = "No Argo float observations were found in the Indian Ocean region for today."
                    for word in msg.split():
                        yield f"event: chunk\ndata: {json.dumps(word + ' ')}\n\n"
                else:
                    # Summarise the data for the LLM
                    depth_filter = _extract_depth_filter(user_query)
                    filter_desc = ""
                    if depth_filter:
                        mn, mx = depth_filter
                        if mn and mx:  filter_desc = f" deeper than {mn} m and shallower than {mx} m"
                        elif mn:      filter_desc = f" deeper than {mn} m"
                        elif mx:      filter_desc = f" shallower than {mx} m"

                    temps  = [float(r["temp"]) for r in rows if r.get("temp") is not None]
                    psals  = [float(r["psal"]) for r in rows if r.get("psal") is not None]
                    preses = [float(r["pres"]) for r in rows if r.get("pres") is not None]

                    summary = (
                        f"{total} Argo float observation(s) found{filter_desc}.\n"
                        f"Temperature: min={round(min(temps),2) if temps else 'N/A'}, "
                        f"max={round(max(temps),2) if temps else 'N/A'}, "
                        f"avg={round(sum(temps)/len(temps),2) if temps else 'N/A'} °C\n"
                        f"Salinity: avg={round(sum(psals)/len(psals),2) if psals else 'N/A'} PSU\n"
                        f"Pressure: min={round(min(preses),2) if preses else 'N/A'} dbar, "
                        f"max={round(max(preses),2) if preses else 'N/A'} dbar"
                    )
                    analysis_prompt = (
                        f'The user asked: "{user_query}"\n\n'
                        f"Here is a summary of the Argo float data retrieved:\n{summary}\n\n"
                        f"Answer the user's question using this data. Be specific — mention actual numbers. "
                        f"Keep the answer under 3 sentences. No markdown, no bullet points."
                    )
                    async for chunk in llm_service.stream_explanation(analysis_prompt, context=context):
                        if chunk:
                            yield f"event: chunk\ndata: {json.dumps(chunk)}\n\n"

            elif query_type == QueryType.DATA_TREND:
                _, label = metric_resolver.resolve(user_query)
                if not metadata.get("data"):
                    # No data found — give a helpful explanation
                    msg = (
                        f"I couldn't find enough {label.lower()} observations in the current "
                        f"region over the last 30 days to generate a trend. "
                        f"The Indian Ocean Argo float network may have sparse "
                        f"{label.lower()} coverage in this area. Try asking about temperature instead."
                    )
                    for word in msg.split():
                        yield f"event: chunk\ndata: {json.dumps(word + ' ')}\n\n"
                else:
                    # Compute stats from the trend data to pass to LLM
                    td = metadata["data"]
                    data_key = {
                        "temp": "avg_temp",
                        "psal": "avg_salinity",
                        "pres": "avg_pressure",
                    }.get(metric_key, "avg_temp")

                    values = [p[data_key] for p in td if p.get(data_key) is not None]
                    if values:
                        first_val = values[0]
                        last_val  = values[-1]
                        trend_dir = (
                            "rising" if last_val > first_val + 0.5 else
                            "falling" if last_val < first_val - 0.5 else
                            "stable"
                        )
                        stats = {
                            "min":       round(min(values), 2),
                            "max":       round(max(values), 2),
                            "avg":       round(sum(values) / len(values), 2),
                            "latest":    round(last_val, 2),
                            "trend":     trend_dir,
                            "date_from": td[0]["date"],
                            "date_to":   td[-1]["date"],
                            "days":      len(td),
                        }
                        async for chunk in llm_service.stream_data_analysis(
                            user_query, label, stats, context=context
                        ):
                            if chunk:
                                yield f"event: chunk\ndata: {json.dumps(chunk)}\n\n"
                    else:
                        msg = f"The chart is displayed above. No numeric {label.lower()} values were available for analysis."
                        for word in msg.split():
                            yield f"event: chunk\ndata: {json.dumps(word + ' ')}\n\n"


            elif query_type == QueryType.GREETING:
                msg = "Hello! I am Neel Drishti, your oceanographic assistant. How can I help you today?"
                for word in msg.split():
                    yield f"event: chunk\ndata: {json.dumps(word + ' ')}\n\n"

            elif query_type == QueryType.UNKNOWN:
                msg = "I'm not sure I understand. Try asking about 'current floats' or 'temperature trends'."
                for word in msg.split():
                    yield f"event: chunk\ndata: {json.dumps(word + ' ')}\n\n"

            else:
                yield f"event: chunk\ndata: {json.dumps('I can only help with oceanographic queries.')}\n\n"

        except Exception as e:
            logger.error(f"Error in stream_query: {e}")
            yield f"event: error\ndata: {json.dumps(str(e))}\n\n"


orchestrator = Orchestrator()
