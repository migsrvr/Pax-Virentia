"""FastAPI entrypoint with an optional, lifespan-managed numerical worker."""

from contextlib import asynccontextmanager
import asyncio
import logging
import threading
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from app.api.v1.router import api_router
from app.config import OriginPolicy, settings
from app.jobs.worker import RunWorker
from app.repositories.simulation import SimulationRepository
from app.services.errors import ServiceError
from app.services.simulations import SimulationService


logger = logging.getLogger(__name__)


class TrustedOriginCORSMiddleware(CORSMiddleware):
    def __init__(self, app, *, origin_policy, **kwargs):
        self.origin_policy = origin_policy
        super().__init__(app, **kwargs)

    def is_allowed_origin(self, origin):
        return self.origin_policy.allows(origin)


def create_app(repository=None, code_version=None, allowed_origins=None):
    @asynccontextmanager
    async def lifespan(application):
        store = repository if repository is not None else SimulationRepository(settings.DATABASE_URL)
        worker_thread = None
        stop_event = threading.Event()
        application.state.worker_thread = None
        try:
            application.state.repository = store
            application.state.simulations = SimulationService(
                store, code_version=code_version or settings.CODE_VERSION, api_prefix=settings.API_V1_STR)
            if settings.ENABLE_EMBEDDED_WORKER and repository is None:
                worker = RunWorker(store)

                def run_loop():
                    while not stop_event.is_set():
                        try:
                            if worker.run_once():
                                continue
                        except Exception:
                            logger.warning("Embedded worker operation failed; durable jobs remain retryable.")
                        stop_event.wait(2.0)

                thread = threading.Thread(target=run_loop, name="pv-simulation-worker", daemon=True)
                thread.start()
                worker_thread = thread
                application.state.worker_thread = thread
            yield
        finally:
            try:
                if worker_thread is not None:
                    stop_event.set()
                    # Keep the event loop responsive while a claimed job completes.
                    # Even cancelled shutdown must finish joining before closing DB.
                    joining = asyncio.create_task(asyncio.to_thread(worker_thread.join))
                    cancellation = None
                    while not joining.done():
                        try:
                            await asyncio.shield(joining)
                        except asyncio.CancelledError as error:
                            # Every await must be shielded: repeated cancellation
                            # must never cancel the join task or close a live DB.
                            cancellation = error
                    joining.result()
                    if cancellation is not None:
                        raise cancellation
            finally:
                if repository is None:
                    store.close()

    application = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION,
                          openapi_url=f"{settings.API_V1_STR}/openapi.json",
                          docs_url=f"{settings.API_V1_STR}/docs", lifespan=lifespan)
    policy = OriginPolicy(settings.ALLOWED_ORIGINS if allowed_origins is None else allowed_origins)
    application.state.allowed_origins = policy.origins
    application.state.origin_policy = policy
    application.add_middleware(TrustedOriginCORSMiddleware, origin_policy=policy,
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
# Render's approved command uses this name; retain app for existing launchers.
application = app
