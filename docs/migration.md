# Auth Migration Notes (Dev/Operators)

The API now expects `users`, `subjects`, and `user_id` ownership columns. Existing production databases that predate auth will **not** have these columns populated. The API is coded to tolerate `NULL` user IDs in the short term, but those rows will not be visible to authenticated users until backfilled.

## Startup Guard

On startup, the API logs warnings if tables are missing auth columns. This is a safety guard so you can deploy without immediate crashes, but you must still migrate/backfill before relying on the new auth flow.

## Recommended Migration Plan (Safe)

1. **Add the new tables/columns** (via SQL migration tooling or manual SQL):

```sql
-- Example for Postgres
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
```

2. **Create a legacy user** to own existing data:

```sql
INSERT INTO users (email, password_hash)
VALUES ('legacy@example.com', 'REPLACE_WITH_BCRYPT_HASH')
ON CONFLICT (email) DO NOTHING;
```

3. **Backfill user ownership** for existing rows (example uses the legacy user):

```sql
UPDATE notebooks SET user_id = (SELECT id FROM users WHERE email = 'legacy@example.com')
WHERE user_id IS NULL;

UPDATE notes SET user_id = (SELECT id FROM users WHERE email = 'legacy@example.com')
WHERE user_id IS NULL;
```

4. **Create default subject + assign notebooks** for the legacy user:

```sql
INSERT INTO subjects (name, user_id)
SELECT 'Unsorted', id FROM users WHERE email = 'legacy@example.com'
ON CONFLICT DO NOTHING;

UPDATE notebooks
SET subject_id = (SELECT id FROM subjects WHERE user_id = (SELECT id FROM users WHERE email = 'legacy@example.com') LIMIT 1)
WHERE subject_id IS NULL;
```

5. **Later tightening**: once all rows have `user_id`, you can add NOT NULL constraints safely:

```sql
ALTER TABLE notebooks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE subjects ALTER COLUMN user_id SET NOT NULL;
```

> Note: For Fly Postgres or other managed DBs, apply these via your migration tooling rather than directly on production.

## Device Inbox Columns

New inbox routing adds notebook metadata so the backend can own device routing. Add the columns below before deploying inbox endpoints:

```sql
ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS is_inbox BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS inbox_type TEXT;
```
