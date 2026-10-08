"""FastAPI entrypoint; the numerical worker runs as a separate process."""

from contextlib import asynccontextmanager
import logging
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.api.v1.router import api_router
from app.config import settings
from app.repositories.simulation import SimulationRepository
from app.services.errors import ServiceError
from app.services.simulations import SimulationService


logger = logging.getLogger(__name__)


def create_app(repository=None, code_version=None, allowed_origins=None):
    @asynccontextmanager
    async def lifespan(application):
        store = repository if repository is not None else SimulationRepository(settings.DATABASE_URL)
        application.state.repository = store
        application.state.simulations = SimulationService(
            store, code_version=code_version or settings.CODE_VERSION, api_prefix=settings.API_V1_STR)
        try:
            yield
        finally:
            if repository is None:
                store.close()

    application = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION,
                          openapi_url=f"{settings.API_V1_STR}/openapi.json",
                          docs_url=f"{settings.API_V1_STR}/docs", lifespan=lifespan)
    origins = settings.ALLOWED_ORIGINS if allowed_origins is None else allowed_origins
    application.state.allowed_origins = origins
    application.add_middleware(CORSMiddleware, allow_origins=origins,
                               allow_credentials=True, allow_methods=["GET", "POST"],
                               allow_headers=["Content-Type", "Idempotency-Key", "X-CSRF-Token"])

    @application.middleware("http")
    async def request_metadata(request, call_next):
        request.state.request_id = str(uuid4())
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        if request.url.path.startswith(settings.API_V1_STR):
            response.headers["Cache-Control"] = "private, no-store"
        return response

    def error_response(request, status_code, code, message, fields=None):
        request_id = getattr(request.state, "request_id", str(uuid4()))
        return JSONResponse(status_code=status_code,
                            content={"error": {"code": code, "message": message,
                                               "field_errors": fields or [], "request_id": request_id}},
                            headers={"X-Request-ID": request_id, "Cache-Control": "private, no-store"})

    @application.exception_handler(ServiceError)
    async def service_error(request: Request, error: ServiceError):
        return error_response(request, error.status_code, error.code, error.message, error.field_errors)

    @application.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError):
        fields = [{"field": ".".join(str(part) for part in issue["loc"]), "message": issue["msg"]}
                  for issue in error.errors()]
        return error_response(request, 422, "invalid_request", "Request validation failed.", fields)

    @application.exception_handler(HTTPException)
    async def http_error(request: Request, error: HTTPException):
        return error_response(request, error.status_code, "http_error", str(error.detail))

    @application.exception_handler(Exception)
    async def unexpected_error(request: Request, error: Exception):
        logger.error("Unhandled API error; request_id=%s", getattr(request.state, "request_id", "unknown"))
        return error_response(request, 500, "internal_error", "The request could not be completed.")

    @application.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "healthy", "service": settings.PROJECT_NAME, "version": settings.VERSION}

    application.include_router(api_router, prefix=settings.API_V1_STR)
    return application


app = create_app()
