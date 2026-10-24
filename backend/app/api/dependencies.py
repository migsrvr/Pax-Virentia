"""Verified opaque sessions and shared trusted-origin checks for private routes."""

import hashlib
import secrets

from fastapi import Depends, Request

from app.services.errors import ServiceError

SESSION_COOKIE = "__Host-pv_session"
ANALYST_ROLES = ("analyst", "administrator")
REVIEWER_ROLES = ("reviewer", "administrator")


def get_repository(request: Request):
    return request.app.state.repository


def get_service(request: Request):
    return request.app.state.simulations


def require_trusted_origin(request: Request):
    if not request.app.state.origin_policy.allows(request.headers.get("Origin")):
        raise ServiceError(403, "origin_rejected", "A trusted Origin is required.")


def require_session(request: Request, repository=Depends(get_repository)):
    token = request.cookies.get(SESSION_COOKIE)
    session = repository.authenticate(token) if token else None
    if session is None:
        raise ServiceError(401, "authentication_required", "A valid session is required.")
    return session


def require_csrf(request: Request, session):
    csrf = request.headers.get("X-CSRF-Token", "")
    if not request.app.state.origin_policy.allows(request.headers.get("Origin")) or not csrf or not secrets.compare_digest(
        hashlib.sha256(csrf.encode()).hexdigest(), session["csrf_hash"]
    ):
        raise ServiceError(403, "csrf_rejected", "A trusted Origin and valid CSRF token are required.")
    return session


def require_role(*roles, label):
    """A state-changing dependency: role membership, trusted Origin and CSRF."""
    def dependency(request: Request, session=Depends(require_session)):
        if session["role"] not in roles:
            raise ServiceError(403, "insufficient_role", f"{label} role is required.")
        return require_csrf(request, session)
    return dependency


def require_session_write(request: Request, session=Depends(require_session)):
    """Any signed-in role, for writes that change only the caller's own session."""
    return require_csrf(request, session)


require_analyst = require_role(*ANALYST_ROLES, label="An analyst or administrator")
require_reviewer = require_role(*REVIEWER_ROLES, label="A reviewer or administrator")
