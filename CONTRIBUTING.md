# Contributing

How we work on this project. Two people work in parallel, so these steps keep our changes from clashing.

## 1. Pick a card

- Work only on Jira cards (project `CCS`) that are assigned to you.
- Move the card to **In Progress** before you start.

## 2. Get the latest code

Do this before every card, and again right before you merge:

```bash
git checkout main
git pull origin main
```

## 3. Create a branch

Name it `feature/CCS-<number>-<short-name>`:

```bash
git checkout -b feature/CCS-12-complaint-filter
```

One card, one branch.

## 4. Commit messages

Start with the Jira key, then a short sentence in plain words:

```
CCS-15 add register API
CCS-44 customer can submit a complaint
```

## 5. Run the tests before you push

Every feature comes with its own tests in the same card.

```bash
cd server && npm test
cd client && npm test
cd ai-service && source .venv/bin/activate && pyb
```

Browser tests (start the server and client first, see [e2e-tests/README.md](e2e-tests/README.md)):

```bash
cd e2e-tests && python -m unittest discover -p "*_tests.py" -v
```

## 6. Check your change for security problems

Before you commit, read your own diff and ask:

- Is every input validated (express-validator on the server, Pydantic in the AI service)?
- Does every protected route check the login, the role and who owns the data?
- Is there any password, token or API key in the code? Secrets go in `.env`, never in git.

Each service has a `.env.example` with fake values. Copy it to `.env` and fill in real values locally. `.env` is ignored by git.

## 7. Merge to main

We merge directly on `main`, without pull requests:

```bash
git add <your files>
git commit -m "CCS-12 add complaint filter"
git checkout main
git pull origin main
git merge feature/CCS-12-complaint-filter
git push origin main
```

Pull right before you merge, in case your teammate pushed in the meantime. If git reports a conflict, fix the files it lists, then commit the merge.

## 8. Finish the card

- Move the card to **In Review** and add a short comment: what you built, what you tested, and the result of the security check.
- Never commit `node_modules/`, `.venv/`, `.env` files or large data files.

## Tips

- Keep the project folder **outside** OneDrive or other sync folders. Syncing can lock folders and cause git errors such as `index.lock` or "Deletion of directory failed".
- Keep code simple and readable. You should be able to explain every file you write.
