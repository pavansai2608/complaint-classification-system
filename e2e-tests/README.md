# End-to-end tests

Browser tests that drive the real React app with Selenium and headless Chrome. They register a customer, log in, and use the complaint form the way a person would.

Written in Python with the standard `unittest` module, like the other Python project in this repo.

## What is tested

| File | Covers |
|---|---|
| `complaint_submission_tests.py` | A customer registers, logs in, submits a valid complaint and sees "Complaint submitted" on `/customer`. A too-short title shows a validation error and stays on `/complaints/new`. |

## Before you start

- Python 3.11+
- Google Chrome installed (Selenium downloads a matching driver by itself the first time it runs)
- The app running locally, with a **development** database: server on `http://localhost:4000`, client on `http://localhost:5173` (see the root [README](../README.md))

## Quick start

From this folder:

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # optional, only if your URLs differ
python -m unittest discover -p "*_tests.py" -v
```

Run a single file or test:

```bash
python -m unittest complaint_submission_tests -v
python -m unittest complaint_submission_tests.ComplaintSubmissionTests.test_too_short_title_shows_error_and_stays_on_form -v
```

## Configuration

Set these in the shell or in `.env` (a value set in the shell wins). Defaults are in `.env.example`.

| Variable | Default | Meaning |
|---|---|---|
| `CLIENT_BASE_URL` | `http://localhost:5173` | Where the React app is running |
| `SERVER_BASE_URL` | `http://localhost:4000` | Where the Express API is running |
| `E2E_HEADLESS` | `true` | Set to `false` to watch the browser |
| `E2E_TIMEOUT` | `10` | Seconds to wait for a page or element |

If the client or server is not reachable, the run stops straight away with a message saying which one.

## Things to know

- **Test data stays behind.** Each test registers a new customer (`e2e-<random>@example.com`). The app has no delete endpoint yet, so point the server at a development database, never a real one.
- **Login is rate limited** to 10 attempts per 15 minutes per IP, and each test logs in once. If tests suddenly fail at login, wait or restart the server.
- **No fixed passwords.** Passwords are random per test, so nothing secret is stored in the repo.

## Adding a test

1. Create `<topic>_tests.py` in this folder with a class that extends `BaseE2ETest` from `base_test.py`.
2. Use the helpers there (`register_and_log_in`, `type_into`, `click_submit`, `wait_for_path`) instead of fixed sleeps.
3. Find elements by `id`, link text or `role`, the same way the React pages label them.
