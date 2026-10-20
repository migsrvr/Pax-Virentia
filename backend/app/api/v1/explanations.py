"""Authorized explanations of already committed run results."""

from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from app.api.dependencies import get_repository, require_analyst, require_session
from app.integrations.gemini import Focus, generate_explanation
from app.services.errors import ServiceError

router = APIRouter(prefix="/runs", tags=["Explanations"])


class ExplainRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    focus: Focus = "general"


def explanation_response(stored):
    evidence = stored["grounded_evidence"]
    return stored | {key: evidence.get(key) for key in
                     ("summary", "key_findings", "limitations", "cited_metric_keys")}


@router.post("/{run_id}/explain")
def explain_run(run_id: UUID, body: ExplainRequest | None = None,
                actor=Depends(require_analyst), repository=Depends(get_repository)):
    focus = body.focus if body else "general"
    results = repository.get_results(str(run_id))
    generated = generate_explanation(results, focus)
    stored = repository.save_ai_explanation(str(run_id), focus, **generated)
    # Repository upsert preserves its original identity on regeneration.
    return explanation_response(repository.get_ai_explanation(str(run_id), focus) or stored)


@router.get("/{run_id}/explain", dependencies=[Depends(require_session)])
def get_explanation(run_id: UUID, focus: Focus = "general", repository=Depends(get_repository)):
    stored = repository.get_ai_explanation(str(run_id), focus)
    if stored is None:
        raise ServiceError(404, "explanation_not_found", "Explanation was not found.")
    return explanation_response(stored)
