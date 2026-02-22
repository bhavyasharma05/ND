"""
validator.py
------------
Data validation for the Data Management Layer.
Removes physically impossible values, NaN/null entries, and
QC-failed observations before data reaches the trend engine.
"""

import math
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ─── Physical plausibility ranges ─────────────────────────────────────────────
VALID_RANGES: dict = {
    "temp": (-5.0, 40.0),       # Ocean temperature °C
    "psal": (10.0, 45.0),       # Practical salinity PSU (0 = sensor error)
    "pres": (0.0, 12_000.0),    # Pressure dbar (deepest ocean ~11k)
}

# ERDDAP column → metric key mapping
METRIC_COLUMN: dict = {
    "temp": "temp",
    "psal": "psal",
    "pres": "pres",
    "all": None,   # no single column filter for "all"
}


def _is_valid_value(value, low: float, high: float) -> bool:
    """Return True if value is a finite number within [low, high]."""
    try:
        v = float(value)
        return not math.isnan(v) and low <= v <= high
    except (TypeError, ValueError):
        return False


def validate_rows(rows: list, metric: str) -> list:
    """
    Filter rows to only those with valid values for the requested metric.

    For metric="all", validates that the row at minimum has valid lat/lon
    and at least one of temp/psal/pres is non-null.

    Args:
        rows:   List of data dicts from ERDDAP/processor.
        metric: One of "temp" | "psal" | "pres" | "all".

    Returns:
        Cleaned list of rows.
    """
    if not rows:
        return []

    cleaned = []
    rejected = 0

    for row in rows:
        # Always require valid coordinates
        try:
            lat = float(row.get("latitude", None))
            lon = float(row.get("longitude", None))
            if math.isnan(lat) or math.isnan(lon):
                rejected += 1
                continue
        except (TypeError, ValueError):
            rejected += 1
            continue

        if metric == "all":
            # Accept if at least one measurement is valid
            has_any = any(
                _is_valid_value(row.get(col), lo, hi)
                for col, (lo, hi) in VALID_RANGES.items()
                if col in row
            )
            if has_any:
                cleaned.append(row)
            else:
                rejected += 1
        else:
            col = METRIC_COLUMN.get(metric, metric)
            if col and col in VALID_RANGES:
                lo, hi = VALID_RANGES[col]
                if _is_valid_value(row.get(col), lo, hi):
                    cleaned.append(row)
                else:
                    rejected += 1
            else:
                # Unknown metric — pass the row through
                cleaned.append(row)

    if rejected:
        logger.info(f"Validator: removed {rejected}/{len(rows)} invalid rows "
                    f"(metric={metric})")
    return cleaned


def validate_dataset(rows: list, metric: str) -> Optional[str]:
    """
    Check if a cleaned dataset is usable.

    Returns:
        None if valid; a human-readable error string if not usable.
    """
    if not rows:
        return "no_data: dataset is empty after validation"

    if metric != "all":
        col = METRIC_COLUMN.get(metric, metric)
        if col and not any(col in row for row in rows[:5]):
            return f"no_data: metric column '{col}' not found in dataset"

    return None  # dataset is valid
