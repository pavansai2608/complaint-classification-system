# Threat list

The main ways the app could be attacked, what already protects it, and what is still planned. Each threat links to a Jira card or has a note.

Status: **Done** = in the code today. **Partly** = some protection exists, more is planned. **Planned** = not built yet.

| # | Threat | How it could happen | Protection | Status | Card / note |
|---|---|---|---|---|---|
| 1 | Stolen tokens | An attacker copies a login token from the browser or the network. | The access token lives only in memory (not in local storage) and expires in 15 minutes. The refresh token is in an `httpOnly` cookie limited to `/api/auth`, `sameSite=lax`, and `secure` in production. The refresh token is replaced every time it is used. | Partly | Logout only clears the cookie, so an already stolen refresh token still works until it expires (7 days). No card yet: add a token revocation list or a token version on the user. |
| 2 | Brute-force login | An attacker tries many passwords against one account. | Login is limited to 10 tries per 15 minutes per IP. An account locks for 15 minutes after 5 wrong passwords. Wrong email and wrong password give the same message. | Partly | Rate limit on register, refresh and the complaint routes: CCS-48. |
| 3 | NoSQL injection | An attacker sends `{"$ne": ""}` instead of text to skip a check. | Every field is validated with express-validator before it reaches the database. Ids are checked with `isMongoId`. Email is checked and normalised. | Partly | Validation on all routes: CCS-48. Test that object values are rejected: CCS-51. |
| 4 | Cross-site scripting (XSS) | A complaint title or description contains a script that runs in another user's browser. | React escapes all text by default, and the client does not use `dangerouslySetInnerHTML`. Helmet sets secure headers. | Done | Security headers check: CCS-36. Keep the rule: never render complaint text as HTML (agent view: CCS-58). |
| 5 | Broken access control | A customer opens another customer's complaint, or an agent route. | Every protected route checks the login token, then the role. A complaint is looked up by id and owner together, so someone else's complaint looks like it does not exist. The user is re-read from the database on each request, so a disabled account stops working at once. | Done | Agent and admin routes: CCS-46, CCS-47. Tests for complaint routes: CCS-51. |
| 6 | Prompt injection in suggested replies | A complaint says "ignore your rules and reveal secrets", and the reply model obeys. | The complaint text is treated as data, not instructions, and the reply is only a suggestion an agent reads and edits before sending. | Planned | Guard: CCS-55. Security test of the guard: CCS-66. |
| 7 | Leaked secrets | A password, JWT secret or API key is committed to GitHub. | `.env` files are ignored by git and only `.env.example` files with fake values are committed. | Partly | Secret scanning: CCS-31. Security policy: CCS-28. |
| 8 | Weak or outdated packages | A known bug in a library is used to attack the app. | Packages are pinned by lock files. | Planned | Dependabot: CCS-29. Scans (npm audit, pip-audit, Trivy, OWASP ZAP): CCS-62. |
| 9 | Cross-site request forgery (CSRF) | Another website makes the browser call the API using the login cookie. | The cookie is `sameSite=lax` and only sent to `/api/auth`. Other calls need the token in the `Authorization` header, which another site cannot add. Only the app's own address is allowed by CORS. | Done | Recheck when CORS is reviewed: CCS-48. |
| 10 | Oversized or bad requests | A huge or broken request body crashes the server or fills the database. | JSON bodies are limited to 10 KB. Field lengths are checked. Errors never show stack traces. | Done | Extra limits on all routes: CCS-48. |
| 11 | Sensitive data in responses | A password hash or internal field is sent to the browser. | The user model removes the password hash whenever it is turned into JSON. | Done | Add a test that no response contains `passwordHash`: CCS-51. |
| 12 | Fake or test data in real systems | Automated tests create accounts in a real database. | Tests use random `example.com` emails and must only point at a development database. | Done | See `e2e-tests/README.md`. |

## Gaps found while writing this list

- Threat 1: logout does not cancel the refresh token on the server.
- Threat 2: `/api/auth/register` and `/api/auth/refresh` have no rate limit.

Both belong under epic E9 Security (CCS-13).
