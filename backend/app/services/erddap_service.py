import httpx
from app.config.settings import settings
from datetime import datetime, timedelta
import logging

# Configure logger
logger = logging.getLogger(__name__)

class ErddapService:
    
    def __init__(self):
        # We use settings directly for URL construction to avoid duplication
        pass

    async def fetch_data(self, days: int = 1):
        """
        Fetch data from ERDDAP with strict constraints.
        Restricted to short time windows for testing reliability.
        """
        # Allow up to 90 days (data manager controls the window for adaptive fetching)
        safe_days = min(days, 90)
        
        # Calculate time constraint
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=safe_days)
        
        # Format times for ERDDAP (ISO 8601)
        time_min = start_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        time_max = end_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # STEP 2: REBUILD URL CONSTRUCTION
        # Base: {SERVER}/erddap/{PROTOCOL}/{DATASET}
        base_url = f"{settings.ERDDAP_SERVER}/erddap/{settings.ERDDAP_PROTOCOL}/{settings.ERDDAP_DATASET}"
        
        # Variables
        variables = "platform_number,time,latitude,longitude,pres,temp,psal"
        
        # Constraints
        # Note: ERDDAP query strings start with ?variables&constraints
        query_params = (
            f".json?{variables}"
            f"&time>={time_min}"
            f"&time<={time_max}"
            f"&latitude>={settings.LAT_MIN}"
            f"&latitude<={settings.LAT_MAX}"
            f"&longitude>={settings.LON_MIN}"
            f"&longitude<={settings.LON_MAX}"
        )
        
        full_url = f"{base_url}{query_params}"
        
        # STEP 5: LOG FINAL URL
        logger.info(f"Fetching ERDDAP data from: {full_url}")
        
        # STEP 4: USE HTTPX CORRECTLY (Disable HTTP/2)
        async with httpx.AsyncClient(timeout=30.0, http2=False) as client:
            try:
                response = await client.get(full_url)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logger.error(f"ERDDAP HTTP Error: {e}")
                return None
            except Exception as e:
                logger.error(f"ERDDAP Error: {e}")
                return None

erddap_service = ErddapService()
