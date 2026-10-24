# Pax Virentia — System Guide

**Version:** 1.1 · 23 October 2026  
**Audience:** developers, analysts, reviewers, operators, and the project planner  
**Scope:** the end-to-end Pax Virentia platform: a React 18 web application on Vercel, a FastAPI API
on Render with an embedded simulation worker, Supabase PostgreSQL 17 persistence, and optional
Gemini explanations.

This guide describes how the system is put together, how to configure it, how a calculation actually
flows from a scenario to a stored result, and how to operate it responsibly. Scientific boundaries
are part of the contract, not presentation copy.

---

## 1. Platform at a glance

Pax Virentia is an **offline, digital-twin-inspired decision-support workspace** for one
representative Philippine water-treatment plant. It compares a baseline operating scenario with an
intervention scenario over the same service volume, period, currency, and emissions boundary.

It is explicitly **not** a live plant controller, SCADA integration, certified environmental impact
assessment, or full life-cycle assessment.

```mermaid
flowchart LR
  subgraph Browser["Client browser"]
    U["Analyst / public visitor"]
  end

  subgraph Vercel["Vercel — apps/web"]
    SPA["React 18 + TypeScript + Vite\nPages, components, api.ts"]
    RW["vercel.json\n/api/:path* rewrite"]
  end

  subgraph Render["Render — backend"]
    API["FastAPI modular monolith\nuvicorn app.main:app"]
    EW["Embedded RunWorker\nlifespan daemon thread"]
    SEP["Optional separate worker\napp.jobs.worker"]
  end

  U -->|"HTTPS"| SPA
  U -->|"/api/v1 (same origin)"| RW
  RW -->|"HTTPS proxy"| API
  API -->|"SQLAlchemy + psycopg"| DB[("Supabase PostgreSQL 17\n(or local SQLite in development)")]
  EW -->|"claim lease / publish results"| DB
  SEP -.->|"claim lease / publish results"| DB
  EW --> CALC["Pure calculation modules\nenergy · carbon · economics · ecology gate"]
  SEP -.-> CALC
  API -.->|"optional, server-side"| GEMINI["Google Gemini API"]
```

### 1.1 Components

| Component | Location | Responsibility |
| --- | --- | --- |
| Web application | `apps/web/` | Scenario wizard, dashboard, datasets, results, comparison rail, reports, public snapshot. React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind. |
| API | `backend/app/main.py`, `backend/app/api/v1/` | Authentication, validation, scenario/revision persistence, run submission, status/results, comparisons, catalogs, datasets. |
| Domain and services | `backend/app/domain/`, `backend/app/services/` | Scientific invariants, frozen snapshots, orchestration, error semantics. |
| Calculations | `backend/app/calculations/` | Pure functions: energy, electricity-associated emissions, OPEX, ecological evidence gate. No database, network, or Gemini access. |
| Worker | `backend/app/jobs/worker.py` | Claims durable jobs, renews leases, executes calculations, publishes results atomically. Runs as an embedded API thread in production or as a separate process. |
| Persistence | `backend/app/repositories/simulation.py` | SQLAlchemy/psycopg PostgreSQL, explicit SQLite adapter for local tests. |
| Catalogs | `backend/app/api/v1/catalogs.py` | DOE/IEA grid factors, technology specifications, model registry. |
| Explanation service | `backend/app/integrations/gemini.py` | Grounded narrative over stored facts, with deterministic template fallback. |
| Deployment | `docs/DEPLOYMENT_GUIDE.md` | Vercel frontend, Render backend, embedded/separate worker modes, environment reference, and smoke tests. |

### 1.2 Request topology

- **Development:** Vite at `http://localhost:5173` proxies `/api` to FastAPI at
  `http://localhost:8000` (`apps/web/vite.config.ts`).
- **Production:** Vercel serves the static SPA. `apps/web/vercel.json` rewrites `/api/:path*` to the
  Render service, so the browser treats every API call as same-origin under the Vercel hostname.
  The remaining routes fall back to `/index.html` for React Router.
- The rewrite is routing, not authorization; the Render API still enforces session, role, exact
  origin, and CSRF checks. Vercel edge proxying does not make an untrusted origin trusted.
- The backend health endpoint is **not** behind the `/api` rewrite; verify it directly on Render.
  Use `/api/v1/openapi.json` through Vercel to verify the proxy path.
- Every `/api/v1` response is `Cache-Control: private, no-store`.

### 1.3 Production topology and worker modes

| Area | Production choice |
| --- | --- |
| Frontend host | Vercel project with Root Directory `apps/web`, Vite build, `dist` output. |
| Backend host | Render Web Service with Root Directory `backend` and `$PORT` binding. |
| API entrypoint | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (or the equivalent `app.main:application` alias), after `python -m app.bootstrap`. |
| Database | Supabase PostgreSQL 17. The Render start command runs idempotent bootstrap DDL on every deploy. |
| Browser API path | Relative `/api/v1`, proxied by the Vercel rewrite. No production `VITE_*` API host. |
| Default worker | Embedded `RunWorker` daemon thread in the FastAPI lifespan (`ENABLE_EMBEDDED_WORKER=true`). |
| Alternative worker | `python -m app.jobs.worker` as a separate process, with the embedded worker disabled. |

The two worker modes share the same durable `jobs` table, lease renewal, and lease-fenced
publication. The embedded mode is the single-service, cost-effective default; it stops when a free
Render instance sleeps and competes with the API for CPU. A separate worker is independently
restartable and scalable, but requires a second paid service. See the
[Production Deployment Guide](DEPLOYMENT_GUIDE.md) for the deployment sequence and trade-offs.

---

## 2. Persistence design

### 2.1 Supported databases

- **Supabase PostgreSQL 17** — managed production and shared staging database.
- **Local SQLite** (`sqlite:///pax_virentia.db`) — zero-setup development and the explicit test
  adapter. The repository refuses any backend other than PostgreSQL or an explicit `sqlite:///`
  URL.

Schema changes are versioned Alembic revisions in `backend/app/migrations/versions/`
(`0001` baseline, `0002` publication workflow and audit trail, `0003` reports, `0004` insight
reviews). **API startup itself never performs DDL.** `python -m app.bootstrap` runs
`alembic upgrade head`; on Render the start command runs it before uvicorn on every deploy. Upgrades
are idempotent, and revision `0001` uses `IF NOT EXISTS`, so databases created before migrations
existed are adopted in place. The connection must permit DDL. `alembic current` / `alembic upgrade head`
also work from `backend/` (see `backend/alembic.ini`).

### 2.2 Tables

| Table | Purpose | Key constraints |
| --- | --- | --- |
| `users` | Provisioned accounts | `role` in `analyst, reviewer, administrator`; unique email index; `active` flag. |
| `sessions` | Opaque sessions | Hashed token primary key, hashed CSRF token, expiry, revocation flag. |
| `scenarios` | Scenario identity | `kind` in `baseline, intervention`; creator and creation time. |
| `scenario_revisions` | Immutable parameter sets | `UNIQUE(scenario_id, revision_no)`; canonical JSON parameters. |
| `simulation_runs` | Frozen run envelope | Status in `queued, running, succeeded, failed, cancelled`; snapshot hash; code version. |
| `run_results` | Immutable result payload | One row per run. |
| `jobs` | Durable work queue | One per run; attempt counter, lease token/expiry, cancellation flag. |
| `idempotency_keys` | Submission replay protection | `PRIMARY KEY(user_id, endpoint, key)`; request hash. |
| `dataset_versions` | Evidence versions | Exact CSV bytes, checksum, quality report, schema version, evidence label. |
| `publications` | Reviewed public snapshots | Unique slug, frozen redacted `snapshot_data`, `status` in `pending_review, published, rejected, withdrawn`, submitter, reviewer and decision reason, withdrawer and reason, publication time, view count. |
| `audit_events` | Audit trail | Actor, action (e.g. `publication.approved`), entity, timestamp, change summary. |
| `reports` | Report export requests | Type, title, sections/formats, run IDs and their snapshot hashes. Files are regenerated on download. |
| `insight_reviews` | Per-user review marks | `PRIMARY KEY(user_id, insight_key)`; status `reviewed` or `dismissed`. |
| `ai_explanations` | Stored narratives | `UNIQUE(run_id, focus)`; narrative, key drivers, grounded evidence. |

### 2.3 Immutability and lineage

- Published factors, dataset versions, technology specifications, and model artifacts are
  immutable. Corrections create new versions; deprecation prevents future selection but preserves
  old runs.
- A run freezes its scenario revision, dataset checksum/metadata, technology version, factor set,
  cost assumptions, module versions, code version, unit system, reporting timezone, emissions
  boundary, and random seed.
- Historical results are **not** recomputed when a factor later changes.
- Deleting a scenario referenced by a run is not supported; archive it instead. Reject deletion of
  referenced evidence or retain it under the agreed research retention policy.

---

## 3. Environment configuration

### 3.1 Files

```text
backend/.env            active local values, git-ignored, never commit
backend/.env.example    tracked placeholder template
```

`backend/app/config.py` loads `backend/.env` first, then a relative `.env`, using
`pydantic-settings`. `case_sensitive=True`; unknown keys are ignored.

Copy the template:

```bash
cd "backend"
cp .env.example .env
# edit backend/.env with your Supabase password and project reference
```

### 3.2 Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PROJECT_NAME` | `Pax Virentia API` | OpenAPI title. |
| `VERSION` | `0.1.0` | Application version. |
| `API_V1_STR` | `/api/v1` | Versioned API prefix. |
| `CODE_VERSION` | `0.1.0-dev` | Frozen into every run and used in provenance. |
| `DATABASE_URL` | `sqlite:///pax_virentia.db` | Supabase PostgreSQL or explicit SQLite URL. |
| `ALLOWED_ORIGINS` | `["http://localhost:5173","http://localhost:5174","http://127.0.0.1:5173"]` | Browser origins accepted for CORS and the origin/CSRF checks. Accepts a JSON array or comma-separated list; exact origins are normalized without a path or trailing slash. Production must add the Vercel production origin and any approved preview origins. The only supported wildcard is `https://*.vercel.app`. |
| `ENABLE_EMBEDDED_WORKER` | `true` in the production deployment | Starts the simulation worker as a daemon thread in the FastAPI lifespan. Set `false` when running a separate worker process. |
| `SESSION_LIFETIME_HOURS` | `24` | Standard session lifetime. |
| `SESSION_REMEMBER_HOURS` | `720` | Lifetime when "remember me" is selected. |
| `SECRET_KEY` | development placeholder | Must be replaced in any shared deployment; minimum 16 characters. |
| `SUPABASE_URL` | empty | Optional project URL. |
| `SUPABASE_ANON_KEY` | empty | Optional; never use in a Vite variable. |
| `SUPABASE_SERVICE_ROLE_KEY` | empty | Server-side only; never expose to the browser. |
| `GEMINI_API_KEY` | empty | Optional. Empty selects deterministic template explanations. |
| `GEMINI_MODEL` | `gemini-3.5-flash` | Pinned explanation model identifier. Use a model available to the project; provider failure falls back to the deterministic template. |
| `SEED_USER_EMAIL` | `rivera.dev.miggy@gmail.com` | Bootstrap seed analyst email. |
| `SEED_USER_PASSWORD` | `pax-virentia-dev` | Bootstrap seed password; change outside local development. |
| `SEED_USER_NAME` | `Miggy` | Bootstrap display name. |
| `SEED_USER_ROLE` | `analyst` | Bootstrap role. |

### 3.3 Supabase connection strings

Find them in the Supabase dashboard under **Project Settings → Database → Connection string → URI**.

**Session mode, including the Supavisor session pooler (port 5432)** — recommended for this
application because every Render start runs bootstrap DDL:

```env
# Direct host (use when reachable from the host)
DATABASE_URL="postgresql+psycopg://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"

# Session pooler (IPv4-friendly; recommended on Render)
DATABASE_URL="postgresql+psycopg://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
```

**Transaction pooler / Supavisor (port 6543)** — assigns a server connection per transaction. It can
work for some stateless workloads, but it does not preserve session state and restricts DDL and
prepared statements. Do not assume it is interchangeable with 5432 for this deployment:

```env
DATABASE_URL="postgresql+psycopg://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"
```

If the password contains `@`, `#`, `:`, `!`, or `%`, URL-encode it (`@` → `%40`, `#` → `%23`)
before pasting.

**Bootstrap and runtime use the same URL on Render.** Because `python -m app.bootstrap` runs on
every start, use session mode (5432). If DDL is restricted on the chosen port, bootstrap must be
moved to a one-off 5432 step instead of pointing startup at 6543. The repository opens a pool of
five connections per process (`pool_size=5, max_overflow=0`), so multiple Render instances multiply
the connection count. See the
[deployment troubleshooting](DEPLOYMENT_GUIDE.md#64-supabase-connection-pooler-port-5432-vs-6543).

### 3.4 Frontend configuration

The web app defaults to the relative path `/api/v1`. It supports an optional public
`VITE_API_BASE_URL` build variable, which must remain relative (`/api/v1`) for production. In
development, `vite.config.ts` proxies `/api` to `http://localhost:8000` with `changeOrigin: true`.

- Never put `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, or `SECRET_KEY` in a
  `VITE_*` variable. Vite embeds every `VITE_*` value in the public bundle.
- Production uses `apps/web/vercel.json` to rewrite `/api/:path*` to the Render service and all
  other paths to `/index.html`. Do not set a production `VITE_API_BASE_URL` pointing directly at
  Render; that reintroduces cross-origin cookies and third-party-cookie blocking.
- The `__Host-pv_session` cookie therefore belongs to the Vercel hostname and is sent on same-site
  API calls. `SameSite=Lax` is appropriate for this topology.

---

## 4. Local setup and startup

### 4.1 Prerequisites

- Python 3.11 or newer (the project is exercised on 3.14 in this workspace).
- Node.js 20+ and npm.
- Optional Supabase project for shared persistence.

### 4.2 Backend

```bash
cd "backend"
python3 -m venv .venv            # if not already created
source .venv/bin/activate
pip install -e .
cp .env.example .env             # then edit DATABASE_URL
python3 -m app.bootstrap
```

`python3 -m app.bootstrap` applies all migrations and provisions the configured seed account
(`SEED_USER_*`) if it is absent. It is safe to re-run; existing IDs are preserved.

Reviewers and administrators are provisioned separately (there is no public sign-up):

```bash
python3 -m app.bootstrap create-user --email reviewer@example.org --role reviewer --name "R. Reviewer"
# password from --password, PV_NEW_USER_PASSWORD, or an interactive prompt; re-running updates the role
```

Choose the worker mode explicitly so local behavior matches production.

**Embedded worker (single process):**

```bash
cd "backend"
ENABLE_EMBEDDED_WORKER=true uvicorn app.main:app --reload --port 8000
```

The FastAPI lifespan starts the `RunWorker` daemon thread. This mirrors the default Render
deployment.

**Separate worker (two processes):**

```bash
cd "backend"
ENABLE_EMBEDDED_WORKER=false uvicorn app.main:app --reload --port 8000
```

```bash
cd "backend"
PYTHONPATH=. python3 -m app.jobs.worker
```

- Health: `GET http://localhost:8000/health`
- OpenAPI UI: `http://localhost:8000/api/v1/docs`
- OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`

With embedded mode disabled and no separate worker running, submitted runs stay `queued`. Do not run
both modes against the same database unless you intend to have multiple workers; leases and fencing
prevent duplicate publication, but the extra process is unnecessary for local development.

### 4.3 Frontend

```bash
cd "apps/web"
npm install
npm run dev
```

Open `http://localhost:5173`. The dev proxy forwards `/api` to port 8000.

### 4.4 Commands reference

| Task | Command |
| --- | --- |
| Apply migrations and seed account | `cd backend && python3 -m app.bootstrap` |
| Provision a reviewer/administrator | `cd backend && python3 -m app.bootstrap create-user --email … --role reviewer` |
| Run API with embedded worker | `cd backend && ENABLE_EMBEDDED_WORKER=true uvicorn app.main:app --reload --port 8000` |
| Run API without worker | `cd backend && ENABLE_EMBEDDED_WORKER=false uvicorn app.main:app --reload --port 8000` |
| Run separate worker | `cd backend && PYTHONPATH=. python3 -m app.jobs.worker` |
| Backend tests | `cd backend && pip install -e ".[dev]" && pytest -v` (120 s per-test timeout) |
| Frontend type-check and build | `cd apps/web && npm run typecheck && npm run build` |
| Frontend lint | `cd apps/web && npm run lint` (ESLint 9 flat config, zero warnings) |
| Frontend tests | `cd apps/web && npm test` (Vitest + Testing Library) |

CI runs both suites on pushes and pull requests to `main` (`.github/workflows/test-backend.yml`,
`.github/workflows/test-web.yml`); the frontend job also fails if prototype fixture identifiers reach
the production bundle.

---

## 5. Calculation pipeline

### 5.1 End-to-end sequence

```mermaid
sequenceDiagram
  participant UI as Browser
  participant API as FastAPI
  participant DB as Supabase PostgreSQL
  participant W as Worker (embedded thread or separate process)

  UI->>API: POST /scenarios/{id}/revisions (parameters)
  API->>DB: validate + insert immutable revision
  UI->>API: POST /runs + Idempotency-Key
  API->>DB: transaction: snapshot + run + job + idempotency key
  API-->>UI: 202 Accepted + Location + Retry-After
  W->>DB: claim job with lease (SKIP LOCKED)
  W->>W: revalidate invariants; compute modules
  W->>DB: publish results + terminal status (fenced by lease)
  UI->>API: GET /runs/{id} every 1.5–2 s
  API-->>UI: status; then GET /runs/{id}/results
```

1. **Freeze.** The API validates the revision and writes a snapshot plus a `queued` run and job in a
   single transaction. Nothing is calculated inside the HTTP request.
2. **Accept.** The API returns `202 Accepted` with `Location` and `Retry-After: 2`.
3. **Claim.** The worker claims a ready job with a short transaction and a 60-second lease. PostgreSQL
   uses `FOR UPDATE SKIP LOCKED`; SQLite uses `BEGIN IMMEDIATE`. The worker may be the embedded
   lifespan thread or a separate `app.jobs.worker` process; both use the same claim and fencing
   logic.
4. **Revalidate.** The worker rechecks the scientific invariants at the boundary, including the
   factor when carbon is requested. Client evidence flags cannot unlock ecological predictions.
5. **Compute.** Pure functions produce energy, carbon, economics, and the ecological gate result.
6. **Publish.** In one transaction, the worker verifies its lease token still matches, writes the
   immutable result payload, and marks the run `succeeded`. A stale or cancelled attempt cannot
   publish.
7. **Observe.** The browser polls run status; AI explanation generation is a separate, optional
   step.

### 5.2 Formulas and units

**Energy**

```text
E_total_kWh = Σ (P_i_kW × load_multiplier_i × hours_i)
energy_intensity = E_total_kWh / treated_volume_m3
```

- Pump duty uses the technology's pump power and duty hours.
- Mixer duty uses mixer power × mixing load multiplier × mixing hours.
- A load multiplier of `1.0` means stated steady input power, not an efficiency gain.
- Zero volume yields `energy_intensity = null`, never a divide-by-zero.

**Electricity-associated emissions (Scope 2)**

```text
GHG = E_total_kWh × factor_kg_per_kwh
```

- `CO2e` factor → `kg CO2e`; `CO2` factor → `kg CO2`.
- The factor must match grid region, reporting year covering the entire period in Asia/Manila, and
  accounting method.
- No valid factor means no emissions result.
- Excludes embodied, direct process, transport, and other life-cycle emissions.

**Period operating cost (PHP)**

```text
chemical_kg = dose_mg_per_L × treated_volume_m3 / 1000
OPEX = E_total_kWh × tariff_PHP_per_kWh
     + chemical_kg × chemical_price_PHP_per_kg
     + labor_PHP + maintenance_PHP + other_nonenergy_PHP
net_savings = baseline_OPEX − intervention_OPEX
```

- Capex is separate from period OPEX.
- Simple payback is `incremental_capex / positive annual net savings`; otherwise not applicable.
- Currency is always PHP.

**Ecological gate**

```json
{
  "indicator_key": "downstream_stress",
  "status": "not_estimable",
  "value": null,
  "unit": null,
  "reason": "Validated local exposure-response model or paired observation dataset is unavailable.",
  "required_evidence": [
    "adviser-approved exposure-response methodology",
    "localized temporal ecosystem baseline observations",
    "independent model validation metrics"
  ]
}
```

`not_estimable` is a scientific state, distinct from zero impact and from a software failure.

### 5.3 Comparison compatibility

The API rejects a comparison unless both runs succeeded and agree on:

- service volume (`volume_m3`),
- period start and end (canonical UTC instants),
- currency (`PHP`),
- grid region,
- emissions boundary (`electricity-associated only`),
- gas basis and factor method when both include carbon.

Percent change is `null` when the baseline value is zero. Deltas are
`intervention − baseline`; net savings are `baseline OPEX − intervention OPEX`.

### 5.4 Durability and concurrency

- The job queue is at-least-once. Idempotency keys, unique constraints, and lease-fenced writes
  prevent duplicate published results but do not guarantee single execution.
- Attempts are bounded (3 by default); exhausted attempts mark the run failed with
  `worker_attempts_exhausted`.
- A cancellation request is stored until acknowledged. Queued work is cancelled immediately;
  running work is cancelled only when the worker checks the flag and declines to publish.
- Retrying a failed job creates a new attempt; historical results are never rewritten.
- Leases are renewed every 20 seconds while work runs. If renewal fails, the attempt can no longer
  publish.
- In embedded mode the worker runs inside the API process. If a free Render instance sleeps, queued
  jobs wait until the service wakes and the lifespan starts a new worker. A separate worker avoids
  that coupling.

### 5.5 AI explanation pipeline

1. Queue or request an explanation only for a succeeded run.
2. Send the minimum approved facts: metric keys, values, units, deltas, evidence labels,
   limitations, and allowed source IDs.
3. Validate the response against a Pydantic schema and the stored result envelope.
4. Store the model ID, prompt version, input hash, validated output, and validation status.
5. If the provider is unavailable, return a deterministic template and keep numerical results
   intact.
6. Label the result **AI-generated explanation**; render approved numbers from stored results, not
   from prose.

Prompt injection boundary: CSV cells, descriptions, and user questions are untrusted data. They
cannot override rules, call tools, change records, or authorize runs.

---

## 6. Verification constraints

These constraints are acceptance criteria for software and scientific correctness. They are not
claims of validated plant performance.

| Area | Required evidence |
| --- | --- |
| Units and arithmetic | Hand-worked fixtures for kW·h → kWh, mg/L → kg, kWh → emissions, and kWh → PHP; documented tolerances. |
| Invariants | Identical baseline/intervention yields zero deltas; zero denominator yields `null` percent; capacity and delivery violations rejected; no negative valid energy. |
| Evidence gating | Missing or mismatched factor blocks carbon; unmatched region/year blocks carbon; absent ecological model returns `null` plus a reason. |
| Reproducibility | The same frozen snapshot and versions reproduce results within the agreed floating-point tolerance. |
| Immutability | Editing a scenario creates a new revision; old runs and results do not change. |
| Jobs | Restart before/after publish; expired lease cannot publish; cancellation is honoured; idempotent replay returns the same run; conflicting payload returns `409`. |
| API/security | Role matrix, CSRF, origin checks, session expiry/logout, upload limits, public/private separation, no direct calculation input from the browser. |
| Frontend | TypeScript build passes; every metric shows units; missing metrics are visibly `not_estimable`; comparison rail remains keyboard-accessible. |
| Deployment | Bootstrap against the intended database; Render `/health`; Vercel same-origin proxy; login cookie and origin checks; embedded-worker run completion; public report access without a session; publication withdrawal; and a restore exercise. |

### 6.1 Test fixtures

- `research/data/sample_plant_data.csv` — five daily plant observations for 1–5 January 2026,
  including a high-turbidity event. Useful for CSV inspection and baseline fixtures.
- `research/data/grid_emission_factors.json` — 2023 DOE/IEA factor examples. The running catalog
  currently returns 2024 factors; do not mix the two without updating the factor version.

Illustrative arithmetic check only: 100 kWh × 0.5 kg CO2e/kWh = 50 kg CO2e; 100 kWh × PHP 10/kWh =
PHP 1,000. None of these constants is a recommended Philippine factor or tariff.

---

## 7. Operating guidelines

### 7.1 Analysts

1. **Prepare evidence.** Import a UTF-8 CSV (≤ 10 MB, ≤ 50,000 rows). Review missing values,
   duplicates, invalid measurements, and flagged outliers. Outliers are retained, not deleted.
2. **Approve a dataset version.** Record the source and evidence label (`measured`,
   `externally_sourced`, `assumed`, `synthetic`). A dataset with critical missing values, invalid
   values, missing required columns, or duplicates cannot be used for a run.
3. **Create the baseline.** Set volume, period, flow, pump duty, mixing, dose, technology
   specification, factor, and cost assumptions. Keep the baseline fixed as the comparison reference.
4. **Create the intervention.** Use the Pax Silica specification; acknowledge its `unverified`
   label. Do not present modelled deltas as validated savings.
5. **Run.** Submit the frozen revision. Observe `queued → running → succeeded`, or cancel if the
   inputs were wrong.
6. **Compare.** Compare only compatible runs. Read each metric separately; a decrease in one metric
   does not establish sustainability.
7. **Explain and export.** Request an AI explanation if useful. On **Reports**, choose runs, sections
   and formats; the preview, PDF and CSV are all generated from stored results and always end with the
   methodology and limitations.
8. **Submit for review.** On Results or Reports, submit the run's redacted public snapshot. It stays
   private until a different reviewer approves it.

### 7.2 Reviewers

1. Open **Publication reviews** (`/reviews`, visible to reviewers and administrators).
2. For each snapshot awaiting review, open its run and check evidence labels, units, frozen versions,
   and comparison compatibility.
3. Confirm the ecological metric is `not_estimable` unless an approved local model exists.
4. Preview the exact public payload.
5. Approve, or reject with a reason. You cannot decide on your own submission. Publication is a
   reviewed snapshot, not regulatory approval.
6. Withdraw a published snapshot (with a reason) if it is found to be misleading; public access ends
   immediately and the link shows a withdrawal notice. Every decision is in the audit trail.

### 7.3 Public visitors

Public pages show only approved, redacted summaries with source dates and limitations, read from
`/api/v1/public/reports`. With nothing published they say so; they never show sample figures. They
do not expose drafts, raw files, internal notes, or unpublished runs.

---

## 8. Security and privacy

- Argon2 password hashing; opaque random session tokens stored only as hashes.
- `__Host-pv_session` cookie: `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`.
- Exact-origin and CSRF checks on state-changing private requests, including logout; login checks
  the origin. The CSRF token is an HMAC of the session token, so `GET /auth/session` can re-issue it
  after a browser restart or in a new tab. Keep `SECRET_KEY` stable across deploys.
- Server-side role enforcement on every private endpoint; the proxy is not an authorization layer.
- Upload boundary: file and row limits, UTF-8 validation, no executable deserialization,
  parameterized SQL.
- Gemini is server-side only. Keys live in the backend environment, never in `VITE_*` variables or
  browser storage.
- Logs omit passwords, tokens, connection strings, raw confidential uploads, and provider traces.
- Escape spreadsheet formula prefixes in exported CSV cells.
- Define data classification, retention, and source licenses before accepting confidential records.

---

## 9. Troubleshooting

| Symptom | Likely cause | Resolution |
| --- | --- | --- |
| Runs stay `queued` | No worker: embedded worker disabled or not running, separate worker absent, or a free Render instance slept | Confirm `ENABLE_EMBEDDED_WORKER=true` and a live deploy, or start `PYTHONPATH=. python3 -m app.jobs.worker`. On a free instance, wake the service and allow the cold start. |
| First request after idle is slow or times out | Render free-tier cold start | Retry once and check `/health`; use a paid always-on instance for production. See the [deployment guide](DEPLOYMENT_GUIDE.md#63-render-cold-starts-and-the-free-tier). |
| `403 origin_rejected` on login | Vercel origin missing from `ALLOWED_ORIGINS` | Add the exact production or preview origin as a JSON array entry, then redeploy Render. No trailing slash. |
| `503`/connection error from API | Wrong `DATABASE_URL`, pooler vs direct mismatch, or Supabase paused | Verify the URI, password encoding, and project status; bootstrap with a 5432 session connection. See [pooler guidance](DEPLOYMENT_GUIDE.md#64-supabase-connection-pooler-port-5432-vs-6543). |
| `401 authentication_required` | Missing/expired cookie, third-party cookie blocking, or cookie rejected over plain HTTP | Keep browser calls same-origin through the Vercel proxy; production must be HTTPS. Do not add a `Domain` attribute to `__Host-pv_session`. |
| `403 csrf_rejected` | Untrusted `Origin`, or a token from another session | The client refreshes the token from `/auth/session` and retries once automatically. If it persists, check `ALLOWED_ORIGINS` and that `SECRET_KEY` did not change mid-session. |
| `403 insufficient_role` | Role cannot perform the action (e.g. a reviewer submitting, an analyst approving) | Use an account with the right role; provision one with `app.bootstrap create-user`. |
| `403 self_review_forbidden` | Deciding on your own submission | Ask another reviewer or administrator. |
| `409 invalid_publication_state` | Approving a non-pending or withdrawing a non-published snapshot | Refresh the review queue. |
| Public report shows "no longer available" | It was withdrawn (`410`) | Expected; submit and approve a corrected snapshot. |
| `409 results_not_available` | Reading results before `succeeded` | Poll status; check worker logs for `calculation_failed`. |
| `422 incompatible_comparison` | Volume, period, currency, region, boundary, or factor method differs | Re-create the intervention with matching assumptions. |
| `422` factor errors | Missing factor, region mismatch, or reporting year does not cover the period | Select a factor for the same region and year, in Asia/Manila terms. |
| `413` / `422` CSV errors | File too large, wrong encoding, bad header, or row shape | Re-export as UTF-8 CSV, keep the header, and stay under the limits. |
| Ecology appears blank | Expected: evidence gate unmet | Show `not_estimable` with the reason and required evidence; never show `0`. |
| AI narrative absent | No key, quota, or validation failure | Numerical results remain valid; use the deterministic template. |

---

## 10. Known gaps and open decisions

| Item | Current state | Owner / next step |
| --- | --- | --- |
| Explanation naming | Implemented as `/runs/{id}/explain`; the master plan uses `/explanations`. Publications now use `/publications`. | Keep the implemented paths until a versioned contract decision changes them. |
| Methodology wording | Generated from the live catalogs and implemented formulas. | Domain reviewer to approve the scientific wording. |
| Catalog auth | `GET /catalogs/*` is currently unauthenticated. | Decide public vs private; add `require_session` if private. |
| Treatment identity | Pax Silica remains unverified pending a technical source. | Researchers + adviser. |
| Ecological model | No validated local exposure–response model or paired observations. | Domain adviser; otherwise formal scope revision. |
| Energy ML | Deterministic baseline only; no training dataset or approved model artifact. | Research track with chronological splits and naive-baseline comparison. |
| Factor data | Catalog serves 2024 factors only, so periods outside 2024 cannot compute emissions; `research/data/grid_emission_factors.json` is a superseded 2023 note with different values (see `research/data/README.md`). | Curate, cite and version one authoritative factor set. |
| Deployment topology | Supabase + Render + Vercel is documented in `docs/DEPLOYMENT_GUIDE.md`; quotas, regions, and paid-tier needs must be confirmed for the actual project. Free Render cold starts pause the embedded worker. | Technical lead; confirm always-on capacity before promising run completion. |
| Origin matching | Production supports exact origins plus the single wildcard `https://*.vercel.app`; project-scoped wildcard patterns are not supported. The global wildcard trusts every matching Vercel subdomain as a CSRF origin. | Prefer exact production and preview origins; use the wildcard only with documented risk. |

---

## 11. Glossary quick reference

- **Scenario:** a proposed combination of operating conditions and treatment assumptions.
- **Scenario revision:** a frozen version of a scenario.
- **Run:** one evaluation of a specific revision against fixed evidence, factors, and models.
- **Baseline:** the reference scenario for a compatible comparison.
- **Intervention:** the proposed change being evaluated.
- **Electricity-associated emissions:** Scope 2 emissions attributed to purchased or modelled
  electricity; not a full footprint.
- **Not estimable:** the available evidence or model does not support a value; distinct from zero.
- **Public snapshot:** a reviewed, redacted, intentionally published representation of selected
  results and limitations.
- **Embedded worker:** the `RunWorker` running as a daemon thread inside the FastAPI lifespan,
  enabled by `ENABLE_EMBEDDED_WORKER=true`. It stops when the API process stops.
- **Separate worker:** the same `RunWorker` run as its own `app.jobs.worker` process, used when
  independent restarts or run completion while the web service sleeps is required.

See `CONTEXT.md` for the full domain glossary and `docs/API_CONTRACTS.md` for endpoint-level
schemas, headers, status codes, and error formats.
