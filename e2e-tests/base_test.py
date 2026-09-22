import json
import ssl
import unittest
import urllib.error
import urllib.request
import uuid
from urllib.parse import urlparse

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait

import config

# The EC2/k3s deployment (CCS-63) uses a self-signed cert - there's no
# domain to get a real one for. Only used for https:// targets; a real
# deployment behind a real cert still gets verified normally.
_INSECURE_SSL_CONTEXT = ssl.create_default_context()
_INSECURE_SSL_CONTEXT.check_hostname = False
_INSECURE_SSL_CONTEXT.verify_mode = ssl.CERT_NONE


class BaseE2ETest(unittest.TestCase):
    """Starts a fresh headless Chrome for every test and checks the app is up first."""

    @classmethod
    def setUpClass(cls):
        cls._check_running(config.SERVER_BASE_URL + "/api/health", "server")
        cls._check_running(config.CLIENT_BASE_URL + "/", "client")

    @staticmethod
    def _check_running(url, name):
        try:
            kwargs = {"timeout": 5}
            if urlparse(url).scheme == "https":
                kwargs["context"] = _INSECURE_SSL_CONTEXT
            with urllib.request.urlopen(url, **kwargs) as response:
                if name == "server" and json.load(response).get("status") != "ok":
                    raise RuntimeError("health check did not report ok")
        except (urllib.error.URLError, OSError, ValueError, RuntimeError) as err:
            raise RuntimeError(
                f"The {name} is not reachable at {url} ({err}). "
                "Start the app first, or set CLIENT_BASE_URL / SERVER_BASE_URL."
            ) from err

    def setUp(self):
        options = webdriver.ChromeOptions()
        if config.HEADLESS:
            options.add_argument("--headless=new")
        options.add_argument("--window-size=1280,900")
        # Same self-signed-cert reason as the health check above.
        options.set_capability("acceptInsecureCerts", True)
        self.driver = webdriver.Chrome(options=options)
        self.addCleanup(self.driver.quit)
        self.wait = WebDriverWait(self.driver, config.TIMEOUT)

    # --- navigation and waiting ---

    def open(self, path):
        self.driver.get(config.CLIENT_BASE_URL + path)

    def current_path(self):
        return urlparse(self.driver.current_url).path

    def wait_for_path(self, path):
        self.wait.until(lambda d: urlparse(d.current_url).path == path)

    def find_visible(self, locator):
        return self.wait.until(EC.visibility_of_element_located(locator))

    def type_into(self, field_id, text):
        field = self.find_visible((By.ID, field_id))
        field.clear()
        field.send_keys(text)

    def click_submit(self):
        self.find_visible((By.CSS_SELECTOR, "form button[type='submit']")).click()

    # --- user journeys shared by the tests ---

    @staticmethod
    def new_credentials():
        """Unique customer details, so tests never collide with earlier runs."""
        token = uuid.uuid4().hex
        # example.com is reserved for examples, so no real inbox is ever used.
        return {"name": "E2E Customer", "email": f"e2e-{token}@example.com", "password": f"E2e-{token[:12]}"}

    def register(self, credentials):
        self.open("/register")
        self.type_into("name", credentials["name"])
        self.type_into("email", credentials["email"])
        self.type_into("password", credentials["password"])
        self.click_submit()
        self.find_visible((By.XPATH, "//h1[normalize-space()='Account created']"))

    def log_in(self, credentials):
        self.open("/login")
        self.type_into("email", credentials["email"])
        self.type_into("password", credentials["password"])
        self.click_submit()
        self.wait_for_path("/customer")

    def register_and_log_in(self):
        credentials = self.new_credentials()
        self.register(credentials)
        self.log_in(credentials)
        return credentials

    def open_new_complaint_form(self):
        # Use the in-app link: the login token lives in memory only, so a full
        # page load of a protected URL would have to restore the session first.
        self.find_visible((By.LINK_TEXT, "Submit a complaint")).click()
        self.wait_for_path("/complaints/new")
