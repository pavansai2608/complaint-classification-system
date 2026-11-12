import json
import os
import urllib.request
from functools import lru_cache

# Three ways to read the tone of a complaint, picked with EMOTION_BACKEND:
#
# - "transformer" (default): a pretrained DistilBERT model (not fine-tuned
#   by us), 3-class sentiment trained on the multilingual-sentiments
#   dataset, run inside this service. PyTorch and the model need about
#   1.5 GB of memory.
# - "api": the same DistilBERT model, run by Hugging Face's Inference API
#   (needs HF_TOKEN). Same results with almost no memory here, so it suits
#   a small free hosting plan. If the API fails, falls back to "lexicon".
# - "lexicon": VADER, a word list with rules for negation, capitals and
#   "!!!". English only and a little less accurate, but it needs a few MB.
#
# Both return the same shape: {"label": positive|neutral|negative, "score"}.
DEFAULT_MODEL_NAME = "lxyuan/distilbert-base-multilingual-cased-sentiments-student"
TRANSFORMER = "transformer"
API = "api"
LEXICON = "lexicon"
BACKENDS = (TRANSFORMER, API, LEXICON)

HF_API_URL = "https://router.huggingface.co/hf-inference/models/{model}"
HF_API_TIMEOUT_SECONDS = 20

# Complaint descriptions are capped at 2000 chars in the schema; the
# tokenizer's own truncation=True below is the real safety net, this is
# just a cheap first cut so we never tokenize something huge.
MAX_INPUT_CHARS = 2000

# VADER's own recommended cut-offs for its compound score (-1 to 1).
LEXICON_POSITIVE_FROM = 0.05
LEXICON_NEGATIVE_FROM = -0.05


def _model_name() -> str:
    return os.getenv("EMOTION_MODEL_NAME", DEFAULT_MODEL_NAME)


def emotion_backend() -> str:
    backend = os.getenv("EMOTION_BACKEND", TRANSFORMER).strip().lower()
    return backend if backend in BACKENDS else TRANSFORMER


@lru_cache(maxsize=1)
def load_model():
    # Imported here, not at the top, so the lexicon option never loads
    # PyTorch at all - that import alone is most of the memory.
    from transformers import pipeline

    return pipeline("sentiment-analysis", model=_model_name())


@lru_cache(maxsize=1)
def load_lexicon():
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

    return SentimentIntensityAnalyzer()


def _predict_with_lexicon(text: str) -> dict:
    compound = load_lexicon().polarity_scores(text[:MAX_INPUT_CHARS])["compound"]
    if compound >= LEXICON_POSITIVE_FROM:
        label = "positive"
    elif compound <= LEXICON_NEGATIVE_FROM:
        label = "negative"
    else:
        label = "neutral"
    # Turn the compound score into a 0-1 confidence like the transformer's:
    # a clear tone (compound near -1 or 1) scores near 1, and a flat text
    # is a confident "neutral".
    strength = abs(compound)
    score = 1 - strength if label == "neutral" else 0.5 + strength / 2
    return {"label": label, "score": round(score, 4)}


def _best_label(results) -> dict:
    # The API answers [[{label, score}, ...]] for one input; older versions
    # answered [{label, score}, ...]. Take the most likely label either way.
    if results and isinstance(results[0], list):
        results = results[0]
    best = max(results, key=lambda item: item["score"])
    return {"label": best["label"].lower(), "score": round(float(best["score"]), 4)}


def _predict_with_api(text: str) -> dict:
    token = os.getenv("HF_TOKEN")
    if not token:
        raise RuntimeError("HF_TOKEN is not set")
    request = urllib.request.Request(
        HF_API_URL.format(model=_model_name()),
        data=json.dumps({"inputs": text[:MAX_INPUT_CHARS]}).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=HF_API_TIMEOUT_SECONDS) as response:
        return _best_label(json.loads(response.read()))


def predict_emotion(text: str) -> dict:
    backend = emotion_backend()
    if backend == LEXICON:
        return _predict_with_lexicon(text)
    if backend == API:
        try:
            return _predict_with_api(text)
        except Exception:
            # Hugging Face down, slow, or no token: a word-list sentiment is
            # better than none, and the complaint still gets a priority.
            return _predict_with_lexicon(text)
    classifier = load_model()
    result = classifier(text[:MAX_INPUT_CHARS], truncation=True, max_length=512)[0]
    return {"label": result["label"].lower(), "score": round(float(result["score"]), 4)}
