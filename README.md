# Magic Notes Cloud MVP

Online-only MVP for handwriting capture on Flutter, API-only FastAPI backend, and the Atlas web UI.

## Architecture

```
Flutter (Samsung Tab S7)
  → HTTPS REST
FastAPI Backend (Railway/Fly.io)
  → PostgreSQL + Object Storage
Web UI (Atlas on Vercel)
  → HTTPS REST
```

## Required APIs

**Upload (Flutter)**
- `POST /api/notes`
- `POST /api/notes/{id}/strokes`
- `POST /api/notes/{id}/upload`

**Read (Web UI)**
- `GET /api/library`
- `GET /api/notes/{id}`
- `GET /api/notes/{id}/strokes`
- `GET /api/notes/{id}/file`

**AI (stub)**
- `POST /api/notes/{id}/summarize`
- `POST /api/notes/{id}/flashcards`

## Folder Structure

```
magic-notes/
  anything/               # Legacy/unused Anything UI (do not deploy)
    apps/web/             # Legacy web UI
  atlas_frontend/         # Atlas web UI (React + Vite, deploy this)
  magic_backend/          # FastAPI API-only backend
  magic_notes/            # Flutter capture client
```

## Atlas Frontend

The active web UI lives in `atlas_frontend`. Set `VITE_API_URL` (see `atlas_frontend/.env.example`) and run:

```
cd atlas_frontend
npm install
npm run dev
```

## Backend + Flutter

- Backend server lives in `magic_backend` (see `magic_backend/README.md`).
- Flutter capture client lives in `magic_notes`.

## End-to-End Flow

1. Flutter uploads notes/strokes/files → FastAPI backend.
2. Backend stores metadata in PostgreSQL and files in object storage.
3. Atlas web UI reads library and notes from the backend and displays them.
