import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ERDDAP_SERVER: str = "https://erddap.ifremer.fr"
    ERDDAP_PROTOCOL: str = "tabledap"
    ERDDAP_DATASET: str = "ArgoFloats"
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    
    # Geographic bounds
    LAT_MIN: float = -10.0
    LAT_MAX: float = 30.0
    LON_MIN: float = 40.0
    LON_MAX: float = 100.0
    
    # Time limits
    MAX_TIME_DAYS: int = 30
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
