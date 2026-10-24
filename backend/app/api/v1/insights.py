"""Per-user review marks on baseline/intervention comparison insights."""

from typing import Literal

from fastapi import APIRouter, Depends, Path, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.api.dependencies import get_repository, require_analyst, require_session
from app.api.v1.publications import _safe_text

router = APIRouter(prefix="/insight-reviews", tags=["Insights"])
UUID_PATTERN = r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
# An insight is a baseline/intervention run pair.
INSIGHT_KEY = rf"^{UUID_PATTERN}:{UUID_PATTERN}$"


class InsightReview(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    status: Literal["reviewed", "dismissed"]
    note: str | None = Field(default=None, min_length=1, max_length=1000)

    @field_validator("note")
    @classmethod
    def safe_note(cls, value):
        return _safe_text(value)


@router.get("")
def list_reviews(actor=Depends(require_session), repository=Depends(get_repository)):
    return {"items": repository.list_insight_reviews(actor["user_id"])}


@router.put("/{insight_key}")
def save_review(body: InsightReview, insight_key: str = Path(pattern=INSIGHT_KEY, max_length=73),
                actor=Depends(require_analyst), repository=Depends(get_repository)):
    return repository.save_insight_review(actor["user_id"], insight_key, body.status, body.note)


@router.delete("/{insight_key}", status_code=204)
def clear_review(insight_key: str = Path(pattern=INSIGHT_KEY, max_length=73),
                 actor=Depends(require_analyst), repository=Depends(get_repository)):
    repository.delete_insight_review(actor["user_id"], insight_key)
    return Response(status_code=204)
