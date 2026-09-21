import unittest
from unittest.mock import MagicMock, patch

from app.grounding import find_similar_complaints


class GroundingTests(unittest.TestCase):
    def test_returns_similar_descriptions_excluding_exact_match(self):
        mock_collection = MagicMock()
        mock_cursor = [
            {"description": "My package was late", "score": 1.5},
            {"description": "the exact same text", "score": 1.0},
        ]
        mock_collection.find.return_value.sort.return_value.limit.return_value = mock_cursor
        with patch("app.grounding._get_collection", return_value=mock_collection):
            results = find_similar_complaints("the exact same text")
        self.assertEqual(results, ["My package was late"])

    def test_returns_empty_list_on_db_error_instead_of_raising(self):
        with patch("app.grounding._get_collection", side_effect=RuntimeError("no db")):
            results = find_similar_complaints("anything")
        self.assertEqual(results, [])


if __name__ == "__main__":
    unittest.main()
