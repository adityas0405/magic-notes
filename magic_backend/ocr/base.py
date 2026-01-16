from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional, Tuple


OCRResult = Tuple[str, Optional[float]]


class OCREngine(ABC):
    """Base interface for OCR engines.

    Engines must be safe to import lazily and should avoid raising at import-time.
    """
    name: str

    @abstractmethod
    def is_available(self) -> bool:
        """Return True when the engine can be instantiated and used safely."""
        pass

    @abstractmethod
    def run(self, image_path: str) -> OCRResult:
        """Run OCR and return (text, confidence).

        - text: extracted text or "" when no text is detected.
        - confidence: average confidence or None when unavailable.
        """
        pass
