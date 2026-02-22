from groq import AsyncGroq
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self.client = None
        if settings.GROQ_API_KEY:
            self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        else:
            logger.warning("GROQ_API_KEY not set. LLM features will be disabled.")

        self.model = "llama-3.1-8b-instant"
        self.system_prompt = (
            "You are an oceanographic expert assistant for the Neel Drishti project. "
            "Explain concepts clearly and scientifically. "
            "Do NOT use markdown, bullet points, asterisks, or bold text. "
            "Only answer ocean-related questions. "
            "If a question is not about oceanography, reply exactly: 'This system supports only oceanographic queries.' "
            "Keep responses concise (under 3 sentences)."
        )

    async def generate_explanation(self, query: str, context: list = None) -> str:
        """
        Generate a conceptual explanation using Groq LLM asynchronously.
        Supports conversation context.
        """
        if not self.client:
            return "LLM service unavailable. Please check configuration."

        try:
            messages = [
                {
                    "role": "system",
                    "content": self.system_prompt,
                }
            ]
            
            # Add context if available
            if context:
                for msg in context:
                    # Map 'assistant' role to 'assistant', 'user' to 'user'
                    # Ensure minimal keys
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if content:
                        messages.append({"role": role, "content": content})

            # Add current user query
            messages.append({
                "role": "user",
                "content": query,
            })

            chat_completion = await self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=0.5,
                max_tokens=150,
            )
            return chat_completion.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"LLM Error: {e}")
            return "Unable to generate explanation at this time."

    async def stream_explanation(self, query: str, context: list = None):
        """
        Generate a conceptual explanation using Groq LLM asynchronously, streaming content.
        Supports conversation context.
        """
        if not self.client:
            yield "LLM service unavailable. Please check configuration."
            return

        try:
            messages = [
                {
                    "role": "system",
                    "content": self.system_prompt,
                }
            ]
            
            # Add context if available
            if context:
                # Context here is expected to be a list of dicts with role and content
                for msg in context:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if content:
                        messages.append({"role": role, "content": content})

            # Add current user query
            messages.append({
                "role": "user",
                "content": query,
            })

            stream = await self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=0.5,
                max_tokens=150,
                stream=True,
            )
            
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                     yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"LLM Streaming Error: {e}")
            yield "Unable to generate explanation at this time."

    async def stream_data_analysis(self, user_query: str, metric_label: str,
                                    stats: dict, context: list = None):
        """
        Stream a contextual explanation of actual trend data in response to the user's question.

        Args:
            user_query:   The original user question (e.g. "Is the temperature normal?")
            metric_label: Human-readable metric name (e.g. "Temperature (°C)")
            stats:        Dict with keys: min, max, avg, latest, trend, date_from, date_to, days
            context:      Previous conversation messages
        """
        if not self.client:
            yield "LLM service unavailable. Please check configuration."
            return

        data_summary = (
            f"Metric: {metric_label}\n"
            f"Period: {stats.get('date_from', 'N/A')} to {stats.get('date_to', 'N/A')} "
            f"({stats.get('days', 0)} days)\n"
            f"Min: {stats.get('min', 'N/A')}  Max: {stats.get('max', 'N/A')}  "
            f"Average: {stats.get('avg', 'N/A')}\n"
            f"Latest reading: {stats.get('latest', 'N/A')}\n"
            f"Overall trend: {stats.get('trend', 'N/A')}"
        )

        analysis_prompt = (
            f"The user asked: \"{user_query}\"\n\n"
            f"Here is the actual oceanographic data retrieved from Argo floats:\n"
            f"{data_summary}\n\n"
            f"Answer the user's question using this data. Be specific — mention actual numbers. "
            f"Keep the answer under 3 sentences. No markdown, no bullet points."
        )

        try:
            messages = [{"role": "system", "content": self.system_prompt}]
            if context:
                for msg in context:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if content:
                        messages.append({"role": role, "content": content})
            messages.append({"role": "user", "content": analysis_prompt})

            stream = await self.client.chat.completions.create(
                messages=messages,
                model=self.model,
                temperature=0.4,
                max_tokens=200,
                stream=True,
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"LLM Data Analysis Error: {e}")
            yield "Unable to generate analysis at this time."

llm_service = LLMService()
