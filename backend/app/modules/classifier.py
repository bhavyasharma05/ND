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
            "trend", "change", "over time", "history", "past", "last", "variation", 
            "average", "month", "week", "year"
        }
        
        self.data_verbs = {
            "show", "list", "get", "fetch", "display", "give", "find", "see"
        }
        
        self.ocean_terms = {
            "float", "argo", "temperature", "salinity", "depth", "ocean", 
            "profile", "location", "pressure", "psal", "temp", "water"
        }
        
        self.info_indicators = {
            "what", "why", "explain", "define", "how", "meaning", "concept"
        }

    def _normalize(self, text: str) -> str:
        """Lowercase and remove punctuation."""
        text = text.lower()
        # Remove punctuation
        text = text.translate(str.maketrans("", "", string.punctuation))
        return text.strip()

    def classify(self, query: str) -> QueryType:
        """
        Classifies the user query based on intent signals.
        Order: Greeting -> Trend -> Data -> Info -> Unknown
        """
        clean_query = self._normalize(query)
        words = set(clean_query.split())
        
        # 1. Greeting Detection
        # Check if the query consists MAINLY of greetings or starts with one
        # If it's just "hi" or "hello", perfectly greeting.
        if clean_query in self.greetings:
            return QueryType.GREETING
        
        # 2. Trend Detection
        # Needs to have a trend indicator AND an ocean term usually, but user said strict order.
        # "temperature trend last week" -> data_trend
        if any(word in self.trend_indicators for word in words):
            # trends usually imply data unless explicitly asking "what is a trend"
            # But let's check for info indicators too. If "what is trend", it's INFO.
            if not any(word in self.info_indicators for word in words):
                return QueryType.DATA_TREND
            
        # 3. Data Detection (Action + Domain Term)
        has_verb = any(word in self.data_verbs for word in words)
        has_term = any(word in self.ocean_terms for word in words) or "floats" in clean_query
        
        if has_verb and has_term:
            return QueryType.DATA_CURRENT

        # 4. Data Detection (Implicit Domain Mention)
        # "floats near india" -> No verb, but has 'floats'
        if has_term:
            # If it doesn't look like an info question
            if not any(word in self.info_indicators for word in words):
                 return QueryType.DATA_CURRENT

        # 5. Info Detection
        # "what is thermocline"
        if any(word in self.info_indicators for word in words):
            return QueryType.INFO

        # 6. Unknown Fallback
        return QueryType.UNKNOWN

classifier = QueryClassifier()
