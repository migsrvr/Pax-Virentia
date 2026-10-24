"""Baseline schema, matching the pre-Alembic create_schema() DDL.

IF NOT EXISTS lets this revision adopt databases created before migrations
existed (including production) without a separate stamping step.

Revision ID: 0001
Revises:
Create Date: 2026-10-24
"""

from alembic import op

from app.migrations.ddl import column_types

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    t = column_types(op.get_bind())
    statements = [
        f"CREATE TABLE IF NOT EXISTS users (id {t['id']} PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('analyst','reviewer','administrator')), email TEXT, password_hash TEXT, display_name TEXT, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)))",
        f"CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id {t['id']} NOT NULL REFERENCES users(id), csrf_hash TEXT NOT NULL, expires_at {t['timestamp']} NOT NULL, revoked INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN (0,1)))",
        f"CREATE TABLE IF NOT EXISTS scenarios (id {t['id']} PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('baseline','intervention')), created_by {t['id']} NOT NULL, created_at {t['timestamp']} NOT NULL)",
        f"CREATE TABLE IF NOT EXISTS scenario_revisions (id {t['id']} PRIMARY KEY, scenario_id {t['id']} NOT NULL REFERENCES scenarios(id), revision_no INTEGER NOT NULL CHECK(revision_no>0), parameters {t['json']} NOT NULL, created_by {t['id']} NOT NULL, created_at {t['timestamp']} NOT NULL, UNIQUE(scenario_id,revision_no))",
        f"CREATE TABLE IF NOT EXISTS simulation_runs (id {t['id']} PRIMARY KEY, scenario_revision_id {t['id']} NOT NULL REFERENCES scenario_revisions(id), frozen_inputs {t['json']} NOT NULL, snapshot_hash TEXT NOT NULL, code_version TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('queued','running','succeeded','failed','cancelled')), submitted_by {t['id']} NOT NULL, created_at {t['timestamp']} NOT NULL, started_at {t['timestamp']}, ended_at {t['timestamp']}, error_code TEXT, error_message TEXT)",
        f"CREATE TABLE IF NOT EXISTS run_results (run_id {t['id']} PRIMARY KEY REFERENCES simulation_runs(id), payload {t['json']} NOT NULL)",
        f"CREATE TABLE IF NOT EXISTS jobs (id {t['id']} PRIMARY KEY, run_id {t['id']} NOT NULL UNIQUE REFERENCES simulation_runs(id), status TEXT NOT NULL CHECK(status IN ('queued','running','succeeded','failed','cancelled')), attempt_no INTEGER NOT NULL DEFAULT 0 CHECK(attempt_no>=0), available_at {t['timestamp']} NOT NULL, lease_token TEXT, lease_until {t['timestamp']}, cancel_requested INTEGER NOT NULL DEFAULT 0 CHECK(cancel_requested IN (0,1)), created_at {t['timestamp']} NOT NULL)",
        f"CREATE TABLE IF NOT EXISTS idempotency_keys (user_id {t['id']} NOT NULL, endpoint TEXT NOT NULL, key TEXT NOT NULL, request_hash TEXT NOT NULL, run_id {t['id']} NOT NULL REFERENCES simulation_runs(id), PRIMARY KEY(user_id,endpoint,key))",
        f"CREATE TABLE IF NOT EXISTS dataset_versions (id {t['id']} PRIMARY KEY, source_ref TEXT NOT NULL, evidence_status TEXT NOT NULL, content_hash TEXT NOT NULL, original_csv {t['binary']} NOT NULL, quality_report {t['json']} NOT NULL, schema_version TEXT NOT NULL, created_by {t['id']} NOT NULL, created_at {t['timestamp']} NOT NULL)",
        f"CREATE TABLE IF NOT EXISTS publications (id {t['id']} PRIMARY KEY, run_id {t['id']} NOT NULL REFERENCES simulation_runs(id), slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL, summary TEXT, snapshot_data {t['json']} NOT NULL, published_by {t['id']} NOT NULL REFERENCES users(id), published_at {t['timestamp']} NOT NULL, view_count INTEGER NOT NULL DEFAULT 0)",
        f"CREATE TABLE IF NOT EXISTS ai_explanations (id {t['id']} PRIMARY KEY, run_id {t['id']} NOT NULL REFERENCES simulation_runs(id), focus TEXT NOT NULL, narrative TEXT NOT NULL, key_drivers {t['json']} NOT NULL, grounded_evidence {t['json']} NOT NULL, generated_at {t['timestamp']} NOT NULL, UNIQUE(run_id, focus))",
        "CREATE INDEX IF NOT EXISTS jobs_ready_idx ON jobs(status, available_at)",
        "CREATE INDEX IF NOT EXISTS runs_revision_idx ON simulation_runs(scenario_revision_id, created_at)",
        "CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email)",
        "CREATE INDEX IF NOT EXISTS publications_slug_idx ON publications(slug)",
        "CREATE INDEX IF NOT EXISTS ai_explanations_run_idx ON ai_explanations(run_id)",
    ]
    for statement in statements:
        op.execute(statement)


def downgrade():
    raise NotImplementedError("Forward-only migration.")
