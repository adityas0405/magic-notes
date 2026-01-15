# OCR MVP (Backend)

## Local OCR setup

1. Install system libraries required by PaddleOCR / OpenCV (only when OCR is enabled):

   ```bash
   sudo apt-get update
   sudo apt-get install -y libgl1 libglib2.0-0
   ```

2. Install base API dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Install OCR dependencies (only when OCR is enabled):

   ```bash
   pip install -r requirements-ocr.txt
   ```

4. Start the API (OCR disabled by default):

   ```bash
   OCR_ENABLED=false uvicorn server:app --reload
   ```

## Notes

- OCR is gated by the `OCR_ENABLED` feature flag (default: `false`). When disabled, the API should
  still boot and auth/login endpoints must work even if OCR dependencies are missing.
- Startup check (simulate missing OCR deps): in a fresh venv without `paddleocr` installed, run
  `OCR_ENABLED=false uvicorn server:app --reload` to confirm the server boots. Enable OCR with
  `OCR_ENABLED=true` and ensure OCR jobs run once dependencies are installed.
- PaddleOCR will download its models on first run (ensure outbound network access).
- OCR output is generated asynchronously via the `/api/notes/{note_id}/ocr/enqueue` endpoint.
