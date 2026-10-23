"""Verified opaque sessions and shared trusted-origin checks for private routes."""

import hashlib
import secrets

from fastapi import Depends, Request

from app.services.errors import ServiceError

SESSION_COOKIE = "__Host-pv_session"


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


def require_analyst(request: Request, session=Depends(require_session)):
    if session["role"] not in ("analyst", "administrator"):
        raise ServiceError(403, "insufficient_role", "An analyst or administrator role is required.")
    csrf = request.headers.get("X-CSRF-Token", "")
    if not request.app.state.origin_policy.allows(request.headers.get("Origin")) or not csrf or not secrets.compare_digest(
        hashlib.sha256(csrf.encode()).hexdigest(), session["csrf_hash"]
    ):
        raise ServiceError(403, "csrf_rejected", "A trusted Origin and valid CSRF token are required.")
    return session
