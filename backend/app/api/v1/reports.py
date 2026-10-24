"""Report export requests and on-demand PDF/CSV generation from stored results.

Only the request is persisted. Files are regenerated from immutable run results
on every download, so they never drift from stored data and need no file store.
"""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.api.dependencies import get_repository, get_service, require_analyst, require_session
from app.api.v1.publications import _safe_text, valid_slug
from app.services.errors import ServiceError
from app.services.reports import (SELECTABLE_SECTIONS, build_public_model, build_report_model, page_count,
                                  render_csv, render_pdf)

router = APIRouter(tags=["Reports"])
MEDIA_TYPES = {"pdf": "application/pdf", "csv": "text/csv; charset=utf-8"}


class ComparisonPair(BaseModel):
    model_config = ConfigDict(extra="forbid")
    baseline_run_id: UUID
    intervention_run_id: UUID


class ReportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    report_type: Literal["technical", "data_export"] = "technical"
    title: str = Field(default="Scenario analysis report", min_length=1, max_length=160)
    run_ids: list[UUID] = Field(min_length=1, max_length=5)
    comparison: ComparisonPair | None = None
    sections: list[Literal["summary", "inputs", "results", "comparison"]] = Field(min_length=1)
    formats: list[Literal["pdf", "csv"]] = Field(min_length=1)

    @field_validator("title")
    @classmethod
    def safe_title(cls, value):
        return _safe_text(value)

    @model_validator(mode="after")
    def consistent(self):
        if len(set(self.run_ids)) != len(self.run_ids):
            raise ValueError("Each run may be included only once.")
        if len(set(self.sections)) != len(self.sections) or len(set(self.formats)) != len(self.formats):
            raise ValueError("Sections and formats must be unique.")
        if self.report_type == "data_export" and "pdf" in self.formats:
            raise ValueError("A data export is CSV only.")
        if "comparison" in self.sections:
            if self.comparison is None:
                raise ValueError("The comparison section requires a baseline and an intervention run.")
            pair = {self.comparison.baseline_run_id, self.comparison.intervention_run_id}
            if len(pair) != 2 or not pair <= set(self.run_ids):
                raise ValueError("Compare two different runs that are included in the report.")
        elif self.comparison is not None:
            raise ValueError("Select the comparison section to include a comparison.")
        return self


def _inputs(repository, service, report):
    """Load stored runs/results; reject runs that changed or are no longer succeeded."""
    runs, results = {}, {}
    for run_id in report["run_ids"]:
        run = repository.get_run_summary(run_id)
        if run["status"] != "succeeded":
            raise ServiceError(409, "results_not_available", "Reports require succeeded runs.")
        expected = report["input_hashes"].get(run_id)
        if expected is not None and expected != run["snapshot_hash"]:
            raise ServiceError(409, "report_inputs_changed", "A stored run no longer matches this report.")
        runs[run_id] = run
        results[run_id] = repository.get_results(run_id)
    comparison = None
    pair = report["params"].get("comparison")
    if pair and "comparison" in report["params"]["sections"]:
        comparison = service.compare_runs(pair["baseline_run_id"], pair["intervention_run_id"])
    return runs, results, comparison


def report_model(repository, service, report):
    runs, results, comparison = _inputs(repository, service, report)
    model = build_report_model(report, runs, results, comparison)
    return model | {"page_count": page_count(model)}


def file_response(model, file_format, disposition, stem):
    if file_format not in model["formats"]:
        raise ServiceError(404, "report_format_unavailable", "This report was not requested in that format.")
    content = render_pdf(model) if file_format == "pdf" else render_csv(model)
    safe = "".join(char if char.isalnum() or char in "-_" else "-" for char in stem.lower()).strip("-")[:80] or "report"
    return Response(content, media_type=MEDIA_TYPES[file_format], headers={
        "Content-Disposition": f'{disposition}; filename="{safe}.{file_format}"',
        "X-Content-Type-Options": "nosniff",
    })


def report_summary(report):
    return {key: report[key] for key in ("id", "report_type", "title", "run_ids", "created_by_name", "created_at")} | {
        "formats": report["params"]["formats"], "sections": report["params"]["sections"]}


def draft_report(body, repository):
    """Normalize a request into an unsaved report (fixed section/format order)."""
    run_ids = [str(run_id) for run_id in body.run_ids]
    params = {"sections": [section for section in SELECTABLE_SECTIONS if section in body.sections],
              "formats": [item for item in ("pdf", "csv") if item in body.formats],
              "comparison": {"baseline_run_id": str(body.comparison.baseline_run_id),
                             "intervention_run_id": str(body.comparison.intervention_run_id)} if body.comparison else None}
    hashes = {}
    for run_id in run_ids:
        run = repository.get_run(run_id)
        if run["status"] != "succeeded":
            raise ServiceError(409, "results_not_available", "Reports require succeeded runs.")
        hashes[run_id] = run["snapshot_hash"]
    return {"id": "preview", "title": body.title, "report_type": body.report_type, "created_at": None,
            "created_by_name": None, "params": params, "run_ids": run_ids, "input_hashes": hashes}


@router.post("/reports/preview")
async def preview_report(body: ReportRequest, actor=Depends(require_analyst),
                         repository=Depends(get_repository), service=Depends(get_service)):
    """Build the exact report model without storing a report."""
    draft = await run_in_threadpool(draft_report, body, repository)
    return {"preview": await run_in_threadpool(report_model, repository, service, draft)}


@router.post("/reports", status_code=201)
async def create_report(body: ReportRequest, actor=Depends(require_analyst),
                        repository=Depends(get_repository), service=Depends(get_service)):
    draft = await run_in_threadpool(draft_report, body, repository)
    # Validate fully (including comparison compatibility) before persisting.
    await run_in_threadpool(report_model, repository, service, draft)
    report = await run_in_threadpool(repository.create_report, body.report_type, body.title, draft["params"],
                                     draft["run_ids"], draft["input_hashes"], actor["user_id"])
    return report_summary(report) | {"preview": await run_in_threadpool(report_model, repository, service, report)}


@router.get("/reports", dependencies=[Depends(require_session)])
def list_reports(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
                 repository=Depends(get_repository)):
    page = repository.list_reports(limit, offset)
    return {"items": [report_summary(item) for item in page["items"]], "limit": limit, "offset": offset}


@router.get("/reports/{report_id}", dependencies=[Depends(require_session)])
def get_report(report_id: UUID, repository=Depends(get_repository), service=Depends(get_service)):
    report = repository.get_report(str(report_id))
    return report_summary(report) | {"preview": report_model(repository, service, report)}


@router.get("/reports/{report_id}/download", dependencies=[Depends(require_session)])
def download_report(report_id: UUID, format: Literal["pdf", "csv"] = Query(...),
                    disposition: Literal["attachment", "inline"] = "attachment",
                    repository=Depends(get_repository), service=Depends(get_service)):
    report = repository.get_report(str(report_id))
    return file_response(report_model(repository, service, report), format, disposition, report["title"])


@router.get("/public/reports/{slug}/download", tags=["Public reports"])
def download_public_report(slug: str, format: Literal["pdf", "csv"] = Query(...),
                           repository=Depends(get_repository)):
    publication = repository.get_public_publication(valid_slug(slug), increment_view=False)
    return file_response(build_public_model(publication), format, "attachment", publication["slug"])
