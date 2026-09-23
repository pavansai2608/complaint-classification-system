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
        # The heading is split across several lines so it can animate in a
        # line at a time, and the exact wording is marketing copy that gets
        # revised. Assert on the part that identifies the page instead of
        # the full string, so a reworded line does not fail the build.
        self.assertIn("Report a problem", heading.text)


if __name__ == "__main__":
    unittest.main()
