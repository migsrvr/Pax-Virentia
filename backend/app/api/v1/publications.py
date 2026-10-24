"""Reviewed, immutable public snapshots with explicit public allowlists.

Analysts submit a run's redacted snapshot for review. A different reviewer (or
an administrator) approves it, or rejects it with a reason; a reviewer or
administrator may withdraw a published snapshot with a reason. Every transition
is audited, and only published rows are readable without a session.
"""

from copy import deepcopy
import math
import re
import sqlite3
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.api.dependencies import get_repository, require_analyst, require_reviewer, require_session
from app.integrations.gemini import approved_output
from app.services.errors import ServiceError

router = APIRouter(tags=["Publications"])
SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
STATUSES = ("pending_review", "published", "rejected", "withdrawn")


def _safe_text(value):
    if value is not None and (any(ord(char) < 32 for char in value) or "<" in value or ">" in value):
        raise ValueError("Use plain public text without markup or control characters.")
    return value


class PublishRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    run_id: UUID
    title: str = Field(default="Water-treatment scenario report", min_length=1, max_length=160)
    summary: str | None = Field(default=None, min_length=1, max_length=2000)
    slug: str | None = Field(default=None, min_length=1, max_length=100, pattern=SLUG_PATTERN)

    @field_validator("title", "summary")
    @classmethod
    def safe_public_text(cls, value):
        return _safe_text(value)


class DecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    reason: str | None = Field(default=None, min_length=1, max_length=2000)

    @field_validator("reason")
    @classmethod
    def safe_reason(cls, value):
        return _safe_text(value)


class ReasonRequired(DecisionRequest):
    reason: str = Field(min_length=1, max_length=2000)


SECTION_FIELDS = {
    "energy": ("total_kwh", "energy_intensity_kwh_per_m3", "status"),
    "carbon": ("emissions_kg_co2e", "emissions_kg_co2", "factor_kg_per_kwh", "gas_basis", "unit"),
    "economics": ("electricity_cost_php", "chemical_cost_php", "labor_cost_php", "maintenance_cost_php",
                  "other_cost_php", "total_opex_php", "chemical_kg_used", "net_savings_php", "simple_payback_years"),
    "ecology": ("indicator_key", "status", "value", "unit", "reason", "required_evidence"),
}
METRIC_FIELDS = ("key", "value", "unit", "status", "reason", "required_evidence", "interval_key")
BOUNDARY_FIELDS = ("volume_m3", "period_start", "period_end", "currency")
PROVENANCE_FIELDS = ("technology_evidence_status", "factor_evidence_status", "emissions_boundary")
PUBLIC_FIELDS = ("slug", "title", "summary", "published_at", "view_count")
PRIVATE_FIELDS = ("id", "run_id", "slug", "title", "summary", "status", "submitted_by", "submitted_by_name",
                  "submitted_at", "reviewed_by", "reviewed_by_name", "reviewed_at", "decision_reason",
                  "published_at", "withdrawn_by", "withdrawn_by_name", "withdrawn_at", "withdrawal_reason",
                  "view_count")


def _public_value(value):
    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value if math.isfinite(value) else None
    if isinstance(value, str):
        # No HTML is served; also remove markup/control characters as defense in depth.
        return "".join(char for char in value if ord(char) >= 32 and char not in "<>")[:2000]
    if isinstance(value, list):
        return [_public_value(item) for item in value[:20] if isinstance(item, str)]
    return None


def _fields(value, fields):
    return {key: _public_value(value[key]) for key in fields if key in value}


def sanitize_snapshot(snapshot):
    """Apply the same allowlist on reads, including publications predating this API."""
    public = {"schema_version": 1,
              "boundary": _fields(snapshot.get("boundary", {}), BOUNDARY_FIELDS),
              "metrics": [_fields(metric, METRIC_FIELDS) for metric in snapshot.get("metrics", [])
                          if metric.get("key") in SECTION_FIELDS],
              "provenance": _fields(snapshot.get("provenance", {}), PROVENANCE_FIELDS),
              "limitations": _public_value(snapshot.get("limitations", []))}
    for section, fields in SECTION_FIELDS.items():
        if section in snapshot:
            public[section] = _fields(snapshot[section], fields)
    return public


def public_snapshot(results, parameters):
    provenance = results.get("provenance", {})
    snapshot = deepcopy(results)
    snapshot["boundary"] = _fields(parameters, BOUNDARY_FIELDS)
    snapshot["limitations"] = approved_output(results).limitations
    snapshot["provenance"] = {
        "technology_evidence_status": provenance.get("technology_evidence_status", "unverified"),
        "factor_evidence_status": (provenance.get("factor") or {}).get("evidence_status", "unverified"),
        "emissions_boundary": "electricity-associated only",
    }
    return sanitize_snapshot(snapshot)


def public_response(publication):
    """Public schema: no identifiers, people or private workflow fields."""
    result = _fields(publication, PUBLIC_FIELDS)
    result["public_path"] = f"/public/reports/{result['slug']}"
    if "snapshot_data" in publication:
        result["snapshot_data"] = sanitize_snapshot(publication["snapshot_data"])
    return result


def private_response(publication):
    result = {key: publication.get(key) for key in PRIVATE_FIELDS}
    result["public_path"] = f"/public/reports/{publication['slug']}"
    if "snapshot_data" in publication:
        # Reviewers preview exactly the payload the public schema will expose.
        result["snapshot_data"] = sanitize_snapshot(publication["snapshot_data"])
    return result


def _is_integrity_error(repository, error):
    if isinstance(error, sqlite3.IntegrityError):
        return True
    if repository.postgres:
        from sqlalchemy.exc import IntegrityError
        return isinstance(error, IntegrityError)
    return False


def _slug_exists(repository, slug):
    return repository.slug_exists(slug)


@router.post("/publications", status_code=201)
def submit_publication(body: PublishRequest, response: Response,
                       actor=Depends(require_analyst), repository=Depends(get_repository)):
    run_id = str(body.run_id)
    results = repository.get_results(run_id)
    run = repository.get_run(run_id)
    slug = body.slug or f"report-{uuid4().hex}"
    if _slug_exists(repository, slug):
        raise ServiceError(409, "publication_slug_conflict", "This public slug is already in use.")
    snapshot = public_snapshot(results, run["frozen_inputs"]["parameters"])
    summary = body.summary or "Published calculations for an offline water-treatment scenario. Review the evidence limitations alongside every metric."
    try:
        created = repository.create_publication(run_id, slug, body.title, summary, snapshot, actor["user_id"])
    except Exception as error:
        # Handle the concurrent unique-slug race for both supported adapters.
        if _is_integrity_error(repository, error) and _slug_exists(repository, slug):
            raise ServiceError(409, "publication_slug_conflict", "This public slug is already in use.") from None
        raise
    response.headers["Location"] = f"/api/v1/publications/{created['id']}"
    return private_response(created)


@router.get("/publications", dependencies=[Depends(require_session)])
def list_publications(status: str | None = Query(None), run_id: UUID | None = None,
                      limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
                      repository=Depends(get_repository)):
    if status is not None and status not in STATUSES:
        raise ServiceError(422, "invalid_request", "Unknown publication status.",
                           [{"field": "status", "message": "Use one of: " + ", ".join(STATUSES)}])
    page = repository.list_publications(limit, offset, status=status, run_id=str(run_id) if run_id else None)
    return {"items": [private_response(item) for item in page["items"]], "limit": limit, "offset": offset}


@router.get("/publications/{publication_id}", dependencies=[Depends(require_session)])
def get_publication(publication_id: UUID, repository=Depends(get_repository)):
    publication = repository.get_publication(str(publication_id))
    return private_response(publication) | {"audit": repository.list_audit_events("publication", str(publication_id))}


@router.post("/publications/{publication_id}/approve")
def approve_publication(publication_id: UUID, body: DecisionRequest | None = None,
                        actor=Depends(require_reviewer), repository=Depends(get_repository)):
    reason = body.reason if body else None
    return private_response(repository.transition_publication(str(publication_id), "approve", actor["user_id"], reason))


@router.post("/publications/{publication_id}/reject")
def reject_publication(publication_id: UUID, body: ReasonRequired,
                       actor=Depends(require_reviewer), repository=Depends(get_repository)):
    return private_response(repository.transition_publication(str(publication_id), "reject", actor["user_id"], body.reason))


@router.post("/publications/{publication_id}/withdraw")
def withdraw_publication(publication_id: UUID, body: ReasonRequired,
                         actor=Depends(require_reviewer), repository=Depends(get_repository)):
    return private_response(repository.transition_publication(str(publication_id), "withdraw", actor["user_id"], body.reason))


def valid_slug(slug):
    # Invalid public paths share the same safe response as unknown publications.
    if len(slug) > 100 or not re.fullmatch(SLUG_PATTERN, slug):
        raise ServiceError(404, "publication_not_found", "Publication was not found.")
    return slug


@router.get("/public/reports", tags=["Public reports"])
def list_reports(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
                 include_snapshot: bool = False, repository=Depends(get_repository)):
    # Listing never counts as a view; snapshots are optional for side-by-side pages.
    page = repository.list_public_publications(limit, offset, include_snapshot=include_snapshot)
    return {"items": [public_response(item) for item in page["items"]], "limit": limit, "offset": offset}


@router.get("/public/reports/{slug}", tags=["Public reports"])
def get_report(slug: str, repository=Depends(get_repository)):
    return public_response(repository.get_public_publication(valid_slug(slug)))
