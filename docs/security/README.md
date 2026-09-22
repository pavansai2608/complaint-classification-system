# Security scan reports

Results of the four security scans, run on 22 Sep 2026. The raw reports are in this folder.

## Summary

| Scan | What it checks | Result | Report |
|---|---|---|---|
| `npm audit` (server) | Known problems in server packages | **0 vulnerabilities** (464 packages) | [npm-audit-server.txt](npm-audit-server.txt) |
| `npm audit` (client) | Known problems in client packages | **0 vulnerabilities** | [npm-audit-client.txt](npm-audit-client.txt) |
| `pip-audit` (ai-service) | Known problems in Python packages | **None found** (pinned packages only) | [pip-audit-ai-service.txt](pip-audit-ai-service.txt) |
| OWASP ZAP (API) | The running server, from outside | 1 informational note | [zap-api-report.html](zap-api-report.html) |
| OWASP ZAP (client page) | The running React page, from outside | **2 Medium, 5 Low**, 3 informational | [zap-client-report.html](zap-client-report.html) |
| Trivy (project files) | Packages, leaked secrets, configuration | **0 vulnerabilities, 0 secrets** | [trivy-fs-report.txt](trivy-fs-report.txt) |
| Trivy (Docker images) | Problems inside built images | **Not run.** There are no Docker images yet | see "Not done yet" |

**No High or Critical findings.**

## ZAP findings and decisions

The API scan found only one informational note: "Storable and Cacheable Content" on the health check. No action needed.

The client page scan found these, all coming from the same cause: **the React page is served with no security headers**.

| Risk | Finding | Decision |
|---|---|---|
| Medium | Content Security Policy (CSP) header not set | Accepted for now. Fix in the web server config when the client is containerised (CCS-49, CCS-60). Tracked as CCS-69 under E9 Security. Starting policy: [security-headers.md](../security-headers.md) |
| Medium | Missing anti-clickjacking header | Same fix, same card (CCS-69) |
| Low | `X-Content-Type-Options` missing | Same fix, same card (CCS-69) |
| Low | Permissions-Policy, Cross-Origin-Embedder / Opener / Resource policies missing | Same fix, same card (CCS-69) |
| Info | Suspicious comments, modern web application, cache notes | No action. The comments are in the development build of the page |

The API already sends most of these headers (see [security-headers.md](../security-headers.md)). The page served to the browser sends none of them.

## How the scans were run

- The server ran with its real code and an in-memory stand-in for MongoDB. The client ran with the Vite development server. There is no production web server yet, so the client result describes the development server. Run ZAP again against the deployed app (CCS-63).
- ZAP ran its baseline scan: it crawls the site and looks at responses. It does not attack the app or log in, so pages behind login were not checked.
- `pip-audit` checked only the versions pinned in `requirements.txt` and `requirements-dev.txt`, not the packages they pull in.

## Not done yet

- **Trivy on Docker images.** The project has no Dockerfiles. Run it when the images exist (CCS-49): `trivy image <image name>` for the client, server and ai-service images. Fix or document any High or Critical finding.
- **ZAP on the deployed site**, including the login flow, after deployment (CCS-63).
- **Packages inside the ai-service dependencies** (for example the sub-packages of `torch`). Add a full `pip-audit` run in the pipeline (CCS-50, CCS-61).

## How to run them again

```bash
cd server && npm audit
cd client && npm audit
cd ai-service && pip-audit -r requirements-dev.txt
```

With Docker running (replace the address with the running app):

```bash
docker run --rm -v "$(pwd)/docs/security:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://host.docker.internal:5173 -r zap-client-report.html -I
docker run --rm -v "$(pwd):/repo:ro" aquasec/trivy:latest fs --scanners vuln,secret,misconfig /repo
```

Do not scan sites you do not own.
