"""Report export requests.

Only the request (type, runs, sections, formats) and the immutable input hashes
are stored; PDF/CSV files are regenerated from stored run results on download.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-24
"""

from alembic import op

from app.migrations.ddl import column_types

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    t = column_types(op.get_bind())
    op.execute(
        f"CREATE TABLE IF NOT EXISTS reports (id {t['id']} PRIMARY KEY, "
        "report_type TEXT NOT NULL CHECK(report_type IN ('technical','data_export')), "
        f"title TEXT NOT NULL, params {t['json']} NOT NULL, run_ids {t['json']} NOT NULL, "
        f"input_hashes {t['json']} NOT NULL, created_by {t['id']} NOT NULL REFERENCES users(id), "
        f"created_at {t['timestamp']} NOT NULL)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS reports_created_idx ON reports(created_at)")


def downgrade():
    raise NotImplementedError("Forward-only migration.")
