import hmac
import os

from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field, field_validator

from app.category_model import predict_category_with_confidence
from app.emotion_model import predict_emotion
from app.priority import determine_priority
from app.reply_generator import generate_suggested_reply

# API docs (/docs, /redoc, /openapi.json) are off unless ENABLE_DOCS=true,
# so the full API map is not public by default.
docs_enabled = os.getenv("ENABLE_DOCS", "false").lower() == "true"

app = FastAPI(
    title="Complaint AI Service",
    openapi_tags=[
        {"name": "0. Public", "description": "No key"},
        {"name": "6. AI service", "description": "X-Service-Key header"},
    ],
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    openapi_url="/openapi.json" if docs_enabled else None,
)

# A prediction the model itself is unsure about should be flagged for a
# human to double-check rather than trusted blindly.
CONFIDENCE_THRESHOLD = 0.6


class HealthResponse(BaseModel):
    status: str


@app.get("/health", response_model=HealthResponse, tags=["0. Public"], summary="1. GET - AI service status")
def health() -> HealthResponse:
    return HealthResponse(status="ok")


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, examples=["I was charged twice for the same order"])

    @field_validator("text")
    @classmethod
    def trimmed_and_not_blank(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("text must not be blank")
        return trimmed


class EmotionResult(BaseModel):
    label: str
    score: float


class AnalyzeResponse(BaseModel):
    category: str
    confidence: float
    needsReview: bool
    emotion: EmotionResult
    priority: str
    suggestedReply: str


# Shown as the Authorize button in Swagger UI. auto_error=False leaves the
# check, and the 401, to require_service_key below.
service_key_header = APIKeyHeader(name="X-Service-Key", scheme_name="ServiceKey", auto_error=False)


def require_service_key(x_service_key: str | None = Security(service_key_header)) -> None:
    # Only the Express server should ever call this endpoint, proven by a
    # shared secret set on both sides - never by trusting the caller's IP
    # or origin, which are both easy to spoof.
    expected = os.getenv("AI_SERVICE_KEY")
    if not expected or not x_service_key or not hmac.compare_digest(x_service_key, expected):
        raise HTTPException(status_code=401, detail="Missing or invalid service key")


@app.post(
    "/analyze",
    response_model=AnalyzeResponse,
    tags=["6. AI service"],
    summary="1. POST - analyze a complaint",
    dependencies=[Depends(require_service_key)],
    responses={401: {"description": "Missing or invalid service key"}},
)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    category, confidence = predict_category_with_confidence(payload.text)
    emotion = predict_emotion(payload.text)
    priority = determine_priority(category, emotion, payload.text)
    reply = generate_suggested_reply(payload.text, category, priority)

    return AnalyzeResponse(
        category=category,
        confidence=confidence,
        needsReview=confidence < CONFIDENCE_THRESHOLD,
        emotion=EmotionResult(**emotion),
        priority=priority,
        suggestedReply=reply["reply"],
    )
