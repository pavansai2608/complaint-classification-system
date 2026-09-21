import unittest

from app.emotion_model import load_model, predict_emotion

KNOWN_LABELS = {"positive", "neutral", "negative"}


class EmotionModelTests(unittest.TestCase):
    def test_loads_the_pretrained_model(self):
        model = load_model()
        self.assertTrue(callable(model))

    def test_detects_negative_emotion_in_an_angry_complaint(self):
        result = predict_emotion(
            "This is absolutely unacceptable, I am furious and demand a refund right now."
        )
        self.assertEqual(result["label"], "negative")
        self.assertGreater(result["score"], 0.5)

    def test_detects_positive_emotion_in_a_thankful_message(self):
        result = predict_emotion("Thank you so much, the delivery was fast and everything works great!")
        self.assertEqual(result["label"], "positive")
        self.assertGreater(result["score"], 0.5)

    def test_result_shape_has_a_known_label_and_a_score_between_0_and_1(self):
        result = predict_emotion("I received the package yesterday.")
        self.assertIn(result["label"], KNOWN_LABELS)
        self.assertGreaterEqual(result["score"], 0)
        self.assertLessEqual(result["score"], 1)

    def test_handles_empty_text_without_crashing(self):
        result = predict_emotion("")
        self.assertIn(result["label"], KNOWN_LABELS)

    def test_truncates_very_long_text_instead_of_failing(self):
        long_text = "This is a very long complaint. " * 500
        result = predict_emotion(long_text)
        self.assertIn(result["label"], KNOWN_LABELS)


if __name__ == "__main__":
    unittest.main()
