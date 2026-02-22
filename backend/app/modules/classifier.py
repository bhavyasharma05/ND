import re
import string
from app.models.response_model import QueryType

class QueryClassifier:
    
    def __init__(self):
        # Define intent signals
        self.greetings = {
            "hi", "hello", "hey", "good morning", "good evening", "greetings"
        }
        
        self.trend_indicators = {
            # Explicit trend words — require a time span to be meaningful
            "trend", "change", "over time", "history", "historical", "past", "variation",
            "average", "monthly", "weekly",
            # Time-span words (signals user wants data OVER a period)
            "month", "week", "year", "days", "months", "years",
            # Comparative / analytical language
            "compare", "compared", "comparison", "versus", "vs",
            "previous", "prior",
            "normal", "abnormal", "unusual", "anomaly", "anomalous",
            "rising", "falling", "increasing", "decreasing", "fluctuation",
            "higher", "lower", "warmer", "cooler", "hotter", "colder",
            "pattern", "seasonal", "forecast",
        }

        self.data_verbs = {
            "show", "list", "get", "fetch", "display", "give", "find", "see",
            # Implicit question verbs that imply data lookup
            "is", "are", "was", "were", "has", "have",
        }

        self.ocean_terms = {
            "float", "argo", "temperature", "salinity", "depth", "ocean",
            "profile", "location", "pressure", "psal", "temp", "water",
            "sea", "marine", "surface", "deep",
        }

        self.info_indicators = {
            "what", "why", "explain", "define", "how", "meaning", "concept",
            "describe",
        }

        self.data_scope_terms = {
            "latest", "current", "now", "today", "live",
            # Recency words that mean 'most recent', NOT a time series
            "recent", "last", "lately", "newest", "just",
            "data", "readings", "measurements", "measurement", "observations", "status",
            # Geographic scope
            "globally", "worldwide", "global", "anywhere", "all",
        }

    def _normalize(self, text: str) -> str:
        """Lowercase and remove punctuation."""
        text = text.lower()
        text = text.translate(str.maketrans("", "", string.punctuation))
        return text.strip()

    def classify(self, query: str) -> QueryType:
        """
        Classifies the user query based on intent signals.
        Priority: Greeting → INFO → Trend → Data_Current → Unknown
        INFO is checked before Data to avoid "what is salinity" → DATA_CURRENT.
        """
        clean_query = self._normalize(query)
        words = set(clean_query.split())

        # 1. Greeting
        if clean_query in self.greetings:
            return QueryType.GREETING

        has_info  = any(word in self.info_indicators for word in words)
        has_trend = any(word in self.trend_indicators for word in words)
        has_verb  = any(word in self.data_verbs for word in words)
        has_term  = any(word in self.ocean_terms for word in words) or "floats" in clean_query
        has_scope = any(word in self.data_scope_terms for word in words)

        # 2. INFO: "what is salinity", "explain thermocline", "how does pressure work"
        #    Only goes to INFO if no strong trend signal alongside it.
        if has_info and not has_trend:
            return QueryType.INFO

        # 3. Trend: comparative/temporal language with an ocean or data term
        if has_trend and (has_term or has_scope or not has_info):
            return QueryType.DATA_TREND

        # 4. Data_Current: explicit action verb + ocean/scope term
        if has_verb and (has_term or has_scope):
            return QueryType.DATA_CURRENT

        # 5. Implicit Data_Current: ocean term or scope term alone (no info/trend words)
        if (has_term or has_scope) and not has_info:
            return QueryType.DATA_CURRENT

        # 6. INFO fallback
        if has_info:
            return QueryType.INFO

        # 7. Unknown
        return QueryType.UNKNOWN

classifier = QueryClassifier()
