import unittest

from app.priority import determine_priority


class PriorityTests(unittest.TestCase):
    def test_urgent_keyword_wins_even_with_positive_emotion(self):
        priority = determine_priority(
            "product",
            {"label": "positive", "score": 0.9},
            "This looks like fraud on my account, please investigate.",
        )
        self.assertEqual(priority, "Urgent")

    def test_urgent_keyword_match_is_case_insensitive(self):
        priority = determine_priority(
            "billing",
            {"label": "neutral", "score": 0.6},
            "I am considering LEGAL ACTION over this.",
        )
        self.assertEqual(priority, "Urgent")

    def test_high_confidence_negative_emotion_is_high_priority(self):
        priority = determine_priority(
            "product",
            {"label": "negative", "score": 0.95},
            "This is broken and I am extremely angry.",
        )
        self.assertEqual(priority, "High")

    def test_low_confidence_negative_emotion_is_medium_priority(self):
        priority = determine_priority(
            "delivery",
            {"label": "negative", "score": 0.55},
            "The delivery was a bit late.",
        )
        self.assertEqual(priority, "Medium")

    def test_billing_category_is_medium_priority_even_with_calm_tone(self):
        priority = determine_priority(
            "billing",
            {"label": "neutral", "score": 0.6},
            "Can you confirm my last invoice amount?",
        )
        self.assertEqual(priority, "Medium")

    def test_neutral_non_billing_complaint_is_low_priority(self):
        priority = determine_priority(
            "product",
            {"label": "neutral", "score": 0.6},
            "Just checking on the status of my order.",
        )
        self.assertEqual(priority, "Low")

    def test_positive_non_billing_complaint_is_low_priority(self):
        priority = determine_priority(
            "delivery",
            {"label": "positive", "score": 0.9},
            "Everything arrived fine, thanks!",
        )
        self.assertEqual(priority, "Low")


if __name__ == "__main__":
    unittest.main()
