import logging
import json
from app.modules.classifier import classifier
from app.services.erddap_service import erddap_service
from app.services.processor_service import processor
from app.services.trend_service import trend_service
from app.services.llm_service import llm_service
from app.cache.simple_cache import cache
from app.models.response_model import UnifiedResponse, QueryType
from app.utils.metric_resolver import metric_resolver

logger = logging.getLogger(__name__)

class Orchestrator:
    
    async def process_query(self, user_query: str, context: list = None) -> UnifiedResponse:
        """
        Orchestrates the entire query handling process.
        """
        # 1. Check Cache (Only if no context, as context changes meaning)
        cached_response = None
        if not context:
            cached_response = cache.get(user_query)
            
        if cached_response:
            logger.info(f"Returning cached response for query: {user_query}")
            return cached_response

        # 2. Classify Query
        query_type = classifier.classify(user_query)
        logger.info(f"Query classified as: {query_type}")
        
        response = None
        
        try:
            if query_type == QueryType.GREETING:
                response = UnifiedResponse(
                    query_type=query_type,
                    message="Hello! I am Neel Drishti, your oceanographic assistant. You can ask me about current Argo float data, trends, or general ocean concepts.",
                    data=[]
                )

            elif query_type == QueryType.DATA_CURRENT:
                # Flow: Fetch ERDDAP -> Process Data -> Return
                raw_data = await erddap_service.fetch_data(days=1) # Recent data
                if raw_data:
                    clean_data = processor.process_erddap_data(raw_data)
                    response = UnifiedResponse(
                        query_type=query_type,
                        message="Here is the latest oceanographic data from Argo floats.",
                        data=clean_data
                    )
                else:
                    response = UnifiedResponse(
                        query_type=query_type,
                        message="Unable to fetch current data from ERDDAP at this time.",
                        data=[]
                    )

            elif query_type == QueryType.DATA_TREND:
                # Flow: Fetch ERDDAP -> Aggregate Data -> Return
                raw_data = await erddap_service.fetch_data(days=30)
                if raw_data:
                    clean_data = processor.process_erddap_data(raw_data, limit=500) # Get more data for trends
                    trend_data = trend_service.generate_trends(clean_data)
                    response = UnifiedResponse(
                        query_type=query_type,
                        message="Here is the 30-day trend analysis.",
                        data=trend_data
                    )
                else:
                    response = UnifiedResponse(
                        query_type=query_type,
                        message="Unable to fetch trend data at this time.",
                        data=[]
                    )

            elif query_type == QueryType.INFO:
                # Flow: Call Groq LLM -> Generate Explanation
                explanation = await llm_service.generate_explanation(user_query, context=context)
                response = UnifiedResponse(
                    query_type=query_type,
                    message=explanation,
                    data=[]
                )

            elif query_type == QueryType.UNKNOWN:
                response = UnifiedResponse(
                    query_type=QueryType.UNKNOWN,
                    message="I'm not sure I understand. Could you please rephrase? Try asking about 'current floats', 'temperature trends', or 'what is salinity'.",
                    data=[]
                )

            else: # INVALID or fallback
                response = UnifiedResponse(
                    query_type=QueryType.INVALID,
                    message="I can only help with oceanographic data queries (Current status, Trends, or Concepts).",
                    data=[]
                )
        
        except Exception as e:
            logger.error(f"Error processing query: {e}")
            response = UnifiedResponse(
                query_type=QueryType.INVALID,
                message="An internal error occurred while processing your request.",
                data=[]
            )

        # 3. Cache Result (only cache valid/successful data responses to avoid caching transient errors or greetings)
        # We generally don't cache greetings or unknown, but caching them is harmless and consistent.
        # Let's simple cache everything except errors.
        if response and response.query_type != QueryType.INVALID:
            cache.set(user_query, response)
            
        return response

    async def stream_query(self, user_query: str, context: list = None):
        """
        Orchestrates the query handling process with streaming response (SSE).
        Yields events: 'metadata' (JSON) and 'chunk' (text).
        """
        # 1. Classify Query
        query_type = classifier.classify(user_query)
        logger.info(f"Query classified as: {query_type}")

        # Default metadata structure
        metadata = {
            "query_type": query_type,
            "data": []
        }
        
        # logic for data fetching
        try:
            if query_type == QueryType.DATA_CURRENT:
                raw_data = await erddap_service.fetch_data(days=1)
                if raw_data:
                    metadata["data"] = processor.process_erddap_data(raw_data)
                    
            elif query_type == QueryType.DATA_TREND:
                # 1. Resolve Metric
                metric_key, metric_label = metric_resolver.resolve(user_query)
                
                # Map metric to data key
                data_key_map = {
                    "temp": "avg_temp",
                    "psal": "avg_salinity",
                    "pres": "avg_pressure"
                }
                viz_data_key = data_key_map.get(metric_key, "avg_temp")

                raw_data = await erddap_service.fetch_data(days=30)
                if raw_data:
                    clean_data = processor.process_erddap_data(raw_data, limit=500)
                    trend_data = trend_service.generate_trends(clean_data)
                    metadata["data"] = trend_data
                    
                    # Create visualization payload with dynamic metric
                    viz_payload = {
                        "type": "line_chart",
                        "metric": metric_label,
                        "dataKey": viz_data_key, # Frontend needs this to know which key to plot!
                        "data": trend_data
                    }
                    if trend_data:
                         yield f"event: visualization\ndata: {json.dumps(viz_payload)}\n\n"

            # Yield Metadata Event (general data)
            yield f"event: metadata\ndata: {json.dumps(metadata)}\n\n"

            # 2. Generate and Stream Text Response
            if query_type == QueryType.INFO:
                async for chunk in llm_service.stream_explanation(user_query, context=context):
                    if chunk:
                        yield f"event: chunk\ndata: {json.dumps(chunk)}\n\n"
            
            elif query_type in [QueryType.DATA_CURRENT, QueryType.DATA_TREND]:
                if query_type == QueryType.DATA_TREND:
                    # Resolve metric for message
                    _, label = metric_resolver.resolve(user_query)
                    base_msg = f"I've analyzed the {label.lower()} trends for you. The chart below shows the fluctuation over the last 30 days."
                else:
                    base_msg = "Here is the latest data."
                
                for word in base_msg.split():
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
