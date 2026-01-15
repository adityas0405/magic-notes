"""Baseline schema (no-op).

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2025-02-14 00:00:00.000000

"""
revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Baseline migration for existing production schema."""
    pass


def downgrade() -> None:
    """No-op downgrade for baseline."""
    pass
