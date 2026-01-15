# Documentation

## Production Alembic baseline flow (Fly Postgres)

Production databases already contain the core tables, so **do not** run a
table-creating migration. Instead:

1. Set `DATABASE_URL` to the Fly Postgres connection string.
2. From `magic_backend/`, stamp the baseline revision to align Alembic with the
   existing schema:

   ```bash
   alembic stamp 0001_initial_schema
   ```

3. Apply the delta migration that adds the new columns:

   ```bash
   alembic upgrade head
   ```

This flow uses a no-op baseline and a safe, additive migration (no drops or
table creation) to avoid `DuplicateTable` errors on existing databases.
