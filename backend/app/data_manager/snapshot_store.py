"""
snapshot_store.py
-----------------
File-based snapshot cache for the Data Management Layer.
Snapshots are stored as JSON files under backend/data_cache/.
Each snapshot has a TTL that varies by metric type.

NOTE: On Render free tier the filesystem resets on cold start —
caching benefits apply within a single running instance only.
"""

import os
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Cache directory ──────────────────────────────────────────────────────────
# Resolved relative to this file: backend/app/data_manager/ → backend/data_cache/
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE_DIR = os.path.join(_BASE_DIR, "data_cache")

# ─── TTL policy (hours) ───────────────────────────────────────────────────────
TTL_HOURS: dict = {
    "temp": 6,
    "psal": 24,      # salinity is sparse → cache longer
    "pres": 6,
    "all":  6,
}
HISTORICAL_TTL_HOURS = 168  # 7 days for long historical windows (days ≥ 7)


def _ensure_cache_dir() -> None:
    """Create the cache directory if it doesn't exist."""
    os.makedirs(CACHE_DIR, exist_ok=True)


def _snapshot_path(fingerprint: str) -> str:
    return os.path.join(CACHE_DIR, f"{fingerprint}.json")


def _get_ttl_hours(metric: str, days: int) -> int:
    """Return the appropriate TTL in hours for a given metric and time window."""
    if days >= 7:
        return HISTORICAL_TTL_HOURS
    return TTL_HOURS.get(metric, 6)


def save_snapshot(fingerprint: str, params: dict, rows: list) -> None:
    """
    Persist a dataset snapshot to disk.

    Args:
        fingerprint: SHA-256 key for this request.
        params:      DataRequest dict (for auditability).
        rows:        List of cleaned data dicts.
    """
    _ensure_cache_dir()
    snapshot = {
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "parameters": params,
        "rows": rows,
    }
    path = _snapshot_path(fingerprint)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(snapshot, f)
        logger.info(f"Snapshot saved: {fingerprint[:12]}… ({len(rows)} rows)")
    except OSError as e:
        logger.warning(f"Failed to save snapshot {fingerprint[:12]}: {e}")


def load_snapshot(fingerprint: str, metric: str, days: int) -> Optional[list]:
    """
    Load a snapshot if it exists and has not expired.

    Returns:
        List of rows if valid; None if missing or expired.
    """
    path = _snapshot_path(fingerprint)
    if not os.path.exists(path):
        return None

    try:
        with open(path, "r", encoding="utf-8") as f:
            snapshot = json.load(f)

        retrieved_at = datetime.fromisoformat(snapshot["retrieved_at"])
        ttl = timedelta(hours=_get_ttl_hours(metric, days))

        if datetime.now(timezone.utc) - retrieved_at > ttl:
            logger.info(f"Snapshot expired: {fingerprint[:12]}…")
            os.remove(path)
            return None

        rows = snapshot.get("rows", [])
        logger.info(f"Snapshot hit: {fingerprint[:12]}… ({len(rows)} rows, "
                    f"age={(datetime.now(timezone.utc) - retrieved_at).seconds // 60}m)")
        return rows

    except (OSError, KeyError, ValueError, json.JSONDecodeError) as e:
        logger.warning(f"Bad snapshot {fingerprint[:12]}: {e}")
        return None
