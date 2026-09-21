import unittest

from app.category_model import load_model, predict_category

KNOWN_CATEGORIES = {"billing", "delivery", "product"}


class CategoryModelTests(unittest.TestCase):
    def test_loads_the_trained_model(self):
        model = load_model()
        self.assertTrue(hasattr(model, "predict"))

    def test_predicts_a_known_category_for_a_billing_complaint(self):
        category = predict_category("You charged me twice for the same order, please refund the extra charge.")
        self.assertIn(category, KNOWN_CATEGORIES)

    def test_predicts_a_known_category_for_a_delivery_complaint(self):
        category = predict_category("My package was left outside in the rain and never got delivered to my door.")
        self.assertIn(category, KNOWN_CATEGORIES)

    def test_predicts_a_known_category_for_a_product_complaint(self):
        category = predict_category("The item arrived with a cracked screen and missing parts.")
        self.assertIn(category, KNOWN_CATEGORIES)


if __name__ == "__main__":
    unittest.main()
