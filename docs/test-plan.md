# Test plan

How we test the complaint system: what is covered, with which tools, where it runs, and when a piece of work counts as tested.

## 1. Scope

**In scope**

| Area | What it is |
|---|---|
| `client/` | React app: register, login, complaint forms, complaint list, agent queue, admin dashboard |
| `server/` | Express API: auth, roles, complaints, the call to the analysis service |
| `ai-service/` | Python service: category, emotion, priority, suggested reply, `/analyze` |
| Whole system | The three services together in a real browser, and their security |

**Out of scope:** the internal code of third-party libraries, GitHub itself, and load or performance testing (not needed for this project size).

## 2. Test levels and tools

| Level | What it checks | Tool | Where |
|---|---|---|---|
| Unit and component (client) | One component or helper, with the API mocked | Vitest + Testing Library + jsdom | `client/src/**/*.test.jsx` |
| Unit and API (server) | Services, middleware, validators and each route, with the database mocked | Jest + Supertest | `server/tests/` |
| Unit and API (ai-service) | Model loading, prediction, rules, and the FastAPI routes | `unittest` + FastAPI `TestClient`, run by PyBuilder (`pyb`) | `ai-service/src/unittest/python/*_tests.py` |
| End-to-end | A real user journey in a real browser against the running app | Selenium + `unittest`, headless Chrome | `e2e-tests/` |
| Security scans | Known weaknesses in code, packages, images and the running app | OWASP ZAP, `npm audit`, `pip-audit`, Trivy, Dependabot | CI pipeline and GitHub |
| Model quality | Does the model still predict well? | Evaluation report and sample data | `ai-service/eval/`, `ai-service/data/sample_complaints.csv` |

Rule: every feature card includes its own unit and API tests in the same change. Broader checks (end-to-end, API verification, security tests) are separate cards.

## 3. What we test first (risk order)

Focus on what would hurt most if it broke:

1. **Access control:** a customer cannot read another customer's complaint or open agent or admin routes. Wrong or expired tokens get 401, wrong role gets 403.
2. **Login and tokens:** wrong passwords, account lock, refresh, logout, and odd inputs such as objects instead of text.
3. **Complaint flow:** submit, validation errors (title 5 to 120 characters, description 10 to 2000), list, detail, and status changes by an agent.
4. **Analysis results:** the category, emotion, priority and reply are saved and shown, and the complaint is still saved if the analysis service is down.
5. **Prompt injection:** complaint text that tries to change the reply model's instructions must not change its behaviour.
6. **Security boundaries:** the analysis service rejects calls without its service key, and bad input returns 422.

Skipped on purpose: framework code, simple getters, and pure styling.

## 4. Test data

- No real customer data anywhere. Sample complaints are made up (`ai-service/data/sample_complaints.csv`, 66 rows).
- End-to-end tests create a new customer each run (`e2e-<random>@example.com`, random password), so runs never clash.
- Automated tests only run against a development database, never a real one.

## 5. Environments

| Environment | Used for | Card |
|---|---|---|
| Local machine | Daily development and all test levels | |
| Jenkins CI | Runs all tests on every push, then builds images and scans them | CCS-50, CCS-61 |
| Minikube | Full system in containers, end-to-end and ZAP scan | CCS-60 |
| AWS EC2 with k3s | Final deployed check before the demo | CCS-63 |

## 6. How to run everything

```bash
cd server && npm test
cd client && npm test
cd ai-service && source .venv/bin/activate && pyb
cd e2e-tests && python -m unittest discover -p "*_tests.py" -v
```

The end-to-end tests need the client and server running first. See [e2e-tests/README.md](../e2e-tests/README.md).

## 7. Entry and exit criteria

**A piece of work can be tested when:**
- it is on a feature branch and the code builds
- dependencies are installed and `.env` files exist (from `.env.example`)
- the app and its database are running (for end-to-end and API checks)

**A piece of work counts as tested (exit) when:**
- its own unit and API tests exist and all tests in the project pass
- the card's "done when" line was checked by running it, not assumed
- the security review of the change is done, with no open High finding
- any new error case (bad input, no login, wrong role) has a test
- for a release: the end-to-end journeys pass and the scans show no open High or Critical issue

## 8. Coverage targets

These are goals, not yet measured. Coverage tools still need to be switched on (see gaps).

| Area | Target |
|---|---|
| Server services, middleware, validators | 80% of lines |
| Client pages and routes | 70% of lines |
| ai-service code | 80% of lines |
| User journeys | every story has at least one end-to-end test |

## 9. Current state and gaps

Today: 10 server test files, 9 client test files, 3 ai-service test files and 1 end-to-end file (2 tests).

| Gap | Why it matters | Card |
|---|---|---|
| Server tests use a fake database | Problems such as duplicate emails are not tested against a real MongoDB | needs a decision, see below |
| End-to-end covers only complaint submission | Login errors, my complaints, agent queue and role protection are not covered | CCS-35, later cards |
| No coverage numbers yet | Targets cannot be checked | new card needed |
| Login with a non-text password returns 500 for an existing email | Needs a test, and a fix | Bug not created yet, see [OWASP checklist](owasp-checklist.md) |
| No tests for rate limits on register and refresh | Limits do not exist yet | CCS-48 |
| `/analyze` not tested | Endpoint is not built yet | CCS-56, CCS-65 |
| Prompt injection guard not tested | Guard not built yet | CCS-55, CCS-66 |
| LLM evaluation harness not verified | Scores must be checked to be real | CCS-67 |
| No pipeline yet | Tests only run by hand | CCS-50, CCS-61 |
| No security scans yet | No automatic check of packages or the running app | CCS-62 |

**Decision needed from the team:** to test the server against a real database we would add a new tool, for example an in-memory MongoDB or a Docker container. Agree on this before adding it.

## 10. Who does what

- **Feature author:** writes unit and API tests inside the feature card.
- **Test and security owner:** writes end-to-end tests, verifies the analysis endpoint and the prompt injection guard (CCS-65, CCS-66, CCS-67), runs the security review before every merge, and keeps this plan up to date.

## 11. Related documents

- [Threat list](threat-list.md) and [OWASP checklist](owasp-checklist.md): what to protect and how
- [Secrets guide](secrets-guide.md): keeping secrets out of tests and the repo
- [Contributing guide](../CONTRIBUTING.md): the steps before every merge
- [Sample data notes](../ai-service/data/README.md): the made-up complaints
