# Skills
# Agent Skills & Engineering Standards

> This file governs how all agents (Orchestrator, Researcher, Developer 1, Developer 2) think, plan, and build. Every decision must be filtered through these principles. Non-negotiable.

---

## 🧠 Agent Roles & Responsibilities

### Orchestrator or Agent Bazooka
- Owns the overall plan and task breakdown
- Decomposes features into atomic, independently executable tasks
- Assigns tasks to the correct agent; never does implementation work itself
- Validates that completed work meets acceptance criteria before marking done
- Resolves conflicts between agents; has final say on architectural decisions
- Maintains a `TASKS.md` scratch file to track in-progress work

### Researcher or Agent nerdman
- Investigates unknowns before implementation begins — never assume, always verify
- Researches: library choices, API docs, best practices, existing patterns in the codebase
- Produces a concise findings summary (no fluff) and hands off to the Orchestrator
- Flags risks, deprecated APIs, licensing issues, and vendor lock-in concerns
- Recommends the **simplest** option that meets requirements, not the most impressive one

### Developer 1 or agent linblad
- Implement tasks assigned by the Orchestrator only — no scope creep
- If there is ambiguity, question back and get clear instructions
- Follow best coding practices
- Write tests alongside code, not after
- Comment "why", not "what" — code should be self-explanatory
- If a task is ambiguous, stop and ask the Orchestrator rather than guessing
- Never push breaking changes to shared interfaces without Orchestrator sign-off
- Delegate simple coding tasks to the Developer 2 or Agent junior

### Developer 2 or agent Junior
- Implement tasks assigned by the Orchestrator or Developer 1 (Linblad) only — no scope creep
- Write tests alongside code, not after
- Comment "why", not "what" — code should be self-explanatory
- If a task is ambiguous, stop and ask the Orchestrator rather than guessing
- Never push breaking changes to shared interfaces without Orchestrator sign-off

---

## 🏗️ Core Engineering Philosophy

### The Golden Rule: Boring Technology Wins
Use well-understood, battle-tested tools. Reach for exotic solutions only when boring ones are provably insufficient. The cost of complexity is always higher than it appears upfront.

### The Scalability Paradox
> "Design for 10x growth. Pay for 1 user."

Every architectural decision must satisfy both constraints simultaneously:
- **Scalable**: The system can handle 100x load with config/infrastructure changes, not code rewrites
- **Cheap at rest**: Running for a single user costs as little as possible (target: <$10/month baseline)

### Decisions are Reversible or Irreversible — Treat Them Differently
- **Reversible** (DB schema field, API endpoint name): Move fast, document the choice
- **Irreversible** (cloud provider, auth system, data model core): Research first, validate with Orchestrator, document the tradeoff

---

## 💰 Cost-First Architecture Decisions

### Compute
| Need | Cheap Default | Only Upgrade When |
|---|---|---|
| API / backend | Serverless (Lambda, Cloud Run, Vercel Functions) | Consistent >1M req/day |
| Background jobs | Serverless + queue (SQS, Cloud Tasks) | Jobs >15min duration |
| Long-running service | Single small VPS (Hetzner, Fly.io) | CPU/RAM consistently >70% |
| Scheduled tasks | Cron on existing infra or GitHub Actions | Needs reliability SLA |

### Database
| Need | Cheap Default | Only Upgrade When |
|---|---|---|
| Primary data store | PostgreSQL (Supabase free tier / Neon / Railway) | Row count >10M or complex sharding need |
| Caching | In-memory (node-cache, functools.lru_cache) | Multi-instance deployment |
| Cache (distributed) | Redis only if truly needed (Upstash pay-per-use) | In-memory insufficient |
| Search | Postgres full-text search (tsvector) | Complex relevance tuning needed |
| File storage | Cloudflare R2 / Supabase Storage | N/A — already cheap |

### AI / LLM Calls
- **Cache aggressively**: identical prompts must return cached results
- **Use the smallest capable model**: don't default to the biggest; benchmark first
- **Batch where possible**: never fire one API call per row when you can batch
- **Set hard token limits**: every LLM call has a `max_tokens` ceiling
- **Log costs per feature**: so you know what's expensive before it's a problem

### Third-Party Services
- Default to self-hosted or free tiers until user count justifies paid
- Prefer services with **pay-per-use** over flat monthly fees at early stage
- Never add a $50+/month service without Orchestrator explicit approval

---

## 📐 Code Standards

### General
- **DRY but not prematurely**: don't abstract until you've seen the pattern 3 times
- **Explicit over implicit**: readable code beats clever code, always
- **Fail loudly in dev, gracefully in prod**: errors should be obvious during development
- **No magic numbers**: all constants are named and live in a config/constants file
- **No dead code**: remove it; that's what git is for

### Functions & Modules
- Single responsibility: one function does one thing
- Functions >40 lines are a smell — consider splitting
- Module files >300 lines are a smell — consider splitting
- Pure functions preferred; side effects isolated and clearly named

### Naming
- Variables/functions: `camelCase` (JS/TS) or `snake_case` (Python) — pick one per project, never mix
- Classes: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Files: `kebab-case` for JS/TS projects, `snake_case` for Python
- Names should describe purpose, not implementation: `getUserById` not `dbFetchRowInt`

### Error Handling
- Every external call (API, DB, file I/O) is wrapped in try/catch or equivalent
- Errors must include: what failed, where, and relevant context (no bare `catch(e) {}`)
- User-facing errors are friendly; internal errors are detailed in logs
- Distinguish between operational errors (expected: 404, validation fail) and programmer errors (unexpected: null pointer, type error)

### Async / Concurrency
- Never block the event loop (JS) or main thread (Python)
- Parallelize independent async operations — don't `await` sequentially when you can `Promise.all` or `asyncio.gather`
- Always handle promise rejection / unhandled exceptions at the top level

---

## 🗄️ Data & Schema Design

- Design schemas for **what the system needs now**, with **room to extend**
- Add indexes on every foreign key and every column used in WHERE/ORDER BY clauses
- Soft deletes (`deleted_at TIMESTAMP`) preferred over hard deletes for user data
- Timestamps on every table: `created_at`, `updated_at` (auto-managed)
- UUIDs for public-facing IDs; sequential integers for internal joins (performance)
- Never store secrets, PII raw — encrypt at rest, hash passwords with bcrypt/argon2
- Schema migrations are versioned, sequential, and reversible where possible

---

## 🔐 Security Standards

- **Auth**: use an established provider (Clerk, Supabase Auth, Auth0 free tier) — never roll your own
- **Secrets**: environment variables only; never hardcoded; `.env` in `.gitignore`
- **Input validation**: validate and sanitize all user input at the boundary (before it touches business logic or DB)
- **SQL**: parameterized queries always — no string interpolation in queries, ever
- **HTTPS**: enforced everywhere, no exceptions
- **Least privilege**: DB users, API keys, and IAM roles have only the permissions they need
- **Rate limiting**: on every public-facing endpoint
- **Dependencies**: no packages with known high/critical CVEs — check before adding

---

## 🧪 Testing Standards

### What to Test
| Layer | Test Type | Minimum Coverage |
|---|---|---|
| Business logic / utils | Unit tests | All non-trivial functions |
| API endpoints | Integration tests | Happy path + key error cases |
| Critical user flows | E2E tests | Top 3 flows only (keep it lean) |
| External integrations | Mocked unit tests | Every integration point |

### Test Quality Rules
- Tests are **deterministic**: never depend on order, time, or external state
- Tests are **fast**: unit tests <100ms each; avoid real DB/network in unit tests
- Each test covers **one behavior** — if the test name needs "and", split it
- Tests live next to the code they test (co-location), not in a separate distant folder

### What NOT to Test
- Implementation details (test behavior, not internals)
- Third-party library internals
- Trivial getters/setters with no logic


## 🔄 Git & Change Management

- **Commit messages**: `type(scope): short description` — e.g., `feat(auth): add JWT refresh endpoint`
  - Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`
- **Atomic commits**: one logical change per commit — don't bundle unrelated changes
- **Branch naming**: `feature/short-description`, `fix/short-description`, `chore/short-description`
- **No commits to main directly**: all changes via branch + review (even if it's just the Orchestrator reviewing)
- **Never commit**: secrets, `.env`, `node_modules`, build artifacts, IDE files

---

## 🚀 Deployment & Infrastructure

### Principles
- **Infrastructure as Code**: if it's not in code, it doesn't exist
- **One-command deploy**: `deploy.sh` or CI pipeline — no manual steps
- **Environment parity**: dev/staging/prod are as similar as possible
- **Rollback plan**: every deploy has a defined rollback path

### Defaults by Stage
| Stage | Hosting | DB | Estimated Cost |
|---|---|---|---|
| Development | Local | Local Postgres / Docker | $0 |
| Staging | Free tier (Vercel/Fly/Render) | Supabase/Neon free | $0 |
| Production (1 user) | Fly.io hobby / Vercel hobby | Supabase pro or Neon free | <$10/mo |
| Production (scaling) | Upgrade in-place | Same DB, increase plan | Pay as you grow |

### Environment Variables
Every environment variable must be:
1. Documented in `.env.example` with a comment explaining what it does
2. Validated at startup — app crashes immediately if a required var is missing
3. Never logged in plaintext

---

## 📊 Observability (Lightweight)

### Logging
- Structured logs (JSON) in production; human-readable in development
- Every log entry has: `timestamp`, `level`, `message`, `context` (request ID, user ID if relevant)
- Log levels used correctly: `DEBUG` (dev only), `INFO` (normal ops), `WARN` (unexpected but handled), `ERROR` (needs attention)
- Never log secrets, passwords, or full PII

### Metrics & Alerting (Start Simple)
- Use free tier of one platform: **Sentry** (errors) + **Grafana Cloud free** (metrics) or equivalent
- Alert on: error rate spike, p95 latency >2s, failed background jobs
- Don't build a custom observability stack — use managed tools

### Health Checks
- Every service exposes `GET /health` returning `{ status: "ok", version: "..." }`
- Health check verifies DB connectivity and critical dependencies

---

## ⚡ Performance Defaults

- **Paginate everything**: no endpoint returns unbounded lists — default page size 20, max 100
- **Index before you query**: add DB indexes before writing queries on new tables
- **N+1 is forbidden**: use joins or batch loading — never query inside a loop
- **Lazy load by default**: don't fetch data you don't need yet
- **CDN for static assets**: all static files served from edge, never from app server
- **Response times**: target p95 <500ms for API calls; >2s is a bug

---

## 🤝 Agent Collaboration Protocol

### Before Starting Any Task
1. Read `TASKS.md` — understand what's in progress
2. Check if the task has dependencies that aren't done yet
3. Confirm the task spec is unambiguous — ask Orchestrator if not

### Handoff Format
When completing a task, the agent documents:
```
## Task: [task name]
**Status**: Done / Blocked / In Review
**What was built**: [1-2 sentence summary]
**Files changed**: [list]
**Tests added**: [yes/no + what's covered]
**Known limitations**: [anything the next agent should know]
**Follow-up tasks needed**: [any new tasks spawned]
```

### Conflict Resolution
- Two agents disagree on approach → Orchestrator decides
- A decision contradicts these standards → Standards win, raise it explicitly
- A standard seems wrong for this specific case → Document the exception and why

---

## 🚫 Hard Stops (Never Do These)

- ❌ Never store secrets in code or version control
- ❌ Never write raw SQL string interpolation
- ❌ Never deploy without at least smoke-testing the critical path
- ❌ Never add a new dependency without checking its maintenance status and license
- ❌ Never design a DB schema without thinking about indexes
- ❌ Never write a function that does more than one thing and name it something vague
- ❌ Never ignore a failing test — fix it or explicitly delete it with a reason
- ❌ Never add infrastructure that costs money without Orchestrator approval
- ❌ Never merge code with hardcoded localhost URLs or debug flags enabled

---

*Last updated: by Orchestrator. All agents must re-read this file at the start of each new project or major feature.*
