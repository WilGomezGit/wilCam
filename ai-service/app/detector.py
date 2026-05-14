"""YOLOv8 ONNX inference engine."""
import io
import time
from pathlib import Path
from typing import Optional

import numpy as np
import structlog
from PIL import Image

from app.config import settings
from app.schemas import BoundingBox, Detection, DetectionResult

log = structlog.get_logger()

COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair",
    "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse",
    "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator",
    "book", "clock", "vase", "scissors", "teddy bear", "hair drier", "toothbrush",
]


class Detector:
    def __init__(self, model_path: str, confidence_threshold: float, device: str):
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = settings.iou_threshold
        self.input_size = settings.max_image_size
        self.class_names = COCO_CLASSES
        self._session = None
        self._load_model(model_path, device)

    def _load_model(self, model_path: str, device: str):
        import onnxruntime as ort

        if not Path(model_path).exists():
            raise FileNotFoundError(f"Model not found: {model_path}")

        providers = ["CPUExecutionProvider"]
        if device == "cuda":
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]

        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        opts.intra_op_num_threads = 2

        self._session = ort.InferenceSession(model_path, sess_options=opts, providers=providers)
        self._input_name = self._session.get_inputs()[0].name
        log.info("model_loaded", path=model_path, providers=self._session.get_providers())

    async def warmup(self):
        """Run a dummy inference to JIT-compile the graph."""
        dummy = np.zeros((1, 3, self.input_size, self.input_size), dtype=np.float32)
        self._session.run(None, {self._input_name: dummy})
        log.info("model_warmup_done")

    async def detect(self, image_bytes: bytes, camera_id: str) -> DetectionResult:
        t0 = time.perf_counter()
        img = self._preprocess(image_bytes)
        raw = self._session.run(None, {self._input_name: img})[0]
        detections = self._postprocess(raw)
        inference_ms = (time.perf_counter() - t0) * 1000

        persons = [d for d in detections if d.class_name == "person"]
        return DetectionResult(
            camera_id=camera_id,
            detections=detections,
            person_count=len(persons),
            inference_ms=round(inference_ms, 2),
        )

    def _preprocess(self, image_bytes: bytes) -> np.ndarray:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        orig_w, orig_h = img.size

        # Letterbox resize
        scale = min(self.input_size / orig_w, self.input_size / orig_h)
        new_w, new_h = int(orig_w * scale), int(orig_h * scale)
        img = img.resize((new_w, new_h), Image.BILINEAR)

        canvas = Image.new("RGB", (self.input_size, self.input_size), (114, 114, 114))
        canvas.paste(img, ((self.input_size - new_w) // 2, (self.input_size - new_h) // 2))

        arr = np.array(canvas, dtype=np.float32) / 255.0
        return arr.transpose(2, 0, 1)[np.newaxis]  # NCHW

    def _postprocess(self, raw: np.ndarray) -> list[Detection]:
        # YOLOv8 output: [1, 84, 8400] → transpose → [8400, 84]
        if raw.ndim == 3:
            raw = raw[0].T  # [8400, 84]

        detections = []
        for row in raw:
            cx, cy, w, h = row[:4]
            scores = row[4:]
            cls_id = int(np.argmax(scores))
            confidence = float(scores[cls_id])

            if confidence < self.confidence_threshold:
                continue

            x = float(cx - w / 2)
            y = float(cy - h / 2)
            detections.append(Detection(
                class_id=cls_id,
                class_name=COCO_CLASSES[cls_id] if cls_id < len(COCO_CLASSES) else str(cls_id),
                confidence=round(confidence, 4),
                bbox=BoundingBox(x=x / self.input_size, y=y / self.input_size,
                                 width=w / self.input_size, height=h / self.input_size),
            ))

        return self._nms(detections)

    def _nms(self, detections: list[Detection]) -> list[Detection]:
        if not detections:
            return []

        detections.sort(key=lambda d: d.confidence, reverse=True)
        kept = []
        for det in detections:
            dominated = False
            for kept_det in kept:
                if self._iou(det.bbox, kept_det.bbox) > self.iou_threshold and det.class_id == kept_det.class_id:
                    dominated = True
                    break
            if not dominated:
                kept.append(det)
        return kept

    @staticmethod
    def _iou(a: BoundingBox, b: BoundingBox) -> float:
        ax1, ay1 = a.x, a.y
        ax2, ay2 = a.x + a.width, a.y + a.height
        bx1, by1 = b.x, b.y
        bx2, by2 = b.x + b.width, b.y + b.height

        inter_w = max(0, min(ax2, bx2) - max(ax1, bx1))
        inter_h = max(0, min(ay2, by2) - max(ay1, by1))
        inter = inter_w * inter_h

        union = a.width * a.height + b.width * b.height - inter
        return inter / union if union > 0 else 0.0
