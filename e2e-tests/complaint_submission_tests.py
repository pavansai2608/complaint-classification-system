import unittest

from selenium.webdriver.common.by import By

from base_test import BaseE2ETest


class ComplaintSubmissionTests(BaseE2ETest):
    def test_customer_can_submit_a_valid_complaint(self):
        self.register_and_log_in()
        self.open_new_complaint_form()

        self.type_into("title", "Parcel arrived damaged")
        self.type_into("description", "The box was crushed and the item inside was broken.")
        self.type_into("orderReference", "ORD-E2E-1001")
        self.click_submit()

        self.wait_for_path("/customer")
        confirmation = self.find_visible((By.CSS_SELECTOR, "[role='status']"))
        self.assertIn("Complaint submitted", confirmation.text)

    def test_too_short_title_shows_error_and_stays_on_form(self):
        self.register_and_log_in()
        self.open_new_complaint_form()

        self.type_into("title", "abc")
        self.type_into("description", "The box was crushed and the item inside was broken.")
        self.click_submit()

        error = self.find_visible((By.ID, "title-error"))
        self.assertIn("Title must be 5 to 120 characters", error.text)
        self.assertEqual(self.current_path(), "/complaints/new")
        self.assertEqual(self.driver.find_elements(By.CSS_SELECTOR, "[role='status']"), [])


if __name__ == "__main__":
    unittest.main()
