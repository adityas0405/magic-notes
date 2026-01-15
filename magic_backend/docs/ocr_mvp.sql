-- OCR MVP schema changes (run manually if Alembic is not used)

ALTER TABLE notes
    ADD COLUMN ocr_text TEXT DEFAULT '',
    ADD COLUMN ocr_engine VARCHAR DEFAULT '',
    ADD COLUMN ocr_confidence DOUBLE PRECISION,
    ADD COLUMN ocr_updated_at TIMESTAMP;

CREATE TABLE ai_jobs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    job_type VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE INDEX idx_ai_jobs_note_id ON ai_jobs (note_id);
CREATE INDEX idx_ai_jobs_user_id ON ai_jobs (user_id);
CREATE INDEX idx_ai_jobs_type_status ON ai_jobs (job_type, status);
