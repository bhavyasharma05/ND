from typing import Any, List, Optional
from pydantic import BaseModel
from enum import Enum

class QueryType(str, Enum):
    DATA_CURRENT = "data_current"
    DATA_TREND = "data_trend"
    INFO = "info"
    GREETING = "greeting"
    UNKNOWN = "unknown"
    INVALID = "invalid" # Keeping for backward compatibility if needed, though classifier won't return it

class UnifiedResponse(BaseModel):
    query_type: QueryType
    message: str
    data: Optional[List[dict]] = []

class ErrorResponse(BaseModel):
    detail: str
