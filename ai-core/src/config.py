"""
VectorOS AI Core Configuration
Enterprise-grade configuration management with validation
"""
import os
from typing import Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with validation and type safety"""

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Application
    app_name: str = "VectorOS AI Core"
    app_version: str = "0.1.0"
    environment: str = Field(default="development", alias="NODE_ENV")
    debug: bool = Field(default=True)

    # Server
    host: str = "0.0.0.0"
    port: int = Field(default=8000, alias="AI_CORE_PORT")

    # AI Configuration
    anthropic_api_key: str = Field(..., min_length=1)
    ai_model: str = "claude-sonnet-4-5-20250929"  # Claude Sonnet 4.5 (latest)
    ai_temperature: float = 0.7
    ai_max_tokens: int = 4096
    ai_timeout: int = 120

    # Database
    database_url: str = Field(..., min_length=1)
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_echo: bool = False

    # Redis Cache
    redis_url: str = Field(default="redis://localhost:6379/0")
    cache_ttl: int = 3600  # 1 hour

    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds

    # Logging
    log_level: str = "INFO"
    log_format: str = "json"  # json or text

    # CORS
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"]
    )

    # Monitoring
    enable_metrics: bool = True
    enable_tracing: bool = True

    # LangChain/LangSmith
    langchain_tracing: bool = Field(default=False, alias="LANGCHAIN_TRACING_V2")
    langchain_api_key: Optional[str] = Field(default=None, alias="LANGCHAIN_API_KEY")
    langchain_project: str = Field(default="vectoros-ai", alias="LANGCHAIN_PROJECT")

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"Environment must be one of {allowed}")
        return v

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v_upper = v.upper()
        if v_upper not in allowed:
            raise ValueError(f"Log level must be one of {allowed}")
        return v_upper

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        return self.environment == "development"


# Global settings instance
settings = Settings()
