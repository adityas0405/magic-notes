"""Initial schema.

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2025-02-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_id", "users", ["id"], unique=False)

    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    op.create_index("ix_subjects_id", "subjects", ["id"], unique=False)

    op.create_table(
        "notebooks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("color", sa.String(), nullable=True),
        sa.Column("icon", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "subject_id",
            sa.Integer(),
            sa.ForeignKey("subjects.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    op.create_index("ix_notebooks_id", "notebooks", ["id"], unique=False)

    op.create_table(
        "notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("device", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column(
            "notebook_id",
            sa.Integer(),
            sa.ForeignKey("notebooks.id", ondelete="CASCADE"),
            nullable=False,
        ),
    )
    op.create_index("ix_notes_id", "notes", ["id"], unique=False)

    op.create_table(
        "note_strokes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "note_id",
            sa.Integer(),
            sa.ForeignKey("notes.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_note_strokes_id", "note_strokes", ["id"], unique=False)

    op.create_table(
        "note_files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "note_id",
            sa.Integer(),
            sa.ForeignKey("notes.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("stored_filename", sa.String(), nullable=False),
        sa.Column("original_filename", sa.String(), nullable=False),
        sa.Column("content_type", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_note_files_id", "note_files", ["id"], unique=False)

    op.create_table(
        "flashcards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "note_id",
            sa.Integer(),
            sa.ForeignKey("notes.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_flashcards_id", "flashcards", ["id"], unique=False)

    op.create_table(
        "ai_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "note_id",
            sa.Integer(),
            sa.ForeignKey("notes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("job_type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("finished_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_ai_jobs_id", "ai_jobs", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_ai_jobs_id", table_name="ai_jobs")
    op.drop_table("ai_jobs")

    op.drop_index("ix_flashcards_id", table_name="flashcards")
    op.drop_table("flashcards")

    op.drop_index("ix_note_files_id", table_name="note_files")
    op.drop_table("note_files")

    op.drop_index("ix_note_strokes_id", table_name="note_strokes")
    op.drop_table("note_strokes")

    op.drop_index("ix_notes_id", table_name="notes")
    op.drop_table("notes")

    op.drop_index("ix_notebooks_id", table_name="notebooks")
    op.drop_table("notebooks")

    op.drop_index("ix_subjects_id", table_name="subjects")
    op.drop_table("subjects")

    op.drop_index("ix_users_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
