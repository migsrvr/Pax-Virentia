"""Application configuration and environment settings."""

from pathlib import Path
from ipaddress import IPv6Address
import json
import re

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator

BACKEND_DIR = Path(__file__).resolve().parent.parent
DNS_LABEL = r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
ORIGIN = re.compile(rf"https?://(?P<host>{DNS_LABEL}(?:\.{DNS_LABEL})*|\[[0-9a-f:.]+\])(?::(?P<port>[0-9]{{1,5}}))?")
VERCEL_WILDCARD = "https://*.vercel.app"


def normalize_origin(value, *, allow_wildcard=False):
    """Accept an HTTP(S) origin, never credentials, paths, queries or regexes."""
    if not isinstance(value, str):
        raise ValueError("Origins must be HTTP(S) strings.")
    value = value.strip().removesuffix("/").lower()
    if allow_wildcard and value == VERCEL_WILDCARD:
        return value
    match = ORIGIN.fullmatch(value)
    if match is None or len(match["host"]) > 253:
        raise ValueError("Use an HTTP(S) origin or https://*.vercel.app without a path.")
    if match["host"].startswith("["):
        IPv6Address(match["host"][1:-1])
    if match["port"] is not None and not 1 <= int(match["port"]) <= 65535:
        raise ValueError("Origin ports must be between 1 and 65535.")
    return value


def parse_allowed_origins(value):
    """Support JSON arrays and comma-separated environment settings equally."""
    if isinstance(value, str):
        value = value.strip()
        value = json.loads(value) if value.startswith("[") else value.split(",") if value else []
    if not isinstance(value, list):
        raise ValueError("ALLOWED_ORIGINS must be a JSON array or comma-separated origins.")
    return list(dict.fromkeys(normalize_origin(item, allow_wildcard=True) for item in value))


class OriginPolicy:
    """One anchored, escaped policy shared by CORS, login and analyst CSRF."""
    def __init__(self, origins):
        self.origins = parse_allowed_origins(origins)
        patterns = [rf"https://(?:{DNS_LABEL}\.)+vercel\.app" if origin == VERCEL_WILDCARD
                    else re.escape(origin) for origin in self.origins]
        self.pattern = re.compile(r"\A(?:" + "|".join(patterns) + r")\Z") if patterns else None

    def allows(self, origin):
        try:
            origin = normalize_origin(origin)
        except ValueError:
            return False
        return self.pattern is not None and self.pattern.fullmatch(origin) is not None


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
    # The string union permits a before-validator to decode CSV on older supported
    # pydantic-settings versions, which otherwise eagerly require JSON for lists.
    ALLOWED_ORIGINS: list[str] | str = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"]
    ENABLE_EMBEDDED_WORKER: bool = True

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def validate_origins(cls, value):
        return parse_allowed_origins(value)

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
    GEMINI_MODEL: str = Field(default="gemini-3.5-flash", description="Pinned Gemini model identifier")

    # Initial Seed Analyst User
    SEED_USER_EMAIL: str = "rivera.dev.miggy@gmail.com"
    SEED_USER_PASSWORD: str = "pax-virentia-dev"
    SEED_USER_NAME: str = "Miggy"
    SEED_USER_ROLE: str = "analyst"


settings = Settings()
