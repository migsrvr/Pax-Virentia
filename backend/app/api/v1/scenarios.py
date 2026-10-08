"""Create scenarios and append immutable operating revisions."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_repository, get_service, require_analyst, require_session
from app.api.schemas import CreateRevision, CreateScenario


router = APIRouter(prefix="/scenarios", tags=["Scenarios"])


@router.post("", status_code=201)
def create_scenario(body: CreateScenario, actor=Depends(require_analyst), service=Depends(get_service)):
    return service.create_scenario(body.name, body.kind, body.parameters.model_dump(mode="json", exclude_none=True), actor["user_id"])


@router.get("", dependencies=[Depends(require_session)])
def list_scenarios(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
                   repository=Depends(get_repository)):
    return repository.list_scenarios(limit, offset)


@router.post("/{scenario_id}/revisions", status_code=201)
def create_revision(scenario_id: UUID, body: CreateRevision, actor=Depends(require_analyst), service=Depends(get_service)):
    return service.create_revision(str(scenario_id), body.parameters.model_dump(mode="json", exclude_none=True), actor["user_id"])


@router.get("/{scenario_id}/revisions", dependencies=[Depends(require_session)])
def list_revisions(scenario_id: UUID, limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
                   repository=Depends(get_repository)):
    return repository.list_revisions(str(scenario_id), limit, offset)
