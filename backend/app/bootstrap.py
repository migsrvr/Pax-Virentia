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
        seed_email = getattr(settings, "SEED_USER_EMAIL", "rivera.dev.miggy@gmail.com").strip().lower()
        seed_password = getattr(settings, "SEED_USER_PASSWORD", "pax-virentia-dev")
        seed_name = getattr(settings, "SEED_USER_NAME", "Miggy")
        seed_role = getattr(settings, "SEED_USER_ROLE", "analyst")

        existing = repository.find_user_by_email(seed_email)
        if existing is None:
            user_id = str(uuid4())
            repository.create_user(user_id, seed_role, email=seed_email, password_hash=hash_password(seed_password), display_name=seed_name)
            print(f"Provisioned initial account: {seed_email} (role: {seed_role})")
        else:
            print(f"Account already present: {seed_email} (role: {existing['role']})")
    finally:
        repository.close()
    print("Store schema ready.")


if __name__ == "__main__":
    main()
