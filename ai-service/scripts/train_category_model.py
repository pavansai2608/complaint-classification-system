"""Train the TF-IDF + Logistic Regression complaint category model.

Run from ai-service/:
    .venv/bin/python scripts/train_category_model.py
"""

import datetime
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import Pipeline

AI_SERVICE_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = AI_SERVICE_ROOT / "data"
MODEL_PATH = AI_SERVICE_ROOT / "models" / "category_model.joblib"
EVAL_DIR = AI_SERVICE_ROOT / "eval" / "category_model"

TEXT_COLUMN = "text"
LABEL_COLUMN = "label"


def load_split(name: str) -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / f"customer_complaints_{name}.csv")
    return df.dropna(subset=[TEXT_COLUMN, LABEL_COLUMN])


def build_pipeline() -> Pipeline:
    return Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, stop_words="english")),
            ("clf", LogisticRegression(max_iter=1000, class_weight="balanced")),
        ]
    )


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
    train_df = load_split("train")
    val_df = load_split("validation")
    test_df = load_split("test")

    # Use train+validation together as the training pool (cross-validated
    # below), keep test fully held out for the final, honest evaluation.
    train_pool = pd.concat([train_df, val_df], ignore_index=True)
    print(f"Training pool: {len(train_pool)} rows, held-out test: {len(test_df)} rows")
    print(train_pool[LABEL_COLUMN].value_counts())

    X_train, y_train = train_pool[TEXT_COLUMN], train_pool[LABEL_COLUMN]
    X_test, y_test = test_df[TEXT_COLUMN], test_df[LABEL_COLUMN]

    pipeline = build_pipeline()
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, scoring="accuracy")

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    labels_sorted = sorted(y_train.unique())
    matrix = confusion_matrix(y_test, y_pred, labels=labels_sorted)

    lines = [
        f"Category model evaluation - {datetime.datetime.now().isoformat()}",
        "Dataset: hblim/customer-complaints (Hugging Face, MIT license)",
        f"Training pool: {len(X_train)} rows (train+validation), held-out test: {len(X_test)} rows",
        f"\n5-fold cross-validation accuracy on training pool: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})",
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
