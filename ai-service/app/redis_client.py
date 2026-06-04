"""Redis client for inference queue and pub/sub."""
import json
from typing import Optional

import redis.asyncio as aioredis
import structlog

from app.config import settings
from app.schemas import DetectionResult

log = structlog.get_logger()

QUEUE_KEY = "wilcam:inference:queue"
RESULT_PREFIX = "wilcam:inference:result:"
DETECTION_CHANNEL = "wilcam:detections"


class RedisClient:
    def __init__(self):
        self._redis: Optional[aioredis.Redis] = None

    async def connect(self):
        try:
            self._redis = aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
            )
            await self._redis.ping()
            log.info("redis_connected", url=settings.redis_url)
        except Exception as e:
            log.warning("redis_unavailable", error=str(e))
            self._redis = None

    async def disconnect(self):
        if self._redis:
            await self._redis.aclose()

    async def enqueue_inference(self, camera_id: str, frame_url: str, job_id: str):
        if not self._redis:
            return
        payload = json.dumps({"job_id": job_id, "camera_id": camera_id, "frame_url": frame_url})
        await self._redis.rpush(QUEUE_KEY, payload)

    async def dequeue_inference(self) -> Optional[dict]:
        if not self._redis:
            return None
        try:
            result = await self._redis.blpop(QUEUE_KEY, timeout=1)
            if result:
                return json.loads(result[1])
        except Exception:
            pass
        return None

    async def store_result(self, job_id: str, result):
        if not self._redis:
            return
        data = result.model_dump_json() if hasattr(result, "model_dump_json") else json.dumps(result)
        await self._redis.setex(f"{RESULT_PREFIX}{job_id}", settings.result_ttl, data)

    async def get_result(self, job_id: str) -> Optional[dict]:
        if not self._redis:
            return None
        data = await self._redis.get(f"{RESULT_PREFIX}{job_id}")
        return json.loads(data) if data else None

    async def publish_detection(self, camera_id: str, frame_id: str, result: DetectionResult):
        if not self._redis:
            return
        payload = {
            "camera_id": camera_id,
            "frame_id": frame_id,
            "person_count": result.person_count,
            "detections": [
                {"class_name": d.class_name, "confidence": d.confidence, "bbox": d.bbox.model_dump()}
                for d in result.detections
            ],
            "inference_ms": result.inference_ms,
        }
        await self._redis.publish(DETECTION_CHANNEL, json.dumps(payload))


redis_client = RedisClient()
