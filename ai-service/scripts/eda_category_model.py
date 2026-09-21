"""Exploratory data analysis on the category-model dataset, run once before training.

Run from ai-service/:
    .venv/bin/python scripts/eda_category_model.py
"""

from collections import Counter
from pathlib import Path

import pandas as pd

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = AI_SERVICE_ROOT / "data"
EDA_REPORT_PATH = AI_SERVICE_ROOT / "eval" / "category_model" / "eda_report.txt"

TEXT_COLUMN = "text"
LABEL_COLUMN = "label"
STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "to", "of", "in", "on",
    "for", "with", "my", "i", "it", "this", "that", "at", "not", "be", "you", "your", "me",
}


def load_all() -> pd.DataFrame:
    frames = []
    for split in ("train", "validation", "test"):
        df = pd.read_csv(DATA_DIR / f"customer_complaints_{split}.csv")
        df["split"] = split
        frames.append(df)
    return pd.concat(frames, ignore_index=True)


def top_words(texts: pd.Series, n: int = 10) -> list[str]:
    counts = Counter()
    for text in texts:
        words = [w.strip(".,!?'\"").lower() for w in str(text).split()]
        counts.update(w for w in words if w and w not in STOP_WORDS)
    return [word for word, _ in counts.most_common(n)]


def main():
    df = load_all()
    lines = [f"Category model EDA - {len(df)} total rows across train/validation/test"]

    lines.append("\n=== Rows per split ===")
    for split, count in df["split"].value_counts().items():
        lines.append(f"{split}: {count}")

    lines.append("\n=== Missing values ===")
    lines.append(str(df[[TEXT_COLUMN, LABEL_COLUMN]].isna().sum().to_dict()))

    duplicate_count = df.duplicated(subset=[TEXT_COLUMN]).sum()
    lines.append(f"\n=== Duplicate complaint text rows: {duplicate_count} ===")

    label_counts_per_text = df.groupby(TEXT_COLUMN)[LABEL_COLUMN].nunique()
    ambiguous_texts = label_counts_per_text[label_counts_per_text > 1]
    lines.append(f"\n=== Same text, different label across rows (ambiguous): {len(ambiguous_texts)} ===")
    for text in ambiguous_texts.index:
        labels = df.loc[df[TEXT_COLUMN] == text, LABEL_COLUMN].unique()
        lines.append(f'"{text}" -> {list(labels)}')

    cross_split = df[df.duplicated(subset=[TEXT_COLUMN], keep=False)].groupby(TEXT_COLUMN)["split"].nunique()
    leaked = (cross_split > 1).sum()
    lines.append(f"\n=== Duplicate texts spanning more than one split (train/test leakage): {leaked} ===")

    lines.append("\n=== Class balance (all splits combined) ===")
    counts = df[LABEL_COLUMN].value_counts()
    proportions = df[LABEL_COLUMN].value_counts(normalize=True).round(3)
    for label in counts.index:
        lines.append(f"{label}: {counts[label]} rows ({proportions[label]:.1%})")

    lines.append("\n=== Complaint text length (characters) ===")
    lengths = df[TEXT_COLUMN].str.len()
    lines.append(f"min={lengths.min()}, max={lengths.max()}, mean={lengths.mean():.1f}, median={lengths.median():.1f}")

    lines.append("\n=== Complaint text length by category ===")
    for label, group in df.groupby(LABEL_COLUMN):
        group_lengths = group[TEXT_COLUMN].str.len()
        lines.append(f"{label}: mean={group_lengths.mean():.1f}, median={group_lengths.median():.1f}")

    lines.append("\n=== Most common words per category (raw word counts, not TF-IDF) ===")
    for label, group in df.groupby(LABEL_COLUMN):
        lines.append(f"{label}: {', '.join(top_words(group[TEXT_COLUMN]))}")

    EDA_REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    EDA_REPORT_PATH.write_text("\n".join(lines))
    print("\n".join(lines))
    print(f"\nSaved EDA report to {EDA_REPORT_PATH}")


if __name__ == "__main__":
    main()
