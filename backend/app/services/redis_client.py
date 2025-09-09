from redis import asyncio as aioredis
from app.core.config import get_settings

_settings = get_settings()


def get_redis() -> aioredis.Redis:
    return aioredis.from_url(_settings.redis_url, decode_responses=True)