"""Session sign-in, sign-out and session inspection for the private workspace."""

from fastapi import APIRouter, Depends, Request, Response

from app.api.dependencies import SESSION_COOKIE, get_repository, require_session, require_trusted_origin
from app.api.schemas import LoginRequest
from app.config import settings
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_auth_service(repository=Depends(get_repository)):
    return AuthService(repository, settings.SESSION_LIFETIME_HOURS, settings.SESSION_REMEMBER_HOURS)


@router.post("/login")
def login(body: LoginRequest, request: Request, response: Response, service=Depends(get_auth_service)):
    require_trusted_origin(request)
    result = service.login(body.email, body.password, body.remember)
    response.set_cookie(SESSION_COOKIE, result["session_token"], max_age=result["expires_in_hours"] * 3600,
                        httponly=True, secure=True, samesite="lax", path="/")
    return {"user": result["user"], "csrf_token": result["csrf_token"],
            "expires_in_hours": result["expires_in_hours"]}


@router.post("/logout", dependencies=[Depends(require_session)])
def logout(request: Request, response: Response, service=Depends(get_auth_service)):
    service.logout(request.cookies.get(SESSION_COOKIE))
    response.delete_cookie(SESSION_COOKIE, path="/", secure=True, httponly=True, samesite="lax")
    return {"status": "signed_out"}


@router.get("/session")
def session(actor=Depends(require_session)):
    return {"user": AuthService.public_user(actor)}
