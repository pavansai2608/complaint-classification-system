# Secrets guide

A short guide to keeping passwords and keys out of the repository.

## What counts as a secret

A secret is anything that lets someone act as us or open our data. If it leaks, we must replace it.

| Secret | Where it is used |
|---|---|
| `MONGODB_URI` (it contains the database password) | server |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | server, signs login tokens |
| API keys, such as the Gemini key for suggested replies | AI service / server |
| SSH keys, cloud (AWS) keys, Jenkins and Docker registry credentials | deployment |
| Real customer data, real passwords, real tokens | anywhere |

These are **not** secret, and are safe to commit in `.env.example` files: `PORT`, `CLIENT_ORIGIN`, `ENABLE_DOCS`, local test URLs, and `GOOGLE_CLIENT_ID` (a public identifier).

**Careful with the client:** every variable that starts with `VITE_` is built into the website and can be read by anyone. Never put a secret in a `VITE_` variable.

## How to use `.env` and `.env.example`

- `.env` holds the **real** values on your own machine. It is ignored by git, so it never gets committed.
- `.env.example` holds the **names** with fake or empty values. It is committed, so everyone knows which variables to set.

Steps for a new service:

```bash
cd server
cp .env.example .env
```

Then fill in real values in `.env`. When you add a new variable, add its name to `.env.example` in the same change.

To make a strong JWT secret (use a different one for each secret):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Never share real values in chat, Jira, screenshots or pull requests. Send them privately, or ask the teammate to create their own.

## Check before you commit

```bash
git status
git diff --cached
```

Look for anything that looks like a password, token or key. `git status` must never list a `.env` file as something to commit.

## GitHub protection

Two GitHub features catch mistakes. They are free for public repositories. Only the repo owner (or an admin) can turn them on, because only they see the **Settings** tab. Do it once:

1. Open the repository on GitHub and click the **Settings** tab. If you do not see it, click the **...** menu at the end of the tab row.
2. In the left sidebar, under **Security and quality**, click **Advanced Security**.
3. Next to **Secret Protection**, click **Enable**, then confirm with **Enable Secret Protection**. This turns on secret scanning.
4. Next to **Push protection**, click **Enable**.
5. Refresh the page. Both should now say **Enabled**.

Shortcut: `https://github.com/<owner>/<repo>/settings/security_analysis` opens the same area (replace `<owner>/<repo>` with this repository's owner and name).

On the same page you can also enable **Private vulnerability reporting**, which the security policy (`SECURITY.md`) relies on.

With push protection on, GitHub blocks a push that contains a known kind of secret. If your push is blocked, do not choose to allow it. Remove the secret from your commit:

```bash
git reset --soft HEAD~1
```

Then delete the secret from the file, use an environment variable instead, and commit again.

## If a secret was pushed by mistake

Removing the file is **not enough**. Anyone who copied the repo, and GitHub's history, still has it. Follow these steps in order:

1. **Rotate it first.** Make the leaked value useless:
   - Database password: change the database user's password in MongoDB Atlas and update `.env`.
   - JWT secrets: generate new ones. Everyone will be logged out, which is expected.
   - API key: revoke it in the provider's console and create a new one.
2. **Tell your teammate** right away.
3. **Remove it from the code** and commit the fix.
4. **Remove it from the git history.** Use `git filter-repo` or BFG Repo-Cleaner, then force-push. This rewrites history, so agree on it with your teammate first. Both of you then need a fresh copy of the repo.
5. **Check for misuse.** Look at the database access log or the provider's usage page for anything you did not do.
6. If real customer data was exposed, tell the project owner.

Rotating comes first because the history clean-up takes time, and a leaked secret can be used within minutes.
