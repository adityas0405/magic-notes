from __future__ import annotations

import logging
from typing import Dict, Optional

from .base import OCREngine
from .paddle import PaddleOCREngine

logger = logging.getLogger(__name__)

_ENGINE_REGISTRY: Dict[str, OCREngine] = {}


def register_engine(engine: OCREngine) -> None:
    _ENGINE_REGISTRY[engine.name] = engine


def get_engine(name: str) -> Optional[OCREngine]:
    engine = _ENGINE_REGISTRY.get(name)
    if not engine:
        return None
    try:
        if engine.is_available():
            return engine
    except Exception:
        logger.exception("OCR engine availability check failed for %s", name)
        return None
    return None


register_engine(PaddleOCREngine())
