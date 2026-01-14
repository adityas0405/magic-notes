# Authentication & User Ownership

This repo uses JWT-based authentication for the backend (`magic_backend`) and the Atlas web UI (`atlas_frontend`). All data (subjects, notebooks, notes) is scoped to the authenticated user.

## Backend Authentication

### Endpoints

- `POST /api/auth/signup` `{ email, password }`
- `POST /api/auth/login` `{ email, password }`
- `GET /api/auth/me` (requires Bearer token)

Successful login/signup returns:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "you@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Required Environment Variables

Set these in your deployment environment (Fly/Railway/etc):

- `JWT_SECRET` (required) – secret used to sign JWTs
- `JWT_EXPIRES_SECONDS` (optional) – token TTL in seconds (default: 604800 / 7 days)
- `DATABASE_URL` (required)

### Authorization Header

All protected endpoints require:

```
Authorization: Bearer <access_token>
```

## Atlas Frontend Authentication

The Atlas web app stores the JWT in `localStorage` under `atlas_token` and loads the current user via `GET /api/auth/me` on startup. Unauthenticated users are redirected to `/login`.

## Flutter Authentication (Minimal Support)

The Flutter client sends a Bearer token in the `Authorization` header. After logging in, call `setAuthToken` on the API service to store the token in memory.

Example (pseudo-code):

```dart
final response = await http.post(
  Uri.parse('$baseUrl/api/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'email': email, 'password': password}),
);
final decoded = jsonDecode(response.body) as Map<String, dynamic>;
apiService.setAuthToken(decoded['access_token'] as String);
```

All note upload endpoints assume an authenticated user and will return `401` if the token is missing or invalid.

## Migration Notes

If you have existing data created before auth, follow the backfill steps in `docs/migration.md` to add `user_id` ownership and avoid empty libraries after rollout.
