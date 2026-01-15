"""Add inbox and OCR fields.

Revision ID: 0002_add_inbox_and_ocr_fields
Revises: 0001_initial_schema
Create Date: 2025-02-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0002_add_inbox_and_ocr_fields"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def _column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [column["name"] for column in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade() -> None:
    if not _column_exists("notebooks", "is_inbox"):
        op.add_column(
            "notebooks",
            sa.Column("is_inbox", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if not _column_exists("notebooks", "inbox_type"):
        op.add_column("notebooks", sa.Column("inbox_type", sa.String(), nullable=True))

    if not _column_exists("notes", "ocr_text"):
        op.add_column("notes", sa.Column("ocr_text", sa.Text(), nullable=True))
    if not _column_exists("notes", "ocr_engine"):
        op.add_column("notes", sa.Column("ocr_engine", sa.String(), nullable=True))
    if not _column_exists("notes", "ocr_confidence"):
        op.add_column("notes", sa.Column("ocr_confidence", sa.Float(), nullable=True))
    if not _column_exists("notes", "ocr_updated_at"):
        op.add_column("notes", sa.Column("ocr_updated_at", sa.DateTime(), nullable=True))


def _drop_column_if_exists(table_name: str, column_name: str) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [column["name"] for column in inspector.get_columns(table_name)]
    if column_name not in columns:
        return
    with op.batch_alter_table(table_name) as batch_op:
        batch_op.drop_column(column_name)


def downgrade() -> None:
    _drop_column_if_exists("notes", "ocr_updated_at")
    _drop_column_if_exists("notes", "ocr_confidence")
    _drop_column_if_exists("notes", "ocr_engine")
    _drop_column_if_exists("notes", "ocr_text")
    _drop_column_if_exists("notebooks", "inbox_type")
    _drop_column_if_exists("notebooks", "is_inbox")
