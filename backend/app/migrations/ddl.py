"""Dialect-specific column types shared by the raw-SQL revisions."""


def column_types(bind):
    postgres = bind.dialect.name == "postgresql"
    return {
        "id": "UUID" if postgres else "TEXT",
        "json": "JSONB" if postgres else "TEXT",
        "timestamp": "TIMESTAMPTZ" if postgres else "TEXT",
        "binary": "BYTEA" if postgres else "BLOB",
    }
