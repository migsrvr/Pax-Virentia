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


@router.get("/{dataset_id}/quality", dependencies=[Depends(require_session)])
def get_quality(dataset_id: UUID, repository=Depends(get_repository)):
    return repository.get_dataset(str(dataset_id))["quality_report"]
