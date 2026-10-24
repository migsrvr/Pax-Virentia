"""Inspect or register bounded raw UTF-8 CSV uploads without changing rows."""

from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from fastapi.concurrency import run_in_threadpool

from app.api.dependencies import get_repository, require_analyst, require_session
from app.domain.scenarios import text
from app.services.datasets import MAX_CSV_BYTES, inspect_csv
from app.services.errors import ServiceError


router = APIRouter(prefix="/datasets", tags=["Datasets"])


async def read_csv(request):
    media_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if media_type not in ("text/csv", "application/csv"):
        raise ServiceError(415, "unsupported_media_type", "Upload raw CSV with Content-Type: text/csv.")
    chunks, size = [], 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_CSV_BYTES:
            raise ServiceError(413, "csv_too_large", "CSV files are limited to 10 MB.")
        chunks.append(chunk)
    return b"".join(chunks)


@router.post("/inspect", dependencies=[Depends(require_analyst)])
async def inspect_dataset(request: Request):
    raw = await read_csv(request)
    return await run_in_threadpool(inspect_csv, raw)


@router.post("", status_code=201)
async def create_dataset(request: Request, source_ref: Annotated[str, Query(min_length=1, max_length=1000)],
                         evidence_status: Literal["measured", "externally_sourced", "assumed", "synthetic"],
                         actor=Depends(require_analyst), repository=Depends(get_repository)):
    raw = await read_csv(request)
    report = await run_in_threadpool(inspect_csv, raw)
    return await run_in_threadpool(repository.create_dataset, raw, report, text(source_ref, "source_ref"),
                                  evidence_status, actor["user_id"])


def dataset_summary(item):
    """List rows omit raw CSV bytes and per-row findings; counts suffice for review."""
    report = item["quality_report"]
    return {key: item.get(key) for key in ("id", "source_ref", "evidence_status", "content_hash", "schema_version",
                                           "created_by", "created_by_name", "created_at")} | {
        "row_count": report.get("row_count", 0),
        "column_count": report.get("column_count", 0),
        "quality": {"missing_columns": len(report.get("missing_columns", [])),
                    "critical_missing_values": report.get("critical_missing_values", 0),
                    "invalid_values": len(report.get("invalid_values", [])),
                    "duplicate_rows": len(report.get("duplicate_rows", [])),
                    "outliers": sum(len(rows) for rows in report.get("outliers", {}).values())},
    }


@router.get("", dependencies=[Depends(require_session)])
def list_datasets(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0),
                  repository=Depends(get_repository)):
    page = repository.list_datasets(limit, offset)
    return {"items": [dataset_summary(item) for item in page["items"]], "limit": limit, "offset": offset}


@router.get("/{dataset_id}/quality", dependencies=[Depends(require_session)])
def get_quality(dataset_id: UUID, repository=Depends(get_repository)):
    return repository.get_dataset(str(dataset_id))["quality_report"]
