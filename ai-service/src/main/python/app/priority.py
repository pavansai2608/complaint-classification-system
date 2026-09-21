import json
from functools import lru_cache
from pathlib import Path

AI_SERVICE_ROOT = Path(__file__).resolve().parents[4]
KEYWORDS_PATH = AI_SERVICE_ROOT / "config" / "urgent_keywords.json"

# Emotion score above this counts as "clearly, strongly upset" rather than
# just mildly negative.
HIGH_CONFIDENCE_NEGATIVE = 0.75


@lru_cache(maxsize=1)
def load_urgent_keywords() -> list:
    with open(KEYWORDS_PATH, encoding="utf-8") as f:
        return json.load(f)


def determine_priority(category: str, emotion: dict, text: str) -> str:
    """Priority rules, first match wins:

    1. Urgent: the complaint text contains an urgent keyword (fraud, legal
       action, refund never received, etc.) - these need a human today
       regardless of tone or category.
    2. High: the detected emotion is negative with high confidence - the
       customer is clearly and strongly upset.
    3. Medium: the emotion is negative at any confidence, or the category is
       billing - money issues deserve faster attention even in a calm tone.
    4. Low: everything else (neutral or positive tone, non-billing category).
    """
    lowered_text = text.lower()
    if any(keyword in lowered_text for keyword in load_urgent_keywords()):
        return "Urgent"

    label = emotion.get("label")
    score = emotion.get("score", 0)

    if label == "negative" and score >= HIGH_CONFIDENCE_NEGATIVE:
        return "High"

    if label == "negative" or category == "billing":
        return "Medium"

    return "Low"
