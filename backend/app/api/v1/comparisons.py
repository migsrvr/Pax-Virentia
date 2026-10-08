"""Compatibility checks and differences over completed run results."""

from fastapi import APIRouter, Depends

from app.api.dependencies import get_service, require_analyst
from app.api.schemas import CompareRuns


router = APIRouter(prefix="/comparisons", tags=["Comparisons"])


@router.post("")
def compare_runs(body: CompareRuns, actor=Depends(require_analyst), service=Depends(get_service)):
    return service.compare_runs(str(body.baseline_run_id), str(body.intervention_run_id))
