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

llm_service = LLMService()
