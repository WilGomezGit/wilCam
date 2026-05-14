"""WilCam AI Microservice — Person detection via YOLOv8 ONNX."""
import asyncio
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import structlog
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

from app.config import settings
from app.detector import Detector
from app.redis_client import redis_client
from app.schemas import DetectionResult, HealthResponse, InferenceRequest

log = structlog.get_logger()

inference_counter = Counter("wilcam_inferences_total", "Total inference requests", ["camera_id", "result"])
inference_latency = Histogram("wilcam_inference_seconds", "Inference latency", ["camera_id"])
detection_counter = Counter("wilcam_detections_total", "Detections by class", ["class_name"])

detector: Optional[Detector] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global detector
    log.info("Starting WilCam AI service", model_path=settings.model_path, device=settings.device)
    try:
        detector = Detector(
            model_path=settings.model_path,
            confidence_threshold=settings.confidence_threshold,
            device=settings.device,
        )
        await detector.warmup()
        log.info("Detector ready", classes=detector.class_names[:5])
    except Exception as e:
        log.warning("Detector init failed — running in passthrough mode", error=str(e))
        detector = None

    await redis_client.connect()
    asyncio.create_task(_consume_inference_queue())
    log.info("AI service ready")
    yield
    await redis_client.disconnect()
    log.info("AI service shut down")


app = FastAPI(
    title="WilCam AI Service",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="ok",
        model_loaded=detector is not None,
        device=settings.device,
        version="2.0.0",
    )


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/detect", response_model=DetectionResult)
async def detect_objects(
    image: UploadFile = File(...),
    camera_id: str = Form(...),
    frame_id: Optional[str] = Form(None),
):
    """Run object detection on an uploaded image frame."""
    if detector is None:
        raise HTTPException(503, "Model not loaded")

    frame_id = frame_id or str(uuid.uuid4())
    start = time.perf_counter()

    try:
        data = await image.read()
        result = await detector.detect(data, camera_id)
        latency = time.perf_counter() - start

        inference_latency.labels(camera_id=camera_id).observe(latency)
        inference_counter.labels(camera_id=camera_id, result="ok").inc()
        for det in result.detections:
            detection_counter.labels(class_name=det.class_name).inc()

        # Publish result to Redis for backend consumption
        if result.detections:
            await redis_client.publish_detection(camera_id, frame_id, result)

        log.info("detection", camera=camera_id, count=len(result.detections), latency_ms=round(latency * 1000, 1))
        return result

    except Exception as e:
        inference_counter.labels(camera_id=camera_id, result="error").inc()
        log.error("inference_error", camera=camera_id, error=str(e))
        raise HTTPException(500, f"Inference error: {e}")


@app.post("/detect/batch")
async def detect_batch(requests: list[InferenceRequest]):
    """Queue multiple frames for async detection (returns job IDs)."""
    if not requests:
        raise HTTPException(400, "Empty batch")

    job_ids = []
    for req in requests[:20]:  # cap at 20 per batch
        job_id = str(uuid.uuid4())
        await redis_client.enqueue_inference(req.camera_id, req.frame_url, job_id)
        job_ids.append(job_id)

    return {"queued": len(job_ids), "job_ids": job_ids}


@app.get("/detect/result/{job_id}")
async def get_result(job_id: str):
    """Poll for async inference result."""
    result = await redis_client.get_result(job_id)
    if result is None:
        return JSONResponse({"status": "pending"}, status_code=202)
    return result


async def _consume_inference_queue():
    """Background worker: pull frames from Redis queue and run inference."""
    log.info("Inference queue consumer started")
    while True:
        try:
            job = await redis_client.dequeue_inference()
            if job and detector:
                job_id = job["job_id"]
                camera_id = job["camera_id"]
                frame_url = job["frame_url"]

                try:
                    import httpx
                    async with httpx.AsyncClient(timeout=10) as client:
                        resp = await client.get(frame_url)
                        resp.raise_for_status()
                        result = await detector.detect(resp.content, camera_id)
                        await redis_client.store_result(job_id, result)
                        if result.detections:
                            await redis_client.publish_detection(camera_id, job_id, result)
                except Exception as e:
                    log.error("queue_job_error", job_id=job_id, error=str(e))
                    await redis_client.store_result(job_id, {"error": str(e)})
        except Exception as e:
            log.error("queue_consumer_error", error=str(e))
        await asyncio.sleep(0.05)
