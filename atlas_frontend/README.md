# Atlas Frontend

Minimal Atlas frontend built with Vite + React + TypeScript.

## Requirements
- Node.js 20+

## Setup

```bash
npm install
npm run dev
```

## Environment

Set the API base URL via `VITE_API_URL` (defaults to `http://localhost:8080`). See `.env.example` for local usage.

```bash
VITE_API_URL=https://your-backend.example.com
```

## Routes

- `/` Marketing homepage
- `/login` Sign in
- `/signup` Sign up
- `/app/library` Library dashboard
- `/app/subjects/:subjectId` Subject detail
- `/app/subjects/:subjectId/notebooks/:notebookId` Notebook detail
- `/app/settings` Settings

Unauthenticated users visiting `/app/*` are redirected to `/login`.
