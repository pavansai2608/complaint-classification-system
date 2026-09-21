import os

from dotenv import load_dotenv

# Values already set in the shell win over the .env file.
load_dotenv()

CLIENT_BASE_URL = os.environ.get("CLIENT_BASE_URL", "http://localhost:5173").rstrip("/")
SERVER_BASE_URL = os.environ.get("SERVER_BASE_URL", "http://localhost:4000").rstrip("/")
HEADLESS = os.environ.get("E2E_HEADLESS", "true").lower() != "false"
TIMEOUT = float(os.environ.get("E2E_TIMEOUT", "10"))
