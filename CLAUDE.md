## Project
Intelligent Customer Complaint Classification & Resolution System.
Users: customer (raises and tracks complaints), agent (sees queue by priority, sends replies), admin (dashboard and analytics).
Flow: customer submits complaint → Express saves it → calls AI service → gets category, sentiment, priority, suggested reply → agent reviews, edits, sends reply → marks resolved.
Deadline: early November 2026. Sprints are 2 weeks.

## Stack
- client/: React (Vite) + Redux Toolkit + React Router + Recharts
- server/: Node + Express + MongoDB (Mongoose), JWT access + refresh tokens, Google OAuth, bcrypt, Jest + Supertest tests
- ai-service/: Python FastAPI + Pydantic, built with PyBuilder, tested with unittest. Category: scikit-learn (TF-IDF + Logistic Regression) trained on a public complaint dataset. Sentiment: pretrained Hugging Face DistilBERT. Priority: rules from category + sentiment + keywords. Suggested replies: Gemini free tier. Fine-tuning DistilBERT for category is a later stretch goal.
- e2e-tests/: Selenium in Python
- k8s/: Kubernetes manifests for Minikube. Docker for every service.
- Jenkinsfile at root: test → build images → deploy.
- Security checks: OWASP ZAP, npm audit, pip-audit, Trivy.

## Jira
Site complaint-classification-system.atlassian.net, space key CCS. Use the Atlassian MCP tools to read and update Jira.

## Tools
Pick the right tool at the start of every task, without me asking each time.
- Jira (read, create, update, transition, comment): Atlassian MCP. Never guess card state, read it.
- Library or framework API I am unsure about, or a version-specific question: context7 MCP before writing the code.
- Debugging data or schema problems in MongoDB: MongoDB MCP (read-only).
- Choosing or downloading a model or dataset: Hugging Face MCP.
- If nothing fits, just do the task normally. Never invent a tool that is not connected.
- If a needed MCP server is not connected or fails, tell me instead of working around it silently.

### Skills
Use these on your own when the task matches. Say in one line which skill and why.
- /security-review: before printing git commands for any card. Never skip.
- engineering:code-review or /code-review: reviewing a diff or a branch before push.
- engineering:testing-strategy: deciding what to test for a card (Jest + Supertest, unittest, Selenium).
- engineering:debug: a failing test or a bug I cannot explain.
- engineering:documentation: READMEs, API docs, setup steps.
- engineering:architecture or engineering:system-design: designing a new service, schema, or the Express to AI service contract.
- engineering:deploy-checklist: Docker, Kubernetes, or Jenkins pipeline changes.
- engineering:incident-response: something is broken in a running environment.
- ui-ux-pro-max or frontend-design: building or fixing React screens, layout, and accessibility.
- dataviz: any Recharts chart on the admin dashboard.
- data:analyze or data:explore-data: inspecting the complaint dataset before training.
- eval-engineering: measuring model or classifier quality.
- engineering:tech-debt, safe-refactor: cleanup and refactors.
- Do not use skills unrelated to this project (marketing, sales, shopify, finance, image or video generation).

## Rules
1. Never run git commit, git push, git merge, or create PRs. Never change git config. When a task is ready, print the exact git commands for me to run myself.
2. Never write "Claude", "Anthropic", "AI-generated", or any AI tool name in code, comments, READMEs, docs, commit messages, PR text, or Jira comments.
3. Never mention syllabus units, unit numbers, course names, or "capstone requirement" anywhere. Write everything like a normal real-world product.
4. Branch names: feature/CCS-<number>-<short-name>. Commit messages start with the Jira key, e.g. "CCS-5 add JWT login API".
5. Before starting a Jira card, move it to In Progress. After I confirm the push, move it to In Review and add a short Jira comment summarising what was done. I move cards to Done myself after merging.
6. Never commit secrets. Use .env files and always provide .env.example.
7. Every feature gets basic tests in the same card.
8. Keep code simple and readable. I must be able to explain every file in a viva.
9. Ask me before adding big new libraries or changing the stack.
10. I use macOS. Keep explanations short and simple.
11. Security by default in every card: validate all input (express-validator, Pydantic), hash passwords with bcrypt, short JWT expiry with refresh tokens in httpOnly cookies, rate limit auth routes, use helmet and strict CORS, check user role and ownership on every protected route, never pass raw user text to database queries, guard Gemini prompts against prompt injection.
12. I am new to security. After each card, explain in 3-5 simple lines which attack the code protects against and how.
13. For every security weakness found later, create a Jira Bug in CCS under epic E9 Security.
14. Before printing git commands for any card, remind me: "Run /security-review first." Never skip this.
