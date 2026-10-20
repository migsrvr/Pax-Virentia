"""Immutable, intentionally published snapshots with explicit public allowlists."""

from copy import deepcopy
import math
import sqlite3
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.api.dependencies import get_repository, require_analyst
from app.integrations.gemini import approved_output
from app.services.errors import ServiceError

router = APIRouter(tags=["Public reports"])
SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class PublishRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    title: str = Field(default="Water-treatment scenario report", min_length=1, max_length=160)
    summary: str | None = Field(default=None, min_length=1, max_length=2000)
    slug: str | None = Field(default=None, min_length=1, max_length=100, pattern=SLUG_PATTERN)

    @field_validator("title", "summary")
    @classmethod
    def safe_public_text(cls, value):
        if value is not None and (any(ord(char) < 32 for char in value) or "<" in value or ">" in value):
            raise ValueError("Use plain public text without markup or control characters.")
        return value


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


def publication_response(publication):
    result = _fields(publication, ("id", "slug", "title", "summary", "published_at", "view_count"))
    result["public_path"] = f"/public/reports/{result['slug']}"
    if "snapshot_data" in publication:
        result["snapshot_data"] = sanitize_snapshot(publication["snapshot_data"])
    return result


def _slug_exists(repository, slug):
    try:
        repository.get_publication_by_slug(slug, increment_view=False)
        return True
    except ServiceError as error:
        if error.status_code != 404:
            raise
        return False


@router.post("/runs/{run_id}/publish", status_code=201)
def publish_run(run_id: UUID, response: Response, body: PublishRequest | None = None,
                actor=Depends(require_analyst), repository=Depends(get_repository)):
    body = body or PublishRequest()
    results = repository.get_results(str(run_id))
    run = repository.get_run(str(run_id))
    slug = body.slug or f"report-{uuid4().hex}"
    if _slug_exists(repository, slug):
        raise ServiceError(409, "publication_slug_conflict", "This public slug is already in use.")
    snapshot = public_snapshot(results, run["frozen_inputs"]["parameters"])
    summary = body.summary or "Published calculations for an offline water-treatment scenario. Review the evidence limitations alongside every metric."
    try:
        created = repository.create_publication(str(run_id), slug, body.title, summary, snapshot, actor["user_id"])
    except Exception as error:
        # Handle the concurrent unique-slug race for both supported adapters.
        is_integrity = isinstance(error, sqlite3.IntegrityError)
        if repository.postgres:
            from sqlalchemy.exc import IntegrityError
            is_integrity = isinstance(error, IntegrityError)
        if is_integrity and _slug_exists(repository, slug):
            raise ServiceError(409, "publication_slug_conflict", "This public slug is already in use.") from None
        raise
    response.headers["Location"] = f"/api/v1/public/reports/{slug}"
    return publication_response(created | {"snapshot_data": snapshot})


@router.get("/public/reports")
def list_reports(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
                 repository=Depends(get_repository)):
    page = repository.list_publications(limit, offset)
    return {"items": [publication_response(item) for item in page["items"]], "limit": limit, "offset": offset}


@router.get("/public/reports/{slug}")
def get_report(slug: str, repository=Depends(get_repository)):
    # Invalid public paths share the same safe response as unknown publications.
    import re
    if len(slug) > 100 or not re.fullmatch(SLUG_PATTERN, slug):
        raise ServiceError(404, "publication_not_found", "Publication was not found.")
    return publication_response(repository.get_publication_by_slug(slug))
