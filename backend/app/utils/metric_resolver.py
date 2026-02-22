from typing import Tuple

class MetricResolver:
    """
    Resolves oceanographic metrics from natural language queries.
    """
    
    METRIC_MAP = {
        "temp": ["temperature", "temp", "heat", "warmth", "celsius", "thermal", "hot", "cold"],
        "psal": ["salinity", "salt", "haline", "psal", "psu", "saline", "salty", "brine"],
        "pres": ["pressure", "depth", "bar", "dbar", "pres", "decibar", "deep"],
    }
    
    DEFAULT_METRIC = "temp"
    
    @classmethod
    def resolve(cls, query: str) -> Tuple[str, str]:
        """
        Extracts the metric key and a human-readable label from the query.
        Returns (metric_key, metric_label).
        e.g., ("psal", "Salinity")
        """
        query_lower = query.lower()
        
        for key, keywords in cls.METRIC_MAP.items():
            if any(word in query_lower for word in keywords):
                return key, cls._get_label(key)
                
        return cls.DEFAULT_METRIC, cls._get_label(cls.DEFAULT_METRIC)
    
    @staticmethod
    def _get_label(metric_key: str) -> str:
        if metric_key == "temp":
            return "Temperature (°C)"
        elif metric_key == "psal":
            return "Salinity (PSU)"
        elif metric_key == "pres":
            return "Pressure (dbar)"
        return metric_key.title()

metric_resolver = MetricResolver()
