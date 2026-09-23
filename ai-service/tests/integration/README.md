# ai-service integration tests

Real HTTP tests against a running `ai-service`, no internal mocking. They
complement `src/unittest/python/analyze_tests.py`, which checks the same
endpoint's contract quickly with everything mocked.

## Run

1. Start the real service (from `ai-service/`), with a real `AI_SERVICE_KEY`
   and the trained model in place:

   ```bash
   AI_SERVICE_KEY=test-service-key uvicorn app.main:app --app-dir src/main/python --host 127.0.0.1 --port 8000
   ```

2. In another terminal:

   ```bash
   cd ai-service
   AI_SERVICE_KEY=test-service-key AI_SERVICE_URL=http://127.0.0.1:8000 \
     python -m unittest tests.integration.analyze_integration_tests -v
   ```

If `GEMINI_API_KEY` and `GROQ_API_KEY` are not set, the suggested reply comes
from the built-in fallback template instead of a live model call - the tests
only check that a reply is returned, not which source it came from.

The suite is skipped automatically (not failed) if the service is not
reachable or `AI_SERVICE_KEY` is not set, so it never breaks a normal `pyb`
run or a machine without the service running.
