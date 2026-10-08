"""Single mounting point for the versioned private API."""

from fastapi import APIRouter

from app.api.v1 import comparisons, datasets, runs, scenarios


api_router = APIRouter()
for router in (scenarios.router, runs.router, comparisons.router, datasets.router):
    api_router.include_router(router)
