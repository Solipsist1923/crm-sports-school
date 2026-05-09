from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 днів (у хвилинах)
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30 # 30 днів (у хвилинах)

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./crm.db")

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_ENABLED: bool = False

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000"]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
