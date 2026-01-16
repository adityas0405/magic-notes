# OCR MVP (Backend)

## Local OCR setup

1. Install base API dependencies (run from `magic_backend/` so local OCR shim
   packages resolve):

   ```bash
   pip install -r requirements.txt
   ```

2. Install OCR dependencies (only when OCR is enabled):

   ```bash
   pip install -r requirements-ocr.txt
   ```

3. Start the API (OCR disabled by default):

   ```bash
   OCR_ENABLED=false uvicorn server:app --reload
   ```

## Notes

- OCR is gated by the `OCR_ENABLED` feature flag (default: `false`). When disabled, the API should
  still boot and auth/login endpoints must work even if OCR dependencies are missing.
- Fly deploys should use `requirements.txt` (which includes `requirements-ocr.txt`) when
  `OCR_ENABLED=true` so OCR jobs run without `libGL.so.1` errors. The OCR
  requirements install local shim packages that depend on headless OpenCV
  wheels (including contrib) so PaddleOCR/PaddleX do not pull GUI OpenCV on Fly.
- Startup check (simulate missing OCR deps): in a fresh venv without `paddleocr` installed, run
  `OCR_ENABLED=false uvicorn server:app --reload` to confirm the server boots. Enable OCR with
  `OCR_ENABLED=true` and ensure OCR jobs run once dependencies are installed.
- PaddleOCR will download its models on first run (ensure outbound network access).
- OCR output is generated asynchronously via the `/api/notes/{note_id}/ocr/enqueue` endpoint.
