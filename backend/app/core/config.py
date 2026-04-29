from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://portfolio:password@localhost:5432/portfolio_db"
    SECRET_KEY: str = "change-this-secret-key-in-production-minimum-32-characters"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    REDIS_URL: str = "redis://localhost:6379"
    CORS_ORIGINS: str = '["http://localhost:3000"]'
    CORS_ALLOW_ORIGIN_REGEX: str = ""
    ENVIRONMENT: str = "development"
    CRON_SECRET: str = ""
    WEBAUTHN_RP_ID: str = "localhost"
    WEBAUTHN_RP_NAME: str = "PakFinance"
    WEBAUTHN_ORIGIN: str = "http://localhost:3000"
    ADMIN_EMAILS: str = "[]"

    @property
    def cors_origins_list(self) -> List[str]:
        try:
            return json.loads(self.CORS_ORIGINS)
        except Exception:
            return ["http://localhost:3000"]

    @property
    def cors_origin_regex(self) -> str | None:
        if self.CORS_ALLOW_ORIGIN_REGEX:
            return self.CORS_ALLOW_ORIGIN_REGEX
        if self.ENVIRONMENT == "production":
            return r"https://.*\.vercel\.app"
        return None

    @property
    def admin_emails_list(self) -> List[str]:
        try:
            raw = json.loads(self.ADMIN_EMAILS)
            if isinstance(raw, list):
                return [str(item).strip().lower() for item in raw if str(item).strip()]
        except Exception:
            pass
        return []

    class Config:
        env_file = (".env", ".env.local")


settings = Settings()
