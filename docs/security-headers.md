# Security headers checklist

The HTTP headers our services should send, what each one prevents, the value we expect, and what the server sends today.

**How the current values were checked (22 Sep 2026):** the real Express code (`server/src/app.js`) and the real FastAPI app (`ai-service`) were run on a development machine and called with `curl`. The Express check used an in-memory stand-in for the database, which does not change any header. Nothing was checked on a deployed site yet, because there is none.

Status: **OK** = matches what we expect. **Partly** = works but can be tighter. **Gap** = missing where it matters.

## The checklist

| Header | What it prevents | Expected value | Sent today by the API (Express) | Status |
|---|---|---|---|---|
| `Content-Security-Policy` | Cross-site scripting (XSS): the browser only runs scripts and loads content from allowed places | API: `default-src 'self'; ...; frame-ancestors 'self'` (Helmet default). React page: see the note below | `default-src 'self'; base-uri 'self'; font-src 'self' https: data:; form-action 'self'; frame-ancestors 'self'; img-src 'self' data:; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests` | OK for the API. **Gap** for the React page |
| `Strict-Transport-Security` (HSTS) | Downgrade attacks: forces the browser to use HTTPS | `max-age=31536000; includeSubDomains` | `max-age=31536000; includeSubDomains` | OK (only takes effect once the site runs on HTTPS) |
| `X-Content-Type-Options` | The browser guessing a file type and running a file as a script | `nosniff` | `nosniff` | OK |
| `X-Frame-Options` | Clickjacking: another site showing ours inside a hidden frame | `DENY` (or `SAMEORIGIN`) | `SAMEORIGIN` | OK |
| `Referrer-Policy` | Leaking page addresses to other sites | `no-referrer` or `strict-origin-when-cross-origin` | `no-referrer` | OK |
| CORS: `Access-Control-Allow-Origin` | Other websites reading our API responses in a user's browser | Exactly our client's address, never `*` when cookies are used | `http://localhost:5173` (the `CLIENT_ORIGIN` setting) | OK |
| CORS: `Access-Control-Allow-Credentials` | Cookies being sent from the wrong sites | `true`, only together with a fixed origin | `true` | OK |
| CORS: `Vary: Origin` | Caches mixing up responses for different origins | present | `Origin` (and `Access-Control-Request-Headers` on preflight) | OK |
| `X-Powered-By` | Telling attackers we use Express | absent | absent | OK |
| `Permissions-Policy` | Pages using camera, microphone or location without need | `camera=(), microphone=(), geolocation=()` | not sent | Partly (nice to have) |

Other headers Helmet also sends: `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `Origin-Agent-Cluster: ?1`, `X-DNS-Prefetch-Control: off`, `X-Download-Options: noopen`, `X-Permitted-Cross-Domain-Policies: none`, `X-XSS-Protection: 0`.

The same security headers appear on error responses too (for example a 404).

### Login cookie

| Setting | Expected | Sent today | Status |
|---|---|---|---|
| `HttpOnly` | yes (scripts cannot read it) | yes | OK |
| `SameSite` | `Lax` or `Strict` | `Lax` | OK |
| `Path` | as narrow as possible | `/api/auth` | OK |
| `Secure` | yes on the live site | not set on a local machine; the code sets it only when `NODE_ENV=production` | **Check again after deployment** |
| `Max-Age` | matches the refresh token life | 604800 (7 days) | OK |

### Login rate limit headers

The login route sends `RateLimit-Limit: 10` and `RateLimit-Policy: 10;w=900` (10 tries per 15 minutes).

### How CORS really behaves

The CORS package always answers with the one allowed origin. A request from `http://evil.example` still receives `Access-Control-Allow-Origin: http://localhost:5173`. The **browser** then sees the two addresses do not match and refuses to give the response to the other site. So the protection works, but you will not see the header disappear when you test with `curl`.

## The Python analysis service (`ai-service`)

| Item | Expected | Sent today | Status |
|---|---|---|---|
| Security headers | not needed if only our server can reach it | none | OK if kept private (a service key is planned in CCS-56) |
| `server: uvicorn` header | hidden | shown | Partly (start uvicorn with `--no-server-header`) |
| `/docs`, `/redoc`, `/openapi.json` | off unless `ENABLE_DOCS=true` | 404 | OK |

## The React page (`client/`)

The headers above come from the API. The web page itself (the HTML the browser loads) sends its own headers, set in `client/nginx.conf` (CCS-69), because Helmet only covers the API.

**Checked 22 Sep 2026** by building the container image and requesting it directly (bypassing the cluster, using a stand-in for the `server` upstream): all of `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and `Strict-Transport-Security` are present on `/`, on the SPA fallback path (any unmatched route, which still returns 200 by design), and on `/api/*` (the proxied route). Status: **OK**.

The page's CSP is `default-src 'self'; script-src 'self' https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://accounts.google.com; frame-src https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`. The app uses inline styles, so `style-src` needs `'unsafe-inline'`. Google Sign-In is turned on (`client/src/pages/Login.jsx`), so `script-src`, `frame-src` and `connect-src` allow `https://accounts.google.com`.

`Strict-Transport-Security` only takes effect once the site is actually served over HTTPS, same as the API - re-check after CCS-63.

## How to check a header yourself

With `curl` (shows the headers only):

```bash
curl -I http://localhost:4000/api/health
```

Test CORS the way a browser does:

```bash
curl -i -X OPTIONS -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST" http://localhost:4000/api/complaints
```

In the browser: open developer tools (F12), then **Network**, click a request, and open **Headers → Response Headers**. For cookies, open **Application → Cookies**.

Automated scanning of the running site is planned with OWASP ZAP (CCS-62).

## Gaps and notes

1. ~~The React page sends no security headers.~~ Fixed in CCS-69.
2. **`Secure` on the cookie** must be checked again on the deployed HTTPS site (CCS-63).
3. **Bad JSON error text:** a broken request body returns the parser's own message (for example `Expected property name or '}' in JSON at position 1`). It is low risk, but the server should return a fixed message such as "Invalid JSON".
4. **`Permissions-Policy`** is not set. Optional.
5. **`ai-service`** shows `server: uvicorn` and must never be reachable from the internet.

Related: [OWASP checklist](owasp-checklist.md) (A02 Security Misconfiguration) and [threat list](threat-list.md).
