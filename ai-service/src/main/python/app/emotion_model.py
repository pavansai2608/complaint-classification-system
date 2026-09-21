import os
from functools import lru_cache

from transformers import pipeline

# Pretrained (not fine-tuned by us): 3-class sentiment, trained on the
# multilingual-sentiments dataset. Labels are positive/neutral/negative.
DEFAULT_MODEL_NAME = "lxyuan/distilbert-base-multilingual-cased-sentiments-student"

# Complaint descriptions are capped at 2000 chars in the schema; the
# tokenizer's own truncation=True below is the real safety net, this is
# just a cheap first cut so we never tokenize something huge.
MAX_INPUT_CHARS = 2000


def _model_name() -> str:
    return os.getenv("EMOTION_MODEL_NAME", DEFAULT_MODEL_NAME)


@lru_cache(maxsize=1)
def load_model():
    return pipeline("sentiment-analysis", model=_model_name())


def predict_emotion(text: str) -> dict:
    classifier = load_model()
    result = classifier(text[:MAX_INPUT_CHARS], truncation=True, max_length=512)[0]
    return {"label": result["label"].lower(), "score": round(float(result["score"]), 4)}
