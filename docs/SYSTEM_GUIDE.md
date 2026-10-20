# Pax Virentia — System Guide

**Version:** 1.0 · 20 October 2026  
**Audience:** developers, analysts, reviewers, and the project planner  
**Scope:** the end-to-end Pax Virentia platform: React 18 web application, FastAPI API, background
simulation worker, Supabase PostgreSQL 17 persistence, and optional Gemini explanations.

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
  subgraph Browser["apps/web — React 18 + TypeScript + Vite"]
    UI["Pages & Components"]
    CLIENT["api.ts / runLifecycle.ts\n(same-origin /api client)"]
    UI --> CLIENT
  end

  CLIENT -->|"/api/v1 (Vite proxy in dev)"| API["backend/app — FastAPI\nmodular monolith"]
  API -->|SQLAlchemy + psycopg| DB[("Supabase PostgreSQL 17\n(or local SQLite)")]
  WORKER["backend/app/jobs — worker\nseparate process"] -->|claim lease / publish results| DB
  WORKER --> CALC["Pure calculation modules\nenergy · carbon · economics · ecology gate"]
  API -.->|"optional, server-side"| GEMINI["Google Gemini API"]
  WORKER -.->|"explanations only"| GEMINI
```

### 1.1 Components

| Component | Location | Responsibility |
| --- | --- | --- |
| Web application | `apps/web/` | Scenario wizard, dashboard, datasets, results, comparison rail, reports, public snapshot. React 18, TypeScript, Vite, React Router, TanStack Query, Tailwind. |
| API | `backend/app/main.py`, `backend/app/api/v1/` | Authentication, validation, scenario/revision persistence, run submission, status/results, comparisons, catalogs, datasets. |
| Domain and services | `backend/app/domain/`, `backend/app/services/` | Scientific invariants, frozen snapshots, orchestration, error semantics. |
| Calculations | `backend/app/calculations/` | Pure functions: energy, electricity-associated emissions, OPEX, ecological evidence gate. No database, network, or Gemini access. |
| Worker | `backend/app/jobs/worker.py` | Claims durable jobs, renews leases, executes calculations, publishes results atomically. |
| Persistence | `backend/app/repositories/simulation.py` | SQLAlchemy/psycopg PostgreSQL, explicit SQLite adapter for local tests. |
| Catalogs | `backend/app/api/v1/catalogs.py` | DOE/IEA grid factors, technology specifications, model registry. |
| Explanation service | planned (`backend/app/integrations/gemini.py`) | Grounded narrative over stored facts, with deterministic template fallback. |

### 1.2 Request topology

- **Development:** Vite at `http://localhost:5173` proxies `/api` to FastAPI at
  `http://localhost:8000` (`apps/web/vite.config.ts`).
- **Production:** the frontend is served with a same-origin `/api/:path*` rewrite to the API. The
  rewrite is routing, not authorization; the API host enforces the same session, role, origin, and
  CSRF checks.
- Every `/api/v1` response is `Cache-Control: private, no-store`.

---

## 2. Persistence design

### 2.1 Supported databases

- **Supabase PostgreSQL 17** — managed production and shared staging database.
- **Local SQLite** (`sqlite:///pax_virentia.db`) — zero-setup development and the explicit test
  adapter. The repository refuses any backend other than PostgreSQL or an explicit `sqlite:///`
  URL.

Schema creation is an explicit bootstrap step. **API startup never performs DDL.**

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
| `publications` | Public snapshots | Unique slug, frozen `snapshot_data`, publisher, publication time, view count. |
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
| `ALLOWED_ORIGINS` | `["http://localhost:5173","http://localhost:5174","http://127.0.0.1:5173"]` | Exact origins accepted for CORS and CSRF checks. |
| `SESSION_LIFETIME_HOURS` | `24` | Standard session lifetime. |
| `SESSION_REMEMBER_HOURS` | `720` | Lifetime when "remember me" is selected. |
| `SECRET_KEY` | development placeholder | Must be replaced in any shared deployment; minimum 16 characters. |
| `SUPABASE_URL` | empty | Optional project URL. |
| `SUPABASE_ANON_KEY` | empty | Optional; never use in a Vite variable. |
| `SUPABASE_SERVICE_ROLE_KEY` | empty | Server-side only; never expose to the browser. |
| `GEMINI_API_KEY` | empty | Optional. Empty selects deterministic template explanations. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Pinned explanation model identifier. |
| `SEED_USER_EMAIL` | `rivera.dev.miggy@gmail.com` | Bootstrap seed analyst email. |
| `SEED_USER_PASSWORD` | `pax-virentia-dev` | Bootstrap seed password; change outside local development. |
| `SEED_USER_NAME` | `Miggy` | Bootstrap display name. |
| `SEED_USER_ROLE` | `analyst` | Bootstrap role. |

### 3.3 Supabase connection strings

Find them in the Supabase dashboard under **Project Settings → Database → Connection string → URI**.

**Direct / session mode (port 5432)** — use for schema bootstrap and migrations:

```env
DATABASE_URL="postgresql+psycopg://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require"
```

**Transaction pooler / Supavisor (port 6543)** — suitable for production API/worker connections:

```env
DATABASE_URL="postgresql+psycopg://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require"
```

If the password contains `@`, `#`, `:`, `!`, or `%`, URL-encode it (`@` → `%40`, `#` → `%23`)
before pasting.

**Do not** point the schema bootstrap at the pooler if your plan restricts DDL through it. Bootstrap
with the direct connection, then switch the runtime URL.

### 3.4 Frontend configuration

The web app calls the relative path `/api/v1`; no API base URL is embedded in the bundle. In
development, `vite.config.ts` proxies `/api` to `http://localhost:8000` with `changeOrigin: true`.

- Never put `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `SECRET_KEY` in a `VITE_*` variable.
- Production uses a same-origin `/api/:path*` rewrite to the deployed API; do not introduce
  cross-origin cookies casually.

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

`python3 -m app.bootstrap` creates the schema if absent and provisions the configured seed analyst
plus `ana.santos@example.com`. It is safe to re-run; existing IDs are preserved.

Start the API:

```bash
cd "backend"
uvicorn app.main:app --reload --port 8000
```

- Health: `GET http://localhost:8000/health`
- OpenAPI UI: `http://localhost:8000/api/v1/docs`
- OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`

Start the worker in a **separate** process:

```bash
cd "backend"
PYTHONPATH=. python3 -m app.jobs.worker
```

The worker is not started by the API process. Without it, submitted runs stay `queued`.

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
| Bootstrap schema and seed users | `cd backend && python3 -m app.bootstrap` |
| Run API | `cd backend && uvicorn app.main:app --reload --port 8000` |
| Run worker | `cd backend && PYTHONPATH=. python3 -m app.jobs.worker` |
| Backend tests | `PYTHONPATH=backend python3 -m unittest discover -s backend/tests -p "test_*.py" -v` |
| Frontend type-check and build | `cd apps/web && npm run build` |
| Frontend lint | `cd apps/web && npm run lint` |

---

## 5. Calculation pipeline

### 5.1 End-to-end sequence

```mermaid
sequenceDiagram
  participant UI as Browser
  participant API as FastAPI
  participant DB as Supabase PostgreSQL
  participant W as Worker

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
   uses `FOR UPDATE SKIP LOCKED`; SQLite uses `BEGIN IMMEDIATE`.
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

### 5.5 AI explanation pipeline (planned integration)

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
| Deployment | Bootstrap against the intended database, proxy-cookie checks, publication withdrawal, and a restore exercise. |

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
7. **Explain and export.** Request an AI explanation if useful. Export from stored facts and include
   limitations and sources.

### 7.2 Reviewers

1. Open a completed run and its stored results.
2. Check evidence labels, units, frozen versions, and the comparison compatibility.
3. Confirm the ecological card is `not_estimable` unless an approved local model exists.
4. Preview the redacted public schema.
5. Publish or reject with a reason. Publication is a reviewed snapshot, not regulatory approval.
6. Withdraw public access immediately if a published snapshot is found to be misleading.

### 7.3 Public visitors

Public pages show only explicitly published, redacted summaries with source dates and limitations.
They do not expose drafts, raw files, internal notes, or unpublished runs.

---

## 8. Security and privacy

- Argon2 password hashing; opaque random session tokens stored only as hashes.
- `__Host-pv_session` cookie: `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`.
- Exact-origin and CSRF checks on state-changing private requests, including login.
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
| Runs stay `queued` | Worker not running | Start `PYTHONPATH=. python3 -m app.jobs.worker`. |
| `503`/connection error from API | Wrong `DATABASE_URL`, pooler vs direct mismatch, or Supabase paused | Verify the URI, password encoding, and project status; bootstrap with the direct connection. |
| `401 authentication_required` | Missing/expired cookie, or cookie rejected over plain HTTP | Use `http://localhost` for development; production must be HTTPS. |
| `403 csrf_rejected` | Missing `X-CSRF-Token` or untrusted `Origin` | Fetch the token from login/session and send the exact allowed origin. |
| `403 insufficient_role` | Reviewer attempting an analyst mutation | Use an analyst/administrator account, or wait for the reviewer publication guard. |
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
| Explanation routes | Table and repository helpers exist; API routes are planned. Contract path (`/runs/{id}/explain`) differs from the master plan (`/explanations`). | Backend implementation; resolve naming first. |
| Publication routes | `publications` table and helpers exist; routes are planned. Contract path differs from the master plan (`/publications`). | Backend implementation; resolve naming first. |
| Withdrawal | No `status`/`withdrawn_at` column yet. | Schema change, then route. |
| Reviewer publication | Current mutation guard allows analyst/administrator only. | Add a reviewer-capable guard. |
| Run list | `list_runs()` exists; no `GET /runs` route. | Mount route. |
| Catalog auth | `GET /catalogs/*` is currently unauthenticated. | Decide public vs private; add `require_session` if private. |
| Treatment identity | Pax Silica remains unverified pending a technical source. | Researchers + adviser. |
| Ecological model | No validated local exposure–response model or paired observations. | Domain adviser; otherwise formal scope revision. |
| Energy ML | Deterministic baseline only; no training dataset or approved model artifact. | Research track with chronological splits and naive-baseline comparison. |
| Factor data | Catalog serves 2024 factors; sample JSON is 2023. | Curate and version one authoritative factor set. |
| Deployment plans | Supabase/Vercel/Railway choices must be confirmed against actual quotas and regions. | Technical lead. |

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

See `CONTEXT.md` for the full domain glossary and `docs/API_CONTRACTS.md` for endpoint-level
schemas, headers, status codes, and error formats.
