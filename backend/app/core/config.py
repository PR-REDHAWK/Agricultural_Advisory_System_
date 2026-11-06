import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API metadata
    PROJECT_NAME: str = "Monsoon Intelligence API"
    VERSION: str = "1.0.0"

    # Gnani AI Credentials & URLs
    GNANI_API_KEY: str = ""
    GNANI_STT_URL: str = "https://api.vachana.ai/stt/v3"
    GNANI_STT_MODEL: str = "prisma-v2.5"
    GNANI_TTS_URL: str = "https://api.vachana.ai/api/v1/tts/inference"
    GNANI_TTS_MODEL: str = "timbre-v2.5"
    GNANI_TTS_VOICE: str = "Nalini"
    GNANI_TTS_LANGUAGE: str = "hi-IN"
    GNANI_TTS_SPEED: float = 1.0

    # Optional Evon Reasoning
    GNANI_EVON_ENDPOINT: Optional[str] = None
    GNANI_EVON_API_KEY: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
