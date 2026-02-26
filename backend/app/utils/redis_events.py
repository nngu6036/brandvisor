import os
import json
import redis
from langgraph.checkpoint.redis import RedisSaver

_redis_saver = None

def project_workflow_channel(project_id:str) -> str:
    return f"project:{project_id}:events"

def redis_client() -> redis.Redis:
    # Prefer explicit REDIS_URL, else reuse Celery broker if you want
    url = os.getenv("REDIS_URL") or os.getenv("CELERY_BROKER_URL") or "redis://localhost:6379/0"
    return redis.Redis.from_url(url, decode_responses=True)

def redis_saver() -> RedisSaver:
    """
    RedisSaver requires RedisJSON + RediSearch (Redis Stack / Redis 8+).
    """
    global _redis_saver
    if _redis_saver is not None:
        return _redis_saver
    saver = RedisSaver(redis_client=redis_client())
    saver.setup()
    _redis_saver = saver
    return _redis_saver



