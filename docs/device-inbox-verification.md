# Device Inbox Verification Notes

This document captures manual verification guidance for the Device Inbox backend behavior. No automated tests were added.

## Inbox creation logic

1. Authenticate as a user to obtain a JWT.
2. Call the inbox lookup endpoint (example below).
3. Confirm the backend returns a notebook with:
   - `name`: `Tablet Inbox`
   - `is_inbox`: `true`
   - `inbox_type`: `tablet`
4. Call the same endpoint again and verify the returned `id` matches the previous response (idempotent).

Potential edge case:
- If a user manually renames the `Inbox` subject or the `Tablet Inbox` notebook, the next lookup will create a new inbox subject/notebook pair because the lookup is name-based.

## Inbox lookup endpoint

Example request:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/notebooks/inbox?type=tablet"
```

Expected behavior:
- Works for authenticated users only.
- Creates the inbox subject/notebook if missing.
- Always returns the same notebook for the same user (same `id`).
- Another user cannot access this inbox because all lookups are scoped by `user_id`.

## Device note creation endpoint

Example request:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Optional title","device_type":"tablet"}' \
  "http://localhost:8000/api/device/notes"
```

Expected behavior:
- `notebook_id` is not required.
- Note is created in the resolved inbox notebook.
- Returned `note_id` exists and can be fetched via `GET /api/notes/{note_id}`.
- The note appears under the Inbox section in the web UI (by virtue of the notebook association).

## Existing endpoints unaffected

- `POST /api/notes` continues to accept a `notebook_id` or fall back to the Unsorted notebook.
- Stroke uploads (`POST /api/notes/{note_id}/strokes`) continue to work with the returned `note_id`.
