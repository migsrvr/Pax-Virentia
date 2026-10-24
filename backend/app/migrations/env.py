"""Alembic environment for raw-SQL revisions shared by PostgreSQL and SQLite.

Revisions run on a connection supplied by `app.repositories.migrations.upgrade`
or, for the Alembic CLI, on an engine built from the configured DATABASE_URL.
"""

from alembic import context

config = context.config


def run(connection):
    context.configure(connection=connection, target_metadata=None, transaction_per_migration=True)
    with context.begin_transaction():
        context.run_migrations()


connection = config.attributes.get("connection")
if connection is not None:
    run(connection)
else:
    from app.config import settings
    from app.repositories.simulation import SimulationRepository

    repository = SimulationRepository(config.get_main_option("sqlalchemy.url") or settings.DATABASE_URL)
    try:
        with repository.migration_connection() as supplied:
            run(supplied)
    finally:
        repository.close()
