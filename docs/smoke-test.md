# API Smoke Test (One Command)

Run the following command from a terminal to smoke-test auth + uploads. It signs up, logs in, checks `/me`, creates a note, uploads strokes, uploads a file, and fetches the file URL.

```bash
API_BASE_URL="http://localhost:8080" \
EMAIL="smoke-$(date +%s)@example.com" \
PASSWORD="test-password" \
bash -c '
set -euo pipefail

printf "\n== Signup ==\n"
signup=$(curl -sS -X POST "$API_BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$signup" | sed "s/"$PASSWORD"/***"/g"

TOKEN=$(echo "$signup" | python - <<PY
import json,sys
print(json.load(sys.stdin)["access_token"])
PY
)

printf "\n== Login ==\n"
login=$(curl -sS -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$login" | sed "s/"$PASSWORD"/***"/g"

printf "\n== Me ==\n"
curl -sS "$API_BASE_URL/api/auth/me" -H "Authorization: Bearer $TOKEN"

printf "\n\n== Create Note ==\n"
create=$(curl -sS -X POST "$API_BASE_URL/api/notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Smoke Test Note\"}")

echo "$create"
NOTE_ID=$(echo "$create" | python - <<PY
import json,sys
print(json.load(sys.stdin)["id"])
PY
)

printf "\n== Upload Strokes ==\n"
curl -sS -X POST "$API_BASE_URL/api/notes/$NOTE_ID/strokes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"strokes\":[{\"points\":[{\"x\":0,\"y\":0,\"t\":0}]}],\"captured_at\":\"2024-01-01T00:00:00Z\"}"

printf "\n\n== Upload File ==\n"
printf "Hello" > /tmp/smoke.txt
upload=$(curl -sS -X POST "$API_BASE_URL/api/notes/$NOTE_ID/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/smoke.txt;type=text/plain")

echo "$upload"
FILE_URL=$(echo "$upload" | python - <<PY
import json,sys
print(json.load(sys.stdin)["file_url"])
PY
)

printf "\n== Fetch File ==\n"
curl -sS -I "$API_BASE_URL$FILE_URL" -H "Authorization: Bearer $TOKEN"
'
```

## Expected Output (Examples)

- Signup/Login responses include `access_token`, `token_type`, and `user` fields.
- `/api/auth/me` returns `{ "user": { "email": "..." } }`.
- Create note returns `{ "id": <number>, "title": "Smoke Test Note" ... }`.
- Upload strokes returns `{ "status": "ok", "note_id": <number> }`.
- Upload file returns `{ "status": "ok", "file_url": "/api/notes/<id>/file" }`.
- Fetch file returns `200 OK` (or `302` if using S3 presigned URLs).

## Common Failure Messages

- `401 Not authenticated` or `Invalid token`: missing/expired token or incorrect Authorization header.
- `404 Notebook not found`: provided notebook ID does not belong to the user.
- `422 Unprocessable Entity`: JSON payload missing required fields.
- `429 Too many login attempts`: login throttle triggered; wait a minute and retry.
