"""Accepted submissions, lifecycle polling and stored immutable metrics."""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, Response

from app.api.dependencies import get_service, require_analyst, require_session
from app.api.schemas import SubmitRun


router = APIRouter(prefix="/runs", tags=["Runs"])


@router.post("", status_code=202)
def submit_run(body: SubmitRun, response: Response,
               idempotency_key: str = Header(..., alias="Idempotency-Key", min_length=1, max_length=200),
               actor=Depends(require_analyst), service=Depends(get_service)):
    accepted = service.submit_run(str(body.scenario_revision_id), body.requested_modules, idempotency_key, actor["user_id"])
    response.headers["Location"] = accepted["status_url"]
    response.headers["Retry-After"] = "2"
    return accepted


@router.get("/{run_id}", dependencies=[Depends(require_session)])
def get_run(run_id: UUID, service=Depends(get_service)):
    return service.get_run(str(run_id))


@router.get("/{run_id}/results", dependencies=[Depends(require_session)])
def get_results(run_id: UUID, service=Depends(get_service)):
    return service.get_results(str(run_id))


@router.post("/{run_id}/cancel", status_code=202)
def cancel_run(run_id: UUID, actor=Depends(require_analyst), service=Depends(get_service)):
    return service.cancel_run(str(run_id), actor["user_id"])
