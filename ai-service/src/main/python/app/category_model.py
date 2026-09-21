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


def predict_category(text: str) -> str:
    model = load_model()
    return model.predict([text])[0]
