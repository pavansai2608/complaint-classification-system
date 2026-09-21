# OWASP Top 10 checklist

How each risk in the [OWASP Top 10:2025](https://owasp.org/Top10/2025/) applies to this app, what protects us today, and which Jira card covers the rest.

Status: **Done** = in the code today. **Partly** = some protection exists, more is planned. **Planned** = not built yet. **Gap** = a weakness found, with no card yet.

The four parts of the app: **auth** (register, login, tokens), **complaints API** (Express + MongoDB), **AI service** (Python service that analyses a complaint), **dashboards** (agent queue and admin charts).

| # | Risk | Status |
|---|---|---|
| A01 | Broken Access Control | Partly |
| A02 | Security Misconfiguration | Partly |
| A03 | Software Supply Chain Failures | Partly |
| A04 | Cryptographic Failures | Partly |
| A05 | Injection | Partly |
| A06 | Insecure Design | Partly |
| A07 | Authentication Failures | Partly |
| A08 | Software or Data Integrity Failures | Partly |
| A09 | Security Logging and Alerting Failures | Gap |
| A10 | Mishandling of Exceptional Conditions | Partly |

## A01: Broken Access Control

- **How it applies:** a customer must never read another customer's complaint. An agent or admin page must not open for a customer. The AI service must only be called by our server.
- **Protection now:** every protected route checks the login token, then the role (`requireRole`). A complaint is fetched by id and owner together, so someone else's complaint looks like it does not exist. The user is re-read from the database on each request, so a disabled account stops working at once.
- **Still to do:** the same checks on the agent queue and status update. Keep the AI service reachable only from the server, not from the internet.
- **Cards:** CCS-46, CCS-47 (agent routes), CCS-51 (route tests), CCS-56 (AI service endpoint).

## A02: Security Misconfiguration

- **How it applies:** wrong headers, open CORS, debug pages left on, weak defaults.
- **Protection now:** Helmet sets secure headers, CORS allows only the app's own address, JSON bodies are limited to 10 KB, and errors never show stack traces. The AI service turns its `/docs` pages off unless `ENABLE_DOCS=true`. Every service has a `.env.example` and real `.env` files are ignored by git.
- **Still to do:** review headers and limits on all routes, and set secure settings in Docker and Kubernetes.
- **Cards:** CCS-48, CCS-36 (headers checklist), CCS-49 (Docker), CCS-60 (Kubernetes), CCS-62 (OWASP ZAP scan).

## A03: Software Supply Chain Failures

- **How it applies:** a bad or outdated package in the client, server, AI service or test project.
- **Protection now:** lock files pin the npm versions and the Python requirements are pinned. Dependabot checks all four folders every week.
- **Still to do:** regular audits and image scans. Secret scanning. Pin the exact version of the pretrained emotion model when it is added.
- **Cards:** CCS-29 (Dependabot, done), CCS-62 (npm audit, pip-audit, Trivy), CCS-31 (secret scanning), CCS-53 (emotion model).

## A04: Cryptographic Failures

- **How it applies:** passwords, login tokens and data sent over the network.
- **Protection now:** passwords are hashed with bcrypt (cost 12). Access and refresh tokens use two different secrets that come from environment variables. Access tokens last 15 minutes. The refresh cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.
- **Still to do:** HTTPS on the deployed site, so the `secure` cookie and tokens are protected on the network.
- **Cards:** CCS-63 (deploy to EC2).

## A05: Injection

- **How it applies:** database queries (NoSQL injection), page content (XSS), and the text we send to the reply model (prompt injection).
- **Protection now:** every field is validated with express-validator, ids are checked with `isMongoId`, and email is checked and normalised. React escapes all text and the client does not use `dangerouslySetInnerHTML`.
- **Still to do:** validation on every route. Tests that send objects instead of text. A guard against prompt injection in suggested replies.
- **Cards:** CCS-48, CCS-51, CCS-55 (prompt guard), CCS-66 (test the guard).

## A06: Insecure Design

- **How it applies:** missing protections that no code fix can add later.
- **Protection now:** the threat list names the main attacks and their protections. Accounts lock after 5 wrong passwords. A suggested reply is only a suggestion, and an agent edits it before sending.
- **Still to do:** keep the threat list up to date as features are added.
- **Cards:** CCS-19 (threat list, done), CCS-55.

## A07: Authentication Failures

- **How it applies:** register, login, Google sign-in and token refresh.
- **Protection now:** bcrypt hashes, a login limit of 10 tries per 15 minutes per IP, an account lock after 5 wrong passwords, and the same message for a wrong email or a wrong password. Google sign-in only trusts an email Google has verified, and never links to an existing password account by email alone.
- **Gaps found:**
  - Logout does not cancel the refresh token on the server. A stolen one works for up to 7 days.
  - `/api/auth/register` and `/api/auth/refresh` have no rate limit.
- **Cards:** CCS-48 covers rate limits. There is no card yet for cancelling refresh tokens at logout.

## A08: Software or Data Integrity Failures

- **How it applies:** trusting code, packages or files without checking them. The AI service loads its category model from a `.joblib` file, which is a pickle-style format that can run code when loaded.
- **Protection now:** the model file is trained from our own data and committed by the team. It is never loaded from user input or a download.
- **Still to do:** keep it that way: never load a model file from a user upload or an unchecked link. Run all tests on every push and scan images before deploy.
- **Cards:** CCS-50 (test pipeline), CCS-61 (build, scan and deploy pipeline), CCS-62.

## A09: Security Logging and Alerting Failures

- **How it applies:** we need to see attacks such as password guessing, locked accounts and access denied errors.
- **Protection now:** the server logs unexpected errors (status 500 and above).
- **Gap:** failed logins, account locks and 403 errors are not logged, and there are no alerts. There is no card for this yet.

## A10: Mishandling of Exceptional Conditions

- **How it applies:** what the app does when something goes wrong: a bad request, a database outage, or the AI service being down.
- **Protection now:** one central error handler returns the same error shape and never shows stack traces. Login checks fail closed (any token problem gives 401). The server stops on start if it cannot reach the database.
- **Gap found:** logging in with a password that is not text (for example `{"a":1}`) for an email that exists gives a 500 error, while an unknown email gives 401. This lets a caller find out which emails are registered. Fix: check that `password` is a string in the login validator. There is no card for this yet.
- **Still to do:** decide what happens to a saved complaint when the AI service is down.
- **Cards:** CCS-57 (server calls the AI service), CCS-56.

## Gaps that need a Jira Bug (epic CCS-13)

1. Logout does not cancel the refresh token (A07).
2. `/api/auth/register` and `/api/auth/refresh` have no rate limit (A07). CCS-48 may cover it.
3. Login with a non-text password returns 500 for existing emails, which reveals which emails are registered (A07, A10).
4. Failed logins, account locks and access denied errors are not logged (A09).
