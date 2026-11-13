import os
from functools import lru_cache

# Two ways to read the tone of a complaint, picked with EMOTION_BACKEND:
#
# - "transformer" (default): a pretrained DistilBERT model (not fine-tuned
#   by us), 3-class sentiment trained on the multilingual-sentiments
#   dataset.
# - "lexicon": VADER, a word list with rules for negation, capitals and
#   "!!!". English only.
#
# Both return the same shape: {"label": positive|neutral|negative, "score"}.
DEFAULT_MODEL_NAME = "lxyuan/distilbert-base-multilingual-cased-sentiments-student"
TRANSFORMER = "transformer"
LEXICON = "lexicon"

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
    return LEXICON if backend == LEXICON else TRANSFORMER


@lru_cache(maxsize=1)
def load_model():
    # Imported here, not at the top, so the lexicon option never loads
    # PyTorch.
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


def predict_emotion(text: str) -> dict:
    if emotion_backend() == LEXICON:
        return _predict_with_lexicon(text)
    classifier = load_model()
    result = classifier(text[:MAX_INPUT_CHARS], truncation=True, max_length=512)[0]
    return {"label": result["label"].lower(), "score": round(float(result["score"]), 4)}
