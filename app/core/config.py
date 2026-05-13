from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_BUCKET_NAME: str = "uide-streaming-ariel-matias"
    AWS_REGION: str = "us-east-1"
    DATABASE_URL: str = "sqlite:///./streaming.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()
