import io
import json
import os
import unittest
from unittest import mock

from app.emotion_model import emotion_backend, predict_emotion

ANSWER = [[{"label": "negative", "score": 0.91}, {"label": "neutral", "score": 0.06}, {"label": "positive", "score": 0.03}]]


def fake_response(payload):
    response = mock.MagicMock()
    response.__enter__.return_value = io.BytesIO(json.dumps(payload).encode("utf-8"))
    return response


@mock.patch.dict(os.environ, {"EMOTION_BACKEND": "api", "HF_TOKEN": "test-token"})
class EmotionApiTests(unittest.TestCase):
    def test_backend_setting_selects_the_api(self):
        self.assertEqual(emotion_backend(), "api")

    def test_returns_the_most_likely_label_from_the_model(self):
        with mock.patch("urllib.request.urlopen", return_value=fake_response(ANSWER)):
            self.assertEqual(predict_emotion("I was charged twice!"), {"label": "negative", "score": 0.91})

    def test_also_reads_the_older_flat_answer_shape(self):
        with mock.patch("urllib.request.urlopen", return_value=fake_response(ANSWER[0])):
            self.assertEqual(predict_emotion("I was charged twice!")["label"], "negative")

    def test_sends_the_token_and_the_model_name(self):
        with mock.patch("urllib.request.urlopen", return_value=fake_response(ANSWER)) as urlopen:
            predict_emotion("Late parcel.")
        sent = urlopen.call_args.args[0]
        self.assertEqual(sent.get_header("Authorization"), "Bearer test-token")
        self.assertIn("distilbert-base-multilingual-cased-sentiments-student", sent.full_url)

    def test_falls_back_to_the_word_list_when_the_api_fails(self):
        with mock.patch("urllib.request.urlopen", side_effect=OSError("down")):
            result = predict_emotion("This is absolutely unacceptable, I am furious.")
        self.assertEqual(result["label"], "negative")

    def test_falls_back_without_calling_the_api_when_there_is_no_token(self):
        with mock.patch.dict(os.environ, {"HF_TOKEN": ""}), mock.patch("urllib.request.urlopen") as urlopen:
            result = predict_emotion("Thank you, everything works great!")
        urlopen.assert_not_called()
        self.assertEqual(result["label"], "positive")

    def test_never_loads_pytorch(self):
        with mock.patch("urllib.request.urlopen", return_value=fake_response(ANSWER)), mock.patch(
            "app.emotion_model.load_model"
        ) as load_model:
            predict_emotion("Late parcel.")
        load_model.assert_not_called()


if __name__ == "__main__":
    unittest.main()
