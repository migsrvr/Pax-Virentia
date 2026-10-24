"""Per-user review marks on comparison insights.

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-24
"""

from alembic import op

from app.migrations.ddl import column_types

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    t = column_types(op.get_bind())
    op.execute(
        f"CREATE TABLE IF NOT EXISTS insight_reviews (user_id {t['id']} NOT NULL REFERENCES users(id), "
        "insight_key TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('reviewed','dismissed')), "
        f"note TEXT, updated_at {t['timestamp']} NOT NULL, PRIMARY KEY(user_id, insight_key))"
    )


def downgrade():
    raise NotImplementedError("Forward-only migration.")
