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

logger = logging.getLogger(__name__)

# ── Default DataRequest region from settings ───────────────────────────────────
_REGION = dict(
    lat_min=settings.LAT_MIN,
    lat_max=settings.LAT_MAX,
    lon_min=settings.LON_MIN,
    lon_max=settings.LON_MAX,
)


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
                metadata["data"] = result.rows
                metadata["fingerprint"] = result.fingerprint
                metadata["source"] = result.source
                metadata["retrieved_at"] = result.retrieved_at

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
                if metadata.get("source") == "cache":
                    msg = "Here is the latest Argo float data (served from cache)."
                else:
                    msg = "Here is the latest data."
                for word in msg.split():
                    yield f"event: chunk\ndata: {json.dumps(word + ' ')}\n\n"

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
                else:
                    source_note = " (from cache)" if metadata.get("source") == "cache" else ""
                    msg = (
                        f"I've analysed the {label.lower()} trends for you{source_note}. "
                        f"The chart shows the fluctuation over the last 30 days."
                    )
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
