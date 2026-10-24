"""Reviewed publication workflow and audit trail.

Publications gain a checked status, submission/review/withdrawal attribution and
an index on (status, published_at). The table is rebuilt on both dialects so
SQLite can relax published_at to nullable. Existing rows were published
without review, so they are backfilled as pending_review: they leave the public
site until a reviewer approves them.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-24
"""

from alembic import op

from app.migrations.ddl import column_types

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    t = column_types(op.get_bind())
    op.execute(
        f"CREATE TABLE publications_v2 (id {t['id']} PRIMARY KEY, run_id {t['id']} NOT NULL REFERENCES simulation_runs(id), "
        "slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, summary TEXT, "
        f"snapshot_data {t['json']} NOT NULL, "
        "status TEXT NOT NULL CHECK(status IN ('pending_review','published','rejected','withdrawn')), "
        f"submitted_by {t['id']} NOT NULL REFERENCES users(id), submitted_at {t['timestamp']} NOT NULL, "
        f"reviewed_by {t['id']} REFERENCES users(id), reviewed_at {t['timestamp']}, decision_reason TEXT, "
        f"published_at {t['timestamp']}, "
        f"withdrawn_by {t['id']} REFERENCES users(id), withdrawn_at {t['timestamp']}, withdrawal_reason TEXT, "
        "view_count INTEGER NOT NULL DEFAULT 0)"
    )
    op.execute(
        "INSERT INTO publications_v2(id, run_id, slug, title, summary, snapshot_data, status, submitted_by, submitted_at, view_count) "
        "SELECT id, run_id, slug, title, summary, snapshot_data, 'pending_review', published_by, published_at, view_count FROM publications"
    )
    op.execute("DROP TABLE publications")
    op.execute("ALTER TABLE publications_v2 RENAME TO publications")
    op.execute("CREATE INDEX IF NOT EXISTS publications_status_idx ON publications(status, published_at)")
    op.execute("CREATE INDEX IF NOT EXISTS publications_run_idx ON publications(run_id)")
    op.execute(
        f"CREATE TABLE IF NOT EXISTS audit_events (id {t['id']} PRIMARY KEY, actor_id {t['id']} NOT NULL REFERENCES users(id), "
        f"action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, created_at {t['timestamp']} NOT NULL, "
        f"change_summary {t['json']} NOT NULL)"
    )
    op.execute("CREATE INDEX IF NOT EXISTS audit_events_entity_idx ON audit_events(entity_type, entity_id, created_at)")


def downgrade():
    raise NotImplementedError("Forward-only migration.")
