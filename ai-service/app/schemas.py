from typing import Optional
from pydantic import BaseModel


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class Detection(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    bbox: BoundingBox


class DetectionResult(BaseModel):
    camera_id: str
    frame_id: Optional[str] = None
    detections: list[Detection]
    person_count: int
    inference_ms: float
    model_version: str = "yolov8n"


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    device: str
    version: str


class InferenceRequest(BaseModel):
    camera_id: str
    frame_url: str
    job_id: Optional[str] = None
