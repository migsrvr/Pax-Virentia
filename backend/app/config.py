"""Application configuration and environment settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    PROJECT_NAME: str = "Pax Virentia API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    CODE_VERSION: str = "unreleased"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:5174"]

    # Sessions
    SESSION_LIFETIME_HOURS: int = 24
    SESSION_REMEMBER_HOURS: int = 720

    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/pax_virentia",
        description="Neon / PostgreSQL pooled connection string",
    )

    # Security
    SECRET_KEY: str = Field(default="dev-secret-key-change-in-production-32chars", min_length=16)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # External AI Integration
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key")
    GEMINI_MODEL: str = Field(default="gemini-2.5-flash", description="Pinned Gemini model identifier")

settings = Settings()
