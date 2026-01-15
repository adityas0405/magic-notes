# OCR MVP (Backend)

## Local OCR setup

1. Install system libraries required by PaddleOCR / OpenCV:

   ```bash
   sudo apt-get update
   sudo apt-get install -y libgl1 libglib2.0-0
   ```

2. Install Python dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Start the API:

   ```bash
   uvicorn server:app --reload
   ```

## Notes

- PaddleOCR will download its models on first run (ensure outbound network access).
- OCR output is generated asynchronously via the `/api/notes/{note_id}/ocr/enqueue` endpoint.
