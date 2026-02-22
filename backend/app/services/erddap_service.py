import httpx
from app.config.settings import settings
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class ErddapService:

    def __init__(self):
        pass

    async def fetch_data(self, days: int = 1, metric: str = "all"):
        """
        Fetch data from ERDDAP with strict constraints.
        The `metric` parameter adds server-side filtering so we get valid rows
        for that metric — not millions of zero/null rows that get filtered client-side.
        """
        safe_days = min(days, 90)

        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=safe_days)

        time_min = start_time.strftime("%Y-%m-%dT%H:%M:%SZ")
        time_max = end_time.strftime("%Y-%m-%dT%H:%M:%SZ")

        base_url = (
            f"{settings.ERDDAP_SERVER}/erddap/"
            f"{settings.ERDDAP_PROTOCOL}/{settings.ERDDAP_DATASET}"
        )

        variables = "platform_number,time,latitude,longitude,pres,temp,psal"

        # Base constraints (always applied)
        constraints = (
            f"&time>={time_min}"
            f"&time<={time_max}"
            f"&latitude>={settings.LAT_MIN}"
            f"&latitude<={settings.LAT_MAX}"
            f"&longitude>={settings.LON_MIN}"
            f"&longitude<={settings.LON_MAX}"
        )

        # Metric-specific server-side constraints
        # These tell ERDDAP to only return rows with valid values for the metric,
        # so our processor limit of 2000 rows gives us 2000 USEFUL rows.
        if metric == "psal":
            constraints += "&psal>10&psal<45"
        elif metric == "temp":
            constraints += "&temp>-5&temp<40"
        elif metric == "pres":
            constraints += "&pres>=0"
        else:  # "all" — use temp as a baseline quality gate
            constraints += "&temp>-5&temp<40"

        full_url = f"{base_url}.json?{variables}{constraints}"
        logger.info(f"Fetching ERDDAP (metric={metric}, days={safe_days}): {full_url}")

        async with httpx.AsyncClient(timeout=45.0, http2=False) as client:
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
