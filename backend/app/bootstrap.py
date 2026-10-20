"""Local bootstrap: create the store schema and provision a first account.

Usage (from the backend directory):
    python -m app.bootstrap

Environment overrides: SEED_USER_EMAIL, SEED_USER_PASSWORD, SEED_USER_NAME, SEED_USER_ROLE.
"""

import os
from uuid import uuid4

from app.config import settings
from app.repositories.simulation import SimulationRepository
from app.services.auth import hash_password


def main():
    repository = SimulationRepository(settings.DATABASE_URL)
    try:
        repository.create_schema()
        seed_users = [
            (
                getattr(settings, "SEED_USER_EMAIL", "rivera.dev.miggy@gmail.com").strip().lower(),
                getattr(settings, "SEED_USER_PASSWORD", "pax-virentia-dev"),
                getattr(settings, "SEED_USER_NAME", "Miggy"),
                getattr(settings, "SEED_USER_ROLE", "analyst"),
            ),
            (
                "ana.santos@example.com",
                "pax-virentia-dev",
                "Ana Santos",
                "analyst",
            ),
        ]
        for email, password, name, role in seed_users:
            existing = repository.find_user_by_email(email)
            user_id = existing["id"] if existing else str(uuid4())
            repository.create_user(user_id, role, email=email, password_hash=hash_password(password), display_name=name)
            print(f"Provisioned account: {email} / {password} (role: {role})")
    finally:
        repository.close()
    print("Store schema ready.")


if __name__ == "__main__":
    main()
