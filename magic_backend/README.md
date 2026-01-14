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

## Run (cloud-style)

```
uvicorn server:app --host 0.0.0.0 --port $PORT
```

For Railway/Fly, you can also use the included `Procfile`.

## Health Check

```
curl -sS https://your-backend.up.railway.app/health
```
