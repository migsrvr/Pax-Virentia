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
    email = os.environ.get("SEED_USER_EMAIL", "ana.santos@example.com").strip().lower()
    password = os.environ.get("SEED_USER_PASSWORD", "pax-virentia-dev")
    name = os.environ.get("SEED_USER_NAME", "Ana Santos")
    role = os.environ.get("SEED_USER_ROLE", "analyst")
    repository = SimulationRepository(settings.DATABASE_URL)
    try:
        repository.create_schema()
        existing = repository.find_user_by_email(email)
        user_id = existing["id"] if existing else str(uuid4())
        repository.create_user(user_id, role, email=email, password_hash=hash_password(password), display_name=name)
    finally:
        repository.close()
    print("Store schema ready.")
    print(f"Sign in with: {email} / {password} (role: {role})")
    print("Override with SEED_USER_EMAIL, SEED_USER_PASSWORD, SEED_USER_NAME, SEED_USER_ROLE.")


if __name__ == "__main__":
    main()
