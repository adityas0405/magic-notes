# Magic Backend (API-only)

This backend is API-only and uses `models.py` for all SQLAlchemy models. Do **not**
redefine models in `server.py`. It is designed for cloud deployment on Railway or
Fly.io with managed PostgreSQL and S3-compatible object storage.

## Environment

Use `magic_backend/.env.example` as a template and configure these in Railway/Fly:

- `DATABASE_URL` (PostgreSQL)
- `JWT_SECRET` (signing secret for auth tokens)
- `JWT_EXPIRES_SECONDS` (optional, defaults to 604800)
- `CORS_ORIGINS` (your Vercel domain)
- `CORS_ORIGIN_REGEX` (optional, e.g. `https://.*\\.vercel\\.app`)
- `STORAGE_BACKEND` (`s3` recommended)
- S3 credentials (`S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`)
- `OCR_ENABLED` (optional, defaults to `false`; set `true` to enable OCR jobs)

## OCR dependencies (Fly/Railway)

When `OCR_ENABLED=true`, ensure the deployed image installs OCR dependencies.
`requirements.txt` includes `requirements-ocr.txt`, which installs local shim
packages that depend on headless OpenCV wheels (including contrib) to avoid
`libGL.so.1` errors on Fly.

## Run (cloud-style)

```
uvicorn server:app --host 0.0.0.0 --port $PORT
```

For Railway/Fly, you can also use the included `Procfile`.

## Database migrations (Alembic)

Alembic is the source of truth for schema changes. Run commands from
`magic_backend/` and ensure `DATABASE_URL` is set before running any commands.

Create a new revision:

```
alembic revision -m "describe change"
```

Apply migrations locally:

```
alembic upgrade head
```

Check the current revision:

```
alembic current
```

Run migrations on Fly.io (pick one):

- One-off command:

  ```
  fly ssh console -C "cd /app && alembic upgrade head"
  ```

- Interactive console:

  ```
  fly ssh console
  cd /app
  alembic upgrade head
  ```

## Health Check

```
curl -sS https://your-backend.up.railway.app/health
```
