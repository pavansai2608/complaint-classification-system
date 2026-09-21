import csv
import re
import unittest
from pathlib import Path

SAMPLE_FILE = Path(__file__).resolve().parents[3] / "data" / "sample_complaints.csv"

COLUMNS = ["text", "expected_category", "expected_sentiment", "expected_priority"]
CATEGORIES = {"billing", "delivery", "product"}
SENTIMENTS = {"negative", "neutral", "positive"}
PRIORITIES = {"Low", "Medium", "High", "Urgent"}


def load_rows():
    with open(SAMPLE_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return reader.fieldnames, list(reader)


class SampleComplaintsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.columns, cls.rows = load_rows()

    def test_has_the_expected_columns(self):
        self.assertEqual(self.columns, COLUMNS)

    def test_has_at_least_50_rows(self):
        self.assertGreaterEqual(len(self.rows), 50)

    def test_every_value_is_allowed(self):
        for row in self.rows:
            self.assertTrue(row["text"].strip(), row)
            self.assertIn(row["expected_category"], CATEGORIES, row)
            self.assertIn(row["expected_sentiment"], SENTIMENTS, row)
            self.assertIn(row["expected_priority"], PRIORITIES, row)

    def test_every_category_has_every_sentiment(self):
        found = {(r["expected_category"], r["expected_sentiment"]) for r in self.rows}
        for category in CATEGORIES:
            for sentiment in SENTIMENTS:
                self.assertIn((category, sentiment), found)

    def test_every_priority_is_used(self):
        self.assertEqual({r["expected_priority"] for r in self.rows}, PRIORITIES)

    def test_no_duplicate_texts(self):
        texts = [r["text"].strip().lower() for r in self.rows]
        self.assertEqual(len(texts), len(set(texts)))

    def test_contains_no_personal_details(self):
        personal = re.compile(r"@|https?://|www\.|\d{5,}")
        for row in self.rows:
            self.assertIsNone(personal.search(row["text"]), row)


if __name__ == "__main__":
    unittest.main()
