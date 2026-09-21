import os
from functools import lru_cache
from pathlib import Path

import joblib

AI_SERVICE_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_MODEL_PATH = AI_SERVICE_ROOT / "models" / "category_model.joblib"


def _model_path() -> Path:
    override = os.getenv("CATEGORY_MODEL_PATH")
    return Path(override) if override else DEFAULT_MODEL_PATH


@lru_cache(maxsize=1)
def load_model():
    return joblib.load(_model_path())


def predict_category_with_confidence(text: str) -> tuple:
    """Returns (category, confidence) - confidence is the model's own
    probability for the category it picked, so a caller can tell a
    confident guess from a shaky one.
    """
    model = load_model()
    probabilities = model.predict_proba([text])[0]
    best_index = probabilities.argmax()
    return model.classes_[best_index], float(probabilities[best_index])


def predict_category(text: str) -> str:
    category, _ = predict_category_with_confidence(text)
    return category
