"""
Cache Service - Redis Integration for Performance
Caches expensive operations like vector searches and AI analyses.

This is Week 3 of building the AI brain - making it fast and scalable.
"""

import logging
import json
import hashlib
from typing import Any, Optional, Callable
from datetime import timedelta
from functools import wraps

import redis
from ..config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """
    Redis-based caching service for expensive AI operations.

    This service:
    1. Caches vector similarity searches
    2. Caches AI analysis responses
    3. Implements TTL-based expiration
    4. Provides cache invalidation strategies
    5. Handles cache misses gracefully
    """

    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize cache service with Redis connection.

        Args:
            redis_url: Redis connection URL (defaults to config)
        """
        self.redis_url = redis_url or settings.redis_url
        self.enabled = False
        self.client = None

        try:
            # Connect to Redis
            self.client = redis.from_url(
                self.redis_url,
                decode_responses=True,  # Automatically decode bytes to strings
                socket_connect_timeout=2,
                socket_timeout=2
            )

            # Test connection
            self.client.ping()
            self.enabled = True
            logger.info(f"Cache service initialized - Redis connected")

        except Exception as e:
            logger.warning(f"Cache service disabled - Redis connection failed: {e}")
            self.enabled = False
            self.client = None

    def _generate_key(self, namespace: str, *args, **kwargs) -> str:
        """
        Generate a unique cache key from arguments.

        Args:
            namespace: Cache namespace (e.g., 'similarity_search', 'ai_analysis')
            *args: Positional arguments to hash
            **kwargs: Keyword arguments to hash

        Returns:
            Unique cache key
        """
        # Create a stable representation of arguments
        key_data = {
            "args": args,
            "kwargs": sorted(kwargs.items())  # Sort for consistency
        }

        # Hash the data
        key_string = json.dumps(key_data, sort_keys=True)
        key_hash = hashlib.sha256(key_string.encode()).hexdigest()[:16]

        return f"vectoros:{namespace}:{key_hash}"

    async def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        if not self.enabled:
            return None

        try:
            value = self.client.get(key)
            if value:
                logger.debug(f"Cache hit: {key}")
                return json.loads(value)
            else:
                logger.debug(f"Cache miss: {key}")
                return None

        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set value in cache with optional TTL.

        Args:
            key: Cache key
            value: Value to cache (must be JSON serializable)
            ttl: Time to live in seconds (None = no expiration)

        Returns:
            True if successful
        """
        if not self.enabled:
            return False

        try:
            serialized = json.dumps(value)

            if ttl:
                self.client.setex(key, ttl, serialized)
            else:
                self.client.set(key, serialized)

            logger.debug(f"Cache set: {key} (TTL: {ttl}s)")
            return True

        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False

    async def delete(self, key: str) -> bool:
        """
        Delete value from cache.

        Args:
            key: Cache key

        Returns:
            True if deleted
        """
        if not self.enabled:
            return False

        try:
            deleted = self.client.delete(key)
            logger.debug(f"Cache delete: {key}")
            return bool(deleted)

        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.

        Args:
            pattern: Pattern to match (e.g., 'vectoros:deals:*')

        Returns:
            Number of keys deleted
        """
        if not self.enabled:
            return 0

        try:
            keys = self.client.keys(pattern)
            if keys:
                deleted = self.client.delete(*keys)
                logger.info(f"Cache invalidated: {deleted} keys matching {pattern}")
                return deleted
            return 0

        except Exception as e:
            logger.error(f"Cache pattern delete error: {e}")
            return 0

    async def cache_similar_deals(
        self,
        deal_id: str,
        workspace_id: str,
        similar_deals: list,
        ttl: int = 3600  # 1 hour
    ) -> bool:
        """
        Cache vector similarity search results.

        Args:
            deal_id: Deal being searched for
            workspace_id: Workspace context
            similar_deals: List of similar deals
            ttl: Cache duration in seconds

        Returns:
            True if cached successfully
        """
        key = self._generate_key(
            "similarity_search",
            deal_id=deal_id,
            workspace_id=workspace_id
        )

        return await self.set(key, similar_deals, ttl)

    async def get_similar_deals(
        self,
        deal_id: str,
        workspace_id: str
    ) -> Optional[list]:
        """
        Get cached similarity search results.

        Args:
            deal_id: Deal being searched for
            workspace_id: Workspace context

        Returns:
            Cached similar deals or None
        """
        key = self._generate_key(
            "similarity_search",
            deal_id=deal_id,
            workspace_id=workspace_id
        )

        return await self.get(key)

    async def cache_ai_analysis(
        self,
        deal_id: str,
        analysis: dict,
        ttl: int = 1800  # 30 minutes
    ) -> bool:
        """
        Cache AI analysis results.

        Args:
            deal_id: Deal analyzed
            analysis: Analysis results
            ttl: Cache duration in seconds

        Returns:
            True if cached successfully
        """
        key = self._generate_key("ai_analysis", deal_id=deal_id)
        return await self.set(key, analysis, ttl)

    async def get_ai_analysis(self, deal_id: str) -> Optional[dict]:
        """
        Get cached AI analysis.

        Args:
            deal_id: Deal to get analysis for

        Returns:
            Cached analysis or None
        """
        key = self._generate_key("ai_analysis", deal_id=deal_id)
        return await self.get(key)

    async def invalidate_deal_cache(self, deal_id: str) -> int:
        """
        Invalidate all cache entries for a deal.

        Call this when a deal is updated to ensure fresh data.

        Args:
            deal_id: Deal to invalidate

        Returns:
            Number of cache entries deleted
        """
        pattern = f"vectoros:*:{deal_id}:*"
        return await self.delete_pattern(pattern)

    async def invalidate_workspace_cache(self, workspace_id: str) -> int:
        """
        Invalidate all cache entries for a workspace.

        Args:
            workspace_id: Workspace to invalidate

        Returns:
            Number of cache entries deleted
        """
        pattern = f"vectoros:*:*:{workspace_id}:*"
        return await self.delete_pattern(pattern)

    def get_stats(self) -> dict:
        """
        Get cache statistics.

        Returns:
            Cache stats (connections, memory, etc.)
        """
        if not self.enabled:
            return {"enabled": False}

        try:
            info = self.client.info()
            return {
                "enabled": True,
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory_human", "0"),
                "total_commands": info.get("total_commands_processed", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": self._calculate_hit_rate(info)
            }

        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {"enabled": True, "error": str(e)}

    def _calculate_hit_rate(self, info: dict) -> float:
        """Calculate cache hit rate percentage."""
        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses

        if total == 0:
            return 0.0

        return round((hits / total) * 100, 2)


# Singleton instance
_cache_service: Optional[CacheService] = None


def get_cache_service() -> CacheService:
    """Get or create the cache service singleton."""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service


# Decorator for easy caching
def cached(namespace: str, ttl: int = 3600):
    """
    Decorator to cache function results.

    Usage:
        @cached("deal_analysis", ttl=1800)
        async def analyze_deal(deal_id: str):
            # expensive operation
            return result

    Args:
        namespace: Cache namespace
        ttl: Time to live in seconds
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache = get_cache_service()

            if not cache.enabled:
                return await func(*args, **kwargs)

            # Generate cache key
            key = cache._generate_key(namespace, *args, **kwargs)

            # Try to get from cache
            cached_result = await cache.get(key)
            if cached_result is not None:
                return cached_result

            # Cache miss - call function
            result = await func(*args, **kwargs)

            # Store in cache
            await cache.set(key, result, ttl)

            return result

        return wrapper
    return decorator
