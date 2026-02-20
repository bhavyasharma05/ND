from supabase import create_client, Client
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)

class SupabaseClient:
    def __init__(self):
        self._client: Client = None
        if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
            try:
                # Use service_role key ONLY on backend side.
                self._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
                logger.info("Supabase client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
        else:
            logger.warning("Supabase credentials missing. Persistence features disabled.")

    def get_client(self) -> Client:
        if not self._client:
            raise Exception("Supabase client not initialized")
        return self._client

    def get_client_for_user(self, access_token: str) -> Client:
        """
        Creates a lightweight client authenticated as the user.
        """
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
             raise Exception("Supabase not configured")
        
        # Create a new client instance
        # We can't reuse the admin client easily for user context in Python without set_session which mutates state
        # So we create a cheap new client or clone.
        # Ideally, we just use the REST API with the user's token.
        # supabase-py doesn't make this super cheap, but let's try:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        client.auth.set_session(access_token, "dummy_refresh")
        return client

supabase_integration = SupabaseClient()
