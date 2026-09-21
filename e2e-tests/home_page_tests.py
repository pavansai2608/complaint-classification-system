import unittest

from selenium.webdriver.common.by import By

from base_test import BaseE2ETest


class HomePageTests(BaseE2ETest):
    def test_page_title_is_shown(self):
        self.open("/")
        self.wait.until(lambda d: d.title == "Complaint Resolution System")

    def test_main_heading_is_shown(self):
        self.open("/")
        heading = self.find_visible((By.TAG_NAME, "h1"))
        self.assertEqual(heading.text, "Complaint Resolution System")

    def test_server_status_shows_ok(self):
        self.open("/")
        status = self.find_visible((By.CSS_SELECTOR, "[data-testid='server-status']"))
        # The page shows "checking" until the health call finishes.
        self.wait.until(lambda d: status.text != "checking")
        self.assertEqual(status.text, "ok")


if __name__ == "__main__":
    unittest.main()
