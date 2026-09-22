"""Evaluation harness for the suggested-reply feature (CCS-55).

Run from ai-service/ once GEMINI_API_KEY and MONGODB_URI are set in .env:
    .venv/bin/python eval/suggested_reply/run_reply_eval.py

This is a continuous eval loop, not a one-time check: rerun it after any
change to the prompt wording, the grounding lookup, or the Gemini model
version, and compare the new report's per-sample scores against the
previous report (kept, never overwritten) - a change that raises the
average but quietly drops one sample's score is a regression, not an
improvement.
"""
import datetime
import json
import sys
import time
from pathlib import Path

AI_SERVICE_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(AI_SERVICE_ROOT / "src" / "main" / "python"))

from app.reply_generator import (  # noqa: E402
    PROMPT_VERSION,
    _client,
    _groq_client,
    _groq_model_name,
    _model_name,
    generate_suggested_reply,
)
from google.genai import types  # noqa: E402

EVAL_DIR = Path(__file__).resolve().parent
SAMPLES_PATH = EVAL_DIR / "sample_complaints.json"

JUDGE_INSTRUCTION = (
    "You are grading a customer support reply against a list of expected "
    "qualities. Score from 1 (fails badly) to 5 (meets all qualities "
    "well). Reply with only the number, nothing else."
)


def _parse_score(text: str) -> int:
    try:
        return int((text or "").strip().split()[0])
    except (ValueError, IndexError):
        return 0


def _judge_with_gemini(prompt: str) -> str:
    client = _client()
    response = client.models.generate_content(
        model=_model_name(),
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=JUDGE_INSTRUCTION,
            temperature=0,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
            http_options=types.HttpOptions(timeout=10_000),
        ),
    )
    return response.text or ""


def _judge_with_groq(prompt: str) -> str:
    client = _groq_client()
    response = client.chat.completions.create(
        model=_groq_model_name(),
        messages=[
            {"role": "system", "content": JUDGE_INSTRUCTION},
            {"role": "user", "content": prompt},
        ],
        temperature=0,
        max_tokens=50,
        reasoning_effort="low",
        timeout=10,
    )
    return response.choices[0].message.content or ""


def judge_reply(complaint_text: str, reply: str, expected_qualities: list) -> int:
    # Same Gemini-then-Groq fallback as generate_suggested_reply, so the
    # eval can still run once Gemini's daily free-tier quota is exhausted.
    qualities = "\n".join(f"- {q}" for q in expected_qualities)
    prompt = (
        f"Customer complaint: {complaint_text}\n\n"
        f"Agent reply to grade: {reply}\n\n"
        f"Expected qualities:\n{qualities}\n\n"
        "Score (1-5):"
    )
    try:
        return _parse_score(_judge_with_gemini(prompt))
    except Exception:
        try:
            return _parse_score(_judge_with_groq(prompt))
        except Exception:
            return 0


def main():
    samples = json.loads(SAMPLES_PATH.read_text())
    scores = []
    body_lines = []

    for sample in samples:
        result = generate_suggested_reply(sample["text"], sample["category"], sample["priority"])
        # The free tier allows 5 requests/minute; each sample makes 2 calls
        # (generate + judge), so pace them to stay under that.
        time.sleep(13)
        score = judge_reply(sample["text"], result["reply"], sample["expected_qualities"])
        scores.append(score)
        time.sleep(13)
        body_lines.append(
            f"Sample {sample['id']} ({sample['category']}, {sample['priority']}) "
            f"- source={result['source']}, score={score}/5"
        )
        body_lines.append(f"  Reply: {result['reply']}")
        body_lines.append("")

    average = sum(scores) / len(scores) if scores else 0
    header = [
        f"Suggested-reply evaluation - {datetime.datetime.now().isoformat()}",
        f"Prompt version: {PROMPT_VERSION}, model: {_model_name()}",
        f"Average score: {average:.2f}/5 across {len(scores)} samples",
        "",
    ]
    lines = header + body_lines

    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    report_path = EVAL_DIR / f"report_{timestamp}.txt"
    report_path.write_text("\n".join(lines))
    print("\n".join(lines))
    print(f"\nSaved report to {report_path}")


if __name__ == "__main__":
    main()
