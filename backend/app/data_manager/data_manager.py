"""
data_manager.py
---------------
Main entry point for the Data Management Layer (DML).

The orchestrator calls ONLY this module — it never touches erddap_service
or processor directly. This module handles:

  1. Query fingerprinting
  2. Snapshot cache check / load
  3. ERDDAP fetch (on cache miss)
  4. Processor conversion (raw ERDDAP JSON → list of dicts)
  5. Data validation (remove invalid rows)
  6. Adaptive salinity fetch (widen window if sparse)
  7. Snapshot save
  8. Return DatasetResult with reproducibility metadata
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from app.data_manager.fingerprint import DataRequest, generate_fingerprint
from app.data_manager.snapshot_store import save_snapshot, load_snapshot
from app.data_manager.validator import validate_rows, validate_dataset
from app.services.erddap_service import erddap_service
from app.services.processor_service import processor

logger = logging.getLogger(__name__)

# Minimum rows to consider salinity data "sufficient"
SALINITY_SPARSE_THRESHOLD = 10
SALINITY_ADAPTIVE_DAYS = 90


@dataclass
class DatasetResult:
    """Returned by DataManager.get_dataset() to the orchestrator."""
    rows: list
    source: str           # "cache" | "ERDDAP"
    retrieved_at: str     # ISO timestamp
    fingerprint: str
    error: Optional[str] = None   # set if dataset invalid / empty


class DataManager:

    async def get_dataset(self, request: DataRequest) -> DatasetResult:
        """
        Fetch and return a validated dataset for the given request.

        The orchestrator must not import erddap_service or processor_service;
        this method is the single gateway to all data.
        """
        fingerprint = generate_fingerprint(request)
        now_iso = datetime.now(timezone.utc).isoformat()

        # ── 1. Check snapshot cache ────────────────────────────────────────────
        cached_rows = load_snapshot(fingerprint, request.metric, request.days)
        if cached_rows is not None:
            error = validate_dataset(cached_rows, request.metric)
            return DatasetResult(
                rows=cached_rows,
                source="cache",
                retrieved_at=now_iso,
                fingerprint=fingerprint,
                error=error,
            )

        # ── 2. Fetch from ERDDAP ───────────────────────────────────────────────
        logger.info(f"Cache miss — fetching ERDDAP (metric={request.metric}, "
                    f"days={request.days}, fp={fingerprint[:12]}…)")
        rows = await self._fetch_and_process(request.days, metric=request.metric,
                                              global_scope=request.global_scope)

        # ── 3. Validate ────────────────────────────────────────────────────────
        rows = validate_rows(rows, request.metric)

        # ── 4. Adaptive fetch for sparse salinity ─────────────────────────────
        if request.metric == "psal" and len(rows) < SALINITY_SPARSE_THRESHOLD:
            logger.info(
                f"Salinity sparse ({len(rows)} rows) — widening to "
                f"{SALINITY_ADAPTIVE_DAYS} days"
            )
            wider_request = DataRequest(
                metric=request.metric,
                days=SALINITY_ADAPTIVE_DAYS,
                lat_min=request.lat_min,
                lat_max=request.lat_max,
                lon_min=request.lon_min,
                lon_max=request.lon_max,
            )
            wider_fp = generate_fingerprint(wider_request)
            wider_cached = load_snapshot(wider_fp, request.metric, SALINITY_ADAPTIVE_DAYS)
            if wider_cached is not None:
                rows = wider_cached
                fingerprint = wider_fp
            else:
                wider_rows = await self._fetch_and_process(SALINITY_ADAPTIVE_DAYS, metric=request.metric,
                                                           global_scope=request.global_scope)
                rows = validate_rows(wider_rows, request.metric)
                save_snapshot(wider_fp, wider_request.to_dict(), rows)
                fingerprint = wider_fp

        # ── 5. Save snapshot ───────────────────────────────────────────────────
        save_snapshot(fingerprint, request.to_dict(), rows)

        # ── 6. Final validation check ──────────────────────────────────────────
        error = validate_dataset(rows, request.metric)
        if error:
            logger.warning(f"Dataset invalid after fetch: {error}")

        return DatasetResult(
            rows=rows,
            source="ERDDAP",
            retrieved_at=now_iso,
            fingerprint=fingerprint,
            error=error,
        )

    async def _fetch_and_process(self, days: int, metric: str = "all",
                                  global_scope: bool = False) -> list:
        """
        Internal: fetch raw ERDDAP JSON and convert to list of dicts.
        Returns empty list on failure.
        """
        raw = await erddap_service.fetch_data(days=days, metric=metric,
                                              global_scope=global_scope)
        if not raw:
            return []
        return processor.process_erddap_data(raw, limit=2000)


# Singleton — import this everywhere
data_manager = DataManager()
