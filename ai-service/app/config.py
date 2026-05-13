from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_path: str = "/models/yolov8n.onnx"
    confidence_threshold: float = 0.5
    iou_threshold: float = 0.45
    device: str = "cpu"  # "cpu" | "cuda" | "coreml"
    max_image_size: int = 640
    redis_url: str = "redis://localhost:6379"
    backend_url: str = "http://localhost:3000"
    result_ttl: int = 300  # seconds

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
