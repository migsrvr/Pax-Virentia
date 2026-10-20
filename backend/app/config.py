"""Application configuration and environment settings."""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "Pax Virentia API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    CODE_VERSION: str = "0.1.0-dev"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"]

    # Sessions
    SESSION_LIFETIME_HOURS: int = 24
    SESSION_REMEMBER_HOURS: int = 720

    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///pax_virentia.db",
        description="Database connection string (Supabase PostgreSQL / SQLite)",
    )

    # Optional Supabase API Keys
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Security
    SECRET_KEY: str = Field(default="dev-secret-key-change-in-production-32chars", min_length=16)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # External AI Integration
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key")
    GEMINI_MODEL: str = Field(default="gemini-3.8-flash", description="Pinned Gemini model identifier")

    # Initial Seed Analyst User
    SEED_USER_EMAIL: str = "rivera.dev.miggy@gmail.com"
    SEED_USER_PASSWORD: str = "pax-virentia-dev"
    SEED_USER_NAME: str = "Miggy"
    SEED_USER_ROLE: str = "analyst"


settings = Settings()
