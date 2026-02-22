"""
fingerprint.py
--------------
Deterministic query hashing for the Data Management Layer.
Every unique combination of metric + region + time_window produces
a stable SHA-256 fingerprint used as the snapshot cache key.
"""

import hashlib
import json
from dataclasses import dataclass, asdict
from app.config.settings import settings


@dataclass
class DataRequest:
    """Fully describes a data fetch request."""
    metric: str        # "temp" | "psal" | "pres" | "all"
    days: int          # look-back window in days
    lat_min: float = settings.LAT_MIN
    lat_max: float = settings.LAT_MAX
    lon_min: float = settings.LON_MIN
    lon_max: float = settings.LON_MAX

    def to_dict(self) -> dict:
        return asdict(self)


def generate_fingerprint(request: DataRequest) -> str:
    """
    Generate a stable SHA-256 fingerprint for a DataRequest.
    The fingerprint is derived from a canonical JSON representation
    of all request fields, sorted by key for stability.
    """
    canonical = json.dumps(request.to_dict(), sort_keys=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
