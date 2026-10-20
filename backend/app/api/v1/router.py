"""Single mounting point for the versioned private API."""

from fastapi import APIRouter

from app.api.v1 import auth, catalogs, comparisons, datasets, explanations, publications, runs, scenarios


api_router = APIRouter()
for router in (auth.router, catalogs.router, scenarios.router, runs.router, comparisons.router,
               datasets.router, explanations.router, publications.router):
    api_router.include_router(router)
