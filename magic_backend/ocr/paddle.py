from __future__ import annotations

import importlib.util
import logging
import os
import threading
from typing import List, Optional

from .base import OCREngine, OCRResult

logger = logging.getLogger(__name__)


class PaddleOCREngine(OCREngine):
    name = "paddleocr"
    _ocr = None
    _lock = threading.Lock()

    def is_available(self) -> bool:
        return importlib.util.find_spec("paddleocr") is not None

    def _get_ocr(self):
        if type(self)._ocr is not None:
            return type(self)._ocr
        with type(self)._lock:
            if type(self)._ocr is not None:
                return type(self)._ocr
            if not os.environ.get("OMP_NUM_THREADS"):
                os.environ["OMP_NUM_THREADS"] = "1"
            if not os.environ.get("MKL_NUM_THREADS"):
                os.environ["MKL_NUM_THREADS"] = "1"
            try:
                from paddleocr import PaddleOCR
            except ImportError as exc:
                raise ImportError(
                    "PaddleOCR is not available in this environment."
                ) from exc
            try:
                type(self)._ocr = PaddleOCR(
                    use_angle_cls=False,
                    lang="en",
                    use_gpu=False,
                    show_log=False,
                )
                logger.info("OCR engine initialized.")
            except RuntimeError as exc:
                if "PDX has already been initialized" in str(exc):
                    if type(self)._ocr is not None:
                        logger.warning(
                            "PaddleX already initialized; reusing existing OCR instance."
                        )
                        return type(self)._ocr
                raise
        return type(self)._ocr

    def run(self, image_path: str) -> OCRResult:
        ocr = self._get_ocr()
        result = ocr.ocr(image_path, cls=True)
        if not result:
            return "", None

        lines: List[str] = []
        confidences: List[float] = []
        for page in result:
            for entry in page:
                if not entry or len(entry) < 2:
                    continue
                text_info = entry[1]
                if not isinstance(text_info, (list, tuple)) or len(text_info) < 2:
                    continue
                text, confidence = text_info[0], text_info[1]
                if text:
                    lines.append(str(text))
                if confidence is not None:
                    try:
                        confidences.append(float(confidence))
                    except (TypeError, ValueError):
                        continue

        if not lines:
            return "", None

        avg_confidence = None
        if confidences:
            avg_confidence = sum(confidences) / len(confidences)
        return "\n".join(lines).strip(), avg_confidence
