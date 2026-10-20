"""Credential verification and session issuance for private workspace access."""

from passlib.context import CryptContext

from app.services.errors import ServiceError

_password_context = CryptContext(schemes=["argon2"], deprecated="auto")


def hash_password(password):
    return _password_context.hash(password)


def verify_password(password, password_hash):
    try:
        return _password_context.verify(password, password_hash)
    except (ValueError, TypeError):
        return False


def normalize_email(email):
    return email.strip().lower()


class AuthService:
    def __init__(self, repository, lifetime_hours=24, remember_hours=720):
        self.repository = repository
        self.lifetime_hours = lifetime_hours
        self.remember_hours = remember_hours

    def login(self, email, password, remember=False):
        user = self.repository.find_user_by_email(normalize_email(email))
        if (user is None or not user["active"] or not user["password_hash"]
                or not verify_password(password, user["password_hash"])):
            raise ServiceError(401, "invalid_credentials", "Email or password is incorrect.")
        hours = self.remember_hours if remember else self.lifetime_hours
        token, csrf = self.repository.create_session(user["id"], lifetime_hours=hours)
        return {"user": self.public_user(user), "session_token": token, "csrf_token": csrf,
                "expires_in_hours": hours}

    def logout(self, token):
        if token:
            self.repository.revoke_session(token)

    @staticmethod
    def public_user(session):
        return {"id": session["user_id"] if "user_id" in session else session["id"],
                "email": session.get("email"), "display_name": session.get("display_name"),
                "role": session["role"]}
