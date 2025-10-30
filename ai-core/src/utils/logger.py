"""
Enterprise-grade structured logging with context
"""
import logging
import sys
from typing import Any
from datetime import datetime

import structlog
from pythonjsonlogger import jsonlogger

from ..config import settings


def setup_logging() -> None:
    """Configure structured logging for the application"""

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer() if settings.log_format == "json"
            else structlog.dev.ConsoleRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Configure standard library logging
    handler = logging.StreamHandler(sys.stdout)

    if settings.log_format == "json":
        formatter = jsonlogger.JsonFormatter(
            fmt="%(timestamp)s %(level)s %(name)s %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S"
        )
        handler.setFormatter(formatter)

    logging.basicConfig(
        level=getattr(logging, settings.log_level),
        handlers=[handler],
        force=True
    )


def get_logger(name: str) -> structlog.BoundLogger:
    """Get a structured logger instance"""
    return structlog.get_logger(name)


class LoggerMixin:
    """Mixin to add logging capability to classes"""

    @property
    def logger(self) -> structlog.BoundLogger:
        if not hasattr(self, "_logger"):
            self._logger = get_logger(self.__class__.__name__)
        return self._logger


class RequestLogger:
    """Log HTTP requests with context"""

    def __init__(self):
        self.logger = get_logger("request")

    async def log_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        **kwargs: Any
    ) -> None:
        """Log HTTP request with metrics"""
        self.logger.info(
            "http_request",
            method=method,
            path=path,
            status_code=status_code,
            duration_ms=duration_ms,
            timestamp=datetime.utcnow().isoformat(),
            **kwargs
        )


class AILogger:
    """Specialized logger for AI operations"""

    def __init__(self):
        self.logger = get_logger("ai")

    def log_inference(
        self,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        duration_ms: float,
        success: bool,
        **kwargs: Any
    ) -> None:
        """Log AI inference with metrics"""
        self.logger.info(
            "ai_inference",
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            duration_ms=duration_ms,
            success=success,
            timestamp=datetime.utcnow().isoformat(),
            **kwargs
        )

    def log_agent_action(
        self,
        agent_name: str,
        action: str,
        tool: str | None = None,
        success: bool = True,
        **kwargs: Any
    ) -> None:
        """Log agent actions and tool usage"""
        self.logger.info(
            "agent_action",
            agent_name=agent_name,
            action=action,
            tool=tool,
            success=success,
            timestamp=datetime.utcnow().isoformat(),
            **kwargs
        )


# Global logger instances
request_logger = RequestLogger()
ai_logger = AILogger()
