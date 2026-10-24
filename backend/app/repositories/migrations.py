"""Programmatic Alembic upgrades for bootstrap, tests and the Alembic CLI."""

from pathlib import Path

MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "migrations"


def alembic_config(connection=None):
    from alembic.config import Config

    config = Config()
    config.set_main_option("script_location", str(MIGRATIONS_DIR))
    if connection is not None:
        config.attributes["connection"] = connection
    return config


def upgrade(repository, revision="head"):
    """Apply forward-only revisions on the repository's own database."""
    from alembic import command

    with repository.migration_connection() as connection:
        command.upgrade(alembic_config(connection), revision)


def current_revision(repository):
    from alembic.runtime.migration import MigrationContext

    with repository.migration_connection() as connection:
        return MigrationContext.configure(connection).get_current_revision()
