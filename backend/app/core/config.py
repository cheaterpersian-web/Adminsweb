from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    # Security
    secret_key: str = Field(default="change-me", alias="SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=15, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_minutes: int = Field(default=60 * 24 * 7, alias="REFRESH_TOKEN_EXPIRE_MINUTES")

    # Database & Cache
    database_url: str = Field(default="postgresql+psycopg://admin:admin@postgres:5432/marzban", alias="DATABASE_URL")
    redis_url: str = Field(default="redis://redis:6379/0", alias="REDIS_URL")

    # File storage
    file_storage: str = Field(default="local", alias="FILE_STORAGE")  # local or s3
    local_storage_path: str = Field(default="/data/configs", alias="FILE_STORAGE_LOCAL_PATH")

    # S3
    s3_enabled: bool = Field(default=False, alias="S3_ENABLED")
    s3_endpoint_url: Optional[str] = Field(default=None, alias="S3_ENDPOINT_URL")
    s3_region: Optional[str] = Field(default=None, alias="S3_REGION")
    s3_bucket: Optional[str] = Field(default=None, alias="S3_BUCKET")
    s3_access_key_id: Optional[str] = Field(default=None, alias="S3_ACCESS_KEY_ID")
    s3_secret_access_key: Optional[str] = Field(default=None, alias="S3_SECRET_ACCESS_KEY")

    # CORS
    cors_origins: str = Field(default="*", alias="CORS_ORIGINS")

    # Rate limiting
    rate_limit: str = Field(default="5/minute", alias="RATE_LIMIT")

    # API
    api_prefix: str = Field(default="/api", alias="API_PREFIX")
    project_name: str = Field(default="Marzban Admin Panel", alias="PROJECT_NAME")
    env: str = Field(default="development", alias="ENV")
    expose_errors_public: bool = Field(default=False, alias="EXPOSE_ERRORS_PUBLIC")

    # Access Control
    root_admin_emails: str = Field(default="admin@example.com", alias="ROOT_ADMIN_EMAILS")

    class Config:
        case_sensitive = True
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]