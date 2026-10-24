"""Session-bound CSRF tokens.

The token is an HMAC of the opaque session token, so the server can re-issue the
same value from the session cookie (after a browser restart or in a new tab)
without storing it. Only its SHA-256 hash is persisted with the session.
"""

import hashlib
import hmac

from app.config import settings

CSRF_CONTEXT = b"pax-virentia-csrf-v1:"


def derive_csrf_token(session_token, secret=None):
    key = (secret or settings.SECRET_KEY).encode()
    return hmac.new(key, CSRF_CONTEXT + session_token.encode(), hashlib.sha256).hexdigest()
