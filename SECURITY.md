# Security policy

## Reporting a vulnerability

Please report security problems **privately**. Do not open a public issue, and do not post details in a pull request or chat.

1. Open the **Security** tab of this repository on GitHub.
2. Click **Report a vulnerability**.
3. Describe the problem: what you found, where, the steps to reproduce it, and what an attacker could do with it.

Do not include real passwords, tokens or customer data in your report.

## Supported versions

The project is in active development and has no numbered releases yet. Only the latest code on the `main` branch is supported. Fixes are made on `main`.

## What to expect

| Step | Target time |
|---|---|
| We confirm we received your report | within 3 working days |
| We tell you if it is a real problem and how serious it is | within 7 working days |
| We fix it, or share a plan and date for the fix | within 30 days |

We will keep you updated, and we will credit you in the fix notes if you want.

## What is in scope

- The React client, the Express API and the Python analysis service in this repository
- Login, tokens, roles and access to complaints
- Secrets or personal data exposed by the code or the config files

Known planned security work is listed in [docs/threat-list.md](docs/threat-list.md).
