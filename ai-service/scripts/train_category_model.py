"""Train the TF-IDF + Logistic Regression complaint category model.

Run from ai-service/ (EDA first, then training):
    .venv/bin/python scripts/eda_category_model.py
    .venv/bin/python scripts/train_category_model.py
"""

import datetime
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import GridSearchCV
from sklearn.pipeline import Pipeline

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = AI_SERVICE_ROOT / "data"
MODEL_PATH = AI_SERVICE_ROOT / "models" / "category_model.joblib"
EVAL_DIR = AI_SERVICE_ROOT / "eval" / "category_model"

TEXT_COLUMN = "text"
LABEL_COLUMN = "label"


def load_clean_splits():
    """Load train/validation/test, then remove data-quality problems found by
    the EDA script: rows where the same complaint text has different labels
    across splits, and exact duplicate rows that leak across the train/test
    boundary. Both are dropped globally so a given text appears in exactly
    one split, with one label.
    """
    frames = []
    for split in ("train", "validation", "test"):
        df = pd.read_csv(DATA_DIR / f"customer_complaints_{split}.csv").dropna(subset=[TEXT_COLUMN, LABEL_COLUMN])
        df["split"] = split
        frames.append(df)
    combined = pd.concat(frames, ignore_index=True)

    label_counts_per_text = combined.groupby(TEXT_COLUMN)[LABEL_COLUMN].nunique()
    ambiguous_texts = set(label_counts_per_text[label_counts_per_text > 1].index)
    combined = combined[~combined[TEXT_COLUMN].isin(ambiguous_texts)]

    combined = combined.drop_duplicates(subset=[TEXT_COLUMN], keep="first")

    return (
        combined[combined["split"] == "train"],
        combined[combined["split"] == "validation"],
        combined[combined["split"] == "test"],
        len(ambiguous_texts),
    )


def build_pipeline() -> Pipeline:
    return Pipeline(
        [
            ("tfidf", TfidfVectorizer(stop_words="english")),
            ("clf", LogisticRegression(max_iter=1000, class_weight="balanced")),
        ]
    )


def tune(X_train, y_train) -> GridSearchCV:
    param_grid = {
        "tfidf__ngram_range": [(1, 1), (1, 2)],
        "tfidf__min_df": [1, 2],
        "clf__C": [0.1, 1, 5, 10],
    }
    search = GridSearchCV(build_pipeline(), param_grid, cv=5, scoring="accuracy", n_jobs=-1)
    search.fit(X_train, y_train)
    return search


def error_analysis(y_test, y_pred, lines):
    lines.append("\n=== Error analysis: worst-performing categories ===")
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    per_class = {label: m for label, m in report.items() if label not in ("accuracy", "macro avg", "weighted avg")}
    worst = sorted(per_class.items(), key=lambda kv: kv[1]["f1-score"])[:2]
    for label, m in worst:
        lines.append(f"{label}: F1={m['f1-score']:.3f}, precision={m['precision']:.3f}, recall={m['recall']:.3f}")


def bias_check(y_test, y_pred, texts_test, lines):
    y_test = pd.Series(y_test).reset_index(drop=True)
    y_pred = pd.Series(y_pred)
    correct = y_test == y_pred

    lines.append("\n=== Bias/fairness sanity check: error rate by complaint length ===")
    lengths = texts_test.str.len().reset_index(drop=True)
    buckets = pd.cut(lengths, bins=[0, 25, 45, 1000], labels=["short (<25 chars)", "medium (25-45)", "long (45+)"])
    for bucket, group in pd.DataFrame({"bucket": buckets, "correct": correct}).groupby("bucket", observed=True):
        lines.append(f"{bucket}: n={len(group)}, error rate={1 - group['correct'].mean():.3f}")

    lines.append("\n=== Bias/fairness sanity check: error rate by category ===")
    for label, group in pd.DataFrame({"true": y_test, "correct": correct}).groupby("true", observed=True):
        lines.append(f"{label}: n={len(group)}, error rate={1 - group['correct'].mean():.3f}")


def interpretability(pipeline: Pipeline, lines, top_n=10):
    lines.append("\n=== Interpretability: top TF-IDF-weighted words per category ===")
    vectorizer = pipeline.named_steps["tfidf"]
    clf = pipeline.named_steps["clf"]
    feature_names = vectorizer.get_feature_names_out()
    for i, label in enumerate(clf.classes_):
        top_indices = clf.coef_[i].argsort()[-top_n:][::-1]
        top_words = [feature_names[j] for j in top_indices]
        lines.append(f"{label}: {', '.join(top_words)}")


def main():
    train_df, val_df, test_df, ambiguous_dropped = load_clean_splits()
    train_pool = pd.concat([train_df, val_df], ignore_index=True)
    print(f"Dropped {ambiguous_dropped} ambiguous-label texts and de-duplicated across splits")
    print(f"Training pool: {len(train_pool)} rows, held-out test: {len(test_df)} rows")
    print(train_pool[LABEL_COLUMN].value_counts())

    X_train, y_train = train_pool[TEXT_COLUMN], train_pool[LABEL_COLUMN]
    X_test, y_test = test_df[TEXT_COLUMN], test_df[LABEL_COLUMN]

    search = tune(X_train, y_train)
    pipeline = search.best_estimator_
    y_pred = pipeline.predict(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    labels_sorted = sorted(y_train.unique())
    matrix = confusion_matrix(y_test, y_pred, labels=labels_sorted)

    lines = [
        f"Category model evaluation - {datetime.datetime.now().isoformat()}",
        "Dataset: hblim/customer-complaints (Hugging Face, MIT license)",
        f"Preprocessing: dropped {ambiguous_dropped} texts with conflicting labels across splits, "
        "de-duplicated exact-match complaint text globally so no text leaks across train/test.",
        f"Training pool: {len(X_train)} rows (train+validation), held-out test: {len(X_test)} rows",
        f"\nHyperparameter search (5-fold CV grid search over ngram_range, min_df, C):",
        f"Best params: {search.best_params_}",
        f"Best cross-validation accuracy on training pool: {search.best_score_:.3f}",
        f"\nHeld-out test set accuracy: {accuracy:.3f}",
        "\n=== Classification report ===",
        classification_report(y_test, y_pred, zero_division=0),
        "=== Confusion matrix ===",
        f"Labels (row=true, col=predicted): {labels_sorted}",
        str(matrix),
    ]

    error_analysis(y_test, y_pred, lines)
    bias_check(y_test, y_pred, X_test, lines)
    interpretability(pipeline, lines)

    EVAL_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    report_path = EVAL_DIR / f"report_{timestamp}.txt"
    report_path.write_text("\n".join(lines))
    print(f"\nSaved evaluation report to {report_path}")

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Saved trained model to {MODEL_PATH}")


if __name__ == "__main__":
    main()
