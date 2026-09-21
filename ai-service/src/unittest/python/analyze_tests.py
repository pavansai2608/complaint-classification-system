import os
import unittest
from unittest.mock import patch

os.environ.setdefault("AI_SERVICE_KEY", "test-service-key")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)

VALID_HEADERS = {"X-Service-Key": "test-service-key"}


class AnalyzeAuthTests(unittest.TestCase):
    def test_missing_service_key_returns_401(self):
        response = client.post("/analyze", json={"text": "I was charged twice"})
        self.assertEqual(response.status_code, 401)

    def test_wrong_service_key_returns_401(self):
        response = client.post(
            "/analyze", json={"text": "I was charged twice"}, headers={"X-Service-Key": "wrong-key"}
        )
        self.assertEqual(response.status_code, 401)


class AnalyzeValidationTests(unittest.TestCase):
    def test_empty_text_returns_422(self):
        response = client.post("/analyze", json={"text": ""}, headers=VALID_HEADERS)
        self.assertEqual(response.status_code, 422)

    def test_blank_after_trim_returns_422(self):
        response = client.post("/analyze", json={"text": "   "}, headers=VALID_HEADERS)
        self.assertEqual(response.status_code, 422)

    def test_missing_text_field_returns_422(self):
        response = client.post("/analyze", json={}, headers=VALID_HEADERS)
        self.assertEqual(response.status_code, 422)

    def test_oversized_text_returns_422(self):
        response = client.post("/analyze", json={"text": "x" * 2001}, headers=VALID_HEADERS)
        self.assertEqual(response.status_code, 422)


class AnalyzeSuccessTests(unittest.TestCase):
    def test_valid_complaint_returns_all_four_results(self):
        with patch("app.main.predict_category_with_confidence", return_value=("billing", 0.9)), patch(
            "app.main.predict_emotion", return_value={"label": "negative", "score": 0.8}
        ), patch("app.main.determine_priority", return_value="Medium"), patch(
            "app.main.generate_suggested_reply", return_value={"reply": "We're on it.", "source": "gemini"}
        ):
            response = client.post(
                "/analyze", json={"text": "I was charged twice for the same order"}, headers=VALID_HEADERS
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["category"], "billing")
        self.assertEqual(body["emotion"], {"label": "negative", "score": 0.8})
        self.assertEqual(body["priority"], "Medium")
        self.assertEqual(body["suggestedReply"], "We're on it.")

    def test_high_confidence_prediction_does_not_need_review(self):
        with patch("app.main.predict_category_with_confidence", return_value=("billing", 0.9)), patch(
            "app.main.predict_emotion", return_value={"label": "neutral", "score": 0.6}
        ), patch("app.main.determine_priority", return_value="Low"), patch(
            "app.main.generate_suggested_reply", return_value={"reply": "Thanks.", "source": "gemini"}
        ):
            response = client.post("/analyze", json={"text": "Just checking my order status"}, headers=VALID_HEADERS)

        self.assertEqual(response.json()["needsReview"], False)

    def test_low_confidence_prediction_needs_review(self):
        with patch("app.main.predict_category_with_confidence", return_value=("product", 0.4)), patch(
            "app.main.predict_emotion", return_value={"label": "neutral", "score": 0.5}
        ), patch("app.main.determine_priority", return_value="Low"), patch(
            "app.main.generate_suggested_reply", return_value={"reply": "Thanks.", "source": "gemini"}
        ):
            response = client.post("/analyze", json={"text": "Not sure what category this is"}, headers=VALID_HEADERS)

        self.assertEqual(response.json()["needsReview"], True)


if __name__ == "__main__":
    unittest.main()
