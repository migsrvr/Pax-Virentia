"""Bootstrap: apply database migrations and provision accounts.

Usage (from the backend directory):
    python -m app.bootstrap
        Apply every Alembic revision, then provision the seed account if absent.
        Environment overrides: SEED_USER_EMAIL, SEED_USER_PASSWORD, SEED_USER_NAME, SEED_USER_ROLE.

    python -m app.bootstrap create-user --email reviewer@example.com --role reviewer [--name "R. Reviewer"]
        Provision (or re-role) an account. The password is read from --password, the
        PV_NEW_USER_PASSWORD environment variable, or an interactive prompt.
        Roles: analyst, reviewer, administrator. There is no public registration route.
"""

import argparse
import getpass
import os
import sys
from uuid import uuid4

from app.config import settings
from app.repositories.simulation import SimulationRepository
from app.services.auth import hash_password, normalize_email

ROLES = ("analyst", "reviewer", "administrator")


def provision(repository, email, password, name, role):
    email = normalize_email(email)
    existing = repository.find_user_by_email(email)
    user_id = existing["id"] if existing else str(uuid4())
    repository.create_user(user_id, role, email=email, password_hash=hash_password(password) if password else None,
                           display_name=name)
    return existing is None, user_id


def seed(repository):
    seed_email = getattr(settings, "SEED_USER_EMAIL", "rivera.dev.miggy@gmail.com").strip().lower()
    seed_password = getattr(settings, "SEED_USER_PASSWORD", "pax-virentia-dev")
    seed_name = getattr(settings, "SEED_USER_NAME", "Miggy")
    seed_role = getattr(settings, "SEED_USER_ROLE", "analyst")
    existing = repository.find_user_by_email(seed_email)
    if existing is None:
        provision(repository, seed_email, seed_password, seed_name, seed_role)
        print(f"Provisioned initial account: {seed_email} (role: {seed_role})")
    else:
        print(f"Account already present: {seed_email} (role: {existing['role']})")


def create_user_command(repository, argv):
    parser = argparse.ArgumentParser(prog="python -m app.bootstrap create-user")
    parser.add_argument("--email", required=True)
    parser.add_argument("--role", required=True, choices=ROLES)
    parser.add_argument("--name", default=None)
    parser.add_argument("--password", default=None)
    args = parser.parse_args(argv)
    password = args.password or os.environ.get("PV_NEW_USER_PASSWORD")
    existing = repository.find_user_by_email(normalize_email(args.email))
    if not password and existing is None:
        password = getpass.getpass("Password for the new account: ")
    if existing is None and len(password or "") < 8:
        raise SystemExit("Passwords must have at least 8 characters.")
    created, _ = provision(repository, args.email, password, args.name, args.role)
    print(f"{'Provisioned' if created else 'Updated'} account: {normalize_email(args.email)} (role: {args.role})")


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    repository = SimulationRepository(settings.DATABASE_URL)
    try:
        repository.create_schema()
        print("Store schema ready (migrations applied).")
        if argv and argv[0] == "create-user":
            create_user_command(repository, argv[1:])
        elif argv:
            raise SystemExit(f"Unknown command: {argv[0]}")
        else:
            seed(repository)
    finally:
        repository.close()


if __name__ == "__main__":
    main()
