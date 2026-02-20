import time
from typing import Any, Dict, Optional, Tuple

class SimpleCache:
    def __init__(self):
        self._cache: Dict[str, Tuple[Any, float]] = {}

    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """
        Set a value in the cache with a TTL (default 300 seconds).
        """
        expiry_time = time.time() + ttl
        self._cache[key] = (value, expiry_time)

    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from the cache. Returns None if expired or not found.
        """
        if key not in self._cache:
            return None
            
        value, expiry_time = self._cache[key]
        
        if time.time() > expiry_time:
            del self._cache[key]
            return None
            
        return value

    def clear(self) -> None:
        """
        Clear the cache.
        """
        self._cache.clear()

cache = SimpleCache()
