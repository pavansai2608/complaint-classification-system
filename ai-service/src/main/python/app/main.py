import os

from fastapi import FastAPI
from pydantic import BaseModel

# API docs (/docs, /redoc, /openapi.json) are off unless ENABLE_DOCS=true,
# so the full API map is not public by default.
docs_enabled = os.getenv("ENABLE_DOCS", "false").lower() == "true"

app = FastAPI(
    title="Complaint AI Service",
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    openapi_url="/openapi.json" if docs_enabled else None,
)


class HealthResponse(BaseModel):
    status: str


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")
