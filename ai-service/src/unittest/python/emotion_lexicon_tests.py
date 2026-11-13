import os
import unittest
from unittest import mock

from app.emotion_model import emotion_backend, predict_emotion
from app.priority import determine_priority

KNOWN_LABELS = {"positive", "neutral", "negative"}


@mock.patch.dict(os.environ, {"EMOTION_BACKEND": "lexicon"})
class EmotionLexiconTests(unittest.TestCase):
    def test_backend_setting_selects_the_lexicon(self):
        self.assertEqual(emotion_backend(), "lexicon")

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

    def test_flat_text_is_neutral(self):
        self.assertEqual(predict_emotion("I received the package yesterday.")["label"], "neutral")

    def test_score_is_between_0_and_1_for_any_text(self):
        for text in ["", "ok", "worst service ever!!!", "This is a very long complaint. " * 500]:
            result = predict_emotion(text)
            self.assertIn(result["label"], KNOWN_LABELS)
            self.assertGreaterEqual(result["score"], 0)
            self.assertLessEqual(result["score"], 1)

    def test_strongly_angry_complaint_reaches_high_priority(self):
        text = "This is absolutely unacceptable, I am furious and demand a refund right now."
        self.assertEqual(determine_priority("delivery", predict_emotion(text), text), "High")

    def test_problem_phrase_without_feeling_words_is_negative(self):
        result = predict_emotion("Delivery marked complete but nothing arrived.")
        self.assertEqual(result["label"], "negative")

    def test_polite_words_do_not_make_a_complaint_positive(self):
        result = predict_emotion("I was charged twice for my order, please refund the extra charge.")
        self.assertEqual(result["label"], "negative")

    def test_problem_phrase_alone_gives_medium_priority(self):
        text = "My package never arrived."
        self.assertEqual(determine_priority("delivery", predict_emotion(text), text), "Medium")

    def test_curly_apostrophe_in_a_problem_phrase_is_recognised(self):
        self.assertEqual(predict_emotion("The app won\u2019t load.")["label"], "negative")

    def test_does_not_load_the_transformer_model(self):
        with mock.patch("app.emotion_model.load_model") as load_model:
            predict_emotion("The parcel was late.")
        load_model.assert_not_called()


class EmotionBackendDefaultTests(unittest.TestCase):
    def test_defaults_to_the_transformer(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("EMOTION_BACKEND", None)
            self.assertEqual(emotion_backend(), "transformer")

    def test_unknown_value_falls_back_to_the_transformer(self):
        with mock.patch.dict(os.environ, {"EMOTION_BACKEND": "something-else"}):
            self.assertEqual(emotion_backend(), "transformer")


if __name__ == "__main__":
    unittest.main()
