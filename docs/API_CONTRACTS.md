# Pax Virentia — API Contracts

**Status:** Reference contract for the private workspace and public report portal  
**Version:** 1.0 · 20 October 2026  
**API base:** `/api/v1`  
**Source of truth:** `Pax-Virentia-System-Design.md`, `CONTEXT.md`, the master implementation plan, and the current FastAPI application.

> **Contract status.** This document specifies the agreed contract for the full system. A small
> number of endpoints are not yet routed in the current backend; see
> [§11 Implementation alignment](#11-implementation-alignment). Where implementation and this
> contract differ, this document is the target and the difference is listed explicitly rather than
> hidden. Do not infer scientific validity from HTTP success.

---

## 1. Scientific boundaries that the API enforces

| Boundary | Contract behaviour |
| --- | --- |
| Pax Silica specification | Catalog entry is permanently labelled `evidence_status: "unverified"` until a technical source resolves the process definition (Ch. 2, pp. 26–27). A client-supplied technology specification may only declare `synthetic`, `assumed`, or `unverified`; it can never claim approval. |
| Ecological indicator | Returns `status: "not_estimable"`, `value: null`, a human-readable `reason`, and `required_evidence[]`. It never returns a fabricated damage percentage, a zero-impact result, or a sustainability verdict. Gating requires an adviser-approved local exposure–response model and paired observations. |
| Carbon | Strictly electricity-associated grid emissions (Scope 2). No embodied, direct process, transport, or full life-cycle emissions are included. A `CO2` factor yields `kg CO2`; only a `CO2e` factor yields `kg CO2e`. Factor region, reporting year, and method must match the scenario. |
| Currency | PHP only. `currency` is the literal `"PHP"`; non-PHP requests are rejected. No live tariff lookup is performed. |
| Units | SI plus PHP. Energy `kWh`, intensity `kWh/m³`, volume `m³`, flow `m³/h`, dose `mg/L`, emissions `kg CO2e` or `kg CO2`, cost `PHP`. |
| Missing data | Absent evidence yields an explicit status or `null`; it is never coerced to `0`. |

---

## 2. Transport, authentication, and headers

### 2.1 Session model

- Opaque server-side sessions. The browser receives a `__Host-pv_session` cookie:
  `Secure; HttpOnly; SameSite=Lax; Path=/`, no `Domain` attribute.
- The login response also returns a CSRF token. The browser must send it as `X-CSRF-Token` on every
  state-changing private request.
- Session lifetime: 24 hours, or 720 hours when `remember: true`.
- A session token is never returned in a JSON body other than the login response's cookie; do not
  store it in `localStorage`.

### 2.2 Required and supported headers

| Header | When | Rule |
| --- | --- | --- |
| `Origin` | All state-changing private requests | Must exactly match an entry in `ALLOWED_ORIGINS`, otherwise `403 origin_rejected` or `403 csrf_rejected`. |
| `X-CSRF-Token` | All private `POST` requests made by an analyst/administrator | Required; constant-time compared against the session's stored CSRF hash. |
| `Idempotency-Key` | `POST /api/v1/runs` | Required. 1–200 characters. Bound to user + endpoint + request hash. |
| `Content-Type` | JSON endpoints | `application/json`. |
| `Content-Type` | CSV ingestion | `text/csv` or `application/csv`. Uploads above 10 MB are rejected with `413`. |
| `X-Request-ID` | Response | Echoed back by the API for support and log correlation; also present in error bodies. |
| `Cache-Control` | Response | `private, no-store` on every `/api/v1` response. |

### 2.3 Roles

| Role | API capability |
| --- | --- |
| `analyst` | Create scenarios/revisions, submit and cancel runs, compare, inspect datasets, request explanations, create publications (planned). |
| `administrator` | Same as analyst, plus catalog/model administration and publication withdrawal (planned endpoints). |
| `reviewer` | Read workspace evidence and results; approve/reject publications (planned). The current backend role guard admits `analyst` and `administrator` only for mutating routes. |
| Public visitor | Read-only `GET /api/v1/public/reports` and `GET /api/v1/public/reports/{slug}`. No access to drafts, raw files, or internal notes. |

### 2.4 Standard success envelope

Single resources are returned as a JSON object. Collections use:

```json
{
  "items": [],
  "limit": 20,
  "offset": 0
}
```

### 2.5 Standard error format

All API errors, including validation errors, use:

```json
{
  "error": {
    "code": "invalid_parameters",
    "message": "Scenario parameters are invalid.",
    "field_errors": [
      { "field": "volume_m3", "message": "Flow and pump hours cannot deliver the required service volume." }
    ],
    "request_id": "0b6f4b1e-6a2a-4f1e-9d30-0d0f1f0f8f11"
  }
}
```

`field_errors` is always an array (possibly empty). CSV inspection may include `row` in a field
error. The API never returns SQL, credentials, stack traces, or provider traces.

| Status | Meaning |
| --- | --- |
| `200 OK` | Successful read or comparison. |
| `201 Created` | Scenario, revision, dataset, or publication created. |
| `202 Accepted` | Run submitted or cancellation requested; poll the status URL. |
| `401 Unauthorized` | No valid session (`authentication_required`) or bad credentials (`invalid_credentials`). |
| `403 Forbidden` | Role (`insufficient_role`), origin (`origin_rejected`), CSRF (`csrf_rejected`), or ownership (`run_ownership_required`). |
| `404 Not Found` | Resource not found. Stable codes: `scenario_not_found`, `revision_not_found`, `run_not_found`, `dataset_not_found`, `publication_not_found`. |
| `409 Conflict` | State or idempotency conflict: `idempotency_conflict`, `results_not_available`, `run_already_terminal`, `comparison_requires_completed_runs`. |
| `413 Payload Too Large` | CSV over 10 MB. |
| `415 Unsupported Media Type` | CSV upload without a CSV content type. |
| `422 Unprocessable Entity` | Invalid input or incompatible scientific assumptions: `invalid_request`, `invalid_parameters`, `invalid_csv*`, `incompatible_comparison`. |
| `429 Too Many Requests` | Quota or rate limit (reserved). |
| `500 Internal Server Error` | Unexpected failure (`internal_error`); the run, not the science, has failed. |

---

## 3. Authentication

### 3.1 `POST /api/v1/auth/login`

Establishes a session and sets the `__Host-pv_session` cookie.

**Headers:** trusted `Origin`. No session required.

**Request**

```json
{
  "email": "ana.santos@example.com",
  "password": "pax-virentia-dev",
  "remember": false
}
```

`remember` is optional (default `false`); `remember_me` is accepted as a compatibility alias.

**Response `200`**

```json
{
  "user": {
    "id": "6b1c0f6e-6f4a-4f4c-9d6a-2f5f2a7c9b11",
    "email": "ana.santos@example.com",
    "display_name": "Ana Santos",
    "role": "analyst"
  },
  "csrf_token": "V8f...opaque...",
  "expires_in_hours": 24
}
```

The response also sets:

```http
Set-Cookie: __Host-pv_session=<opaque>; Max-Age=86400; Path=/; Secure; HttpOnly; SameSite=Lax
```

**Errors:** `401 invalid_credentials`, `403 origin_rejected`, `422 invalid_request`.

### 3.2 `POST /api/v1/auth/logout`

Revokes the current session and clears the cookie. **Session required.**

**Response `200`**

```json
{ "status": "signed_out" }
```

**Errors:** `401 authentication_required`.

### 3.3 `GET /api/v1/auth/session`

Returns the authenticated user. **Session required.**

**Response `200`**

```json
{
  "user": {
    "id": "6b1c0f6e-6f4a-4f4c-9d6a-2f5f2a7c9b11",
    "email": "ana.santos@example.com",
    "display_name": "Ana Santos",
    "role": "analyst"
  }
}
```

**Errors:** `401 authentication_required`.

---

## 4. Catalogs

Catalog reads are read-only. In the current backend they are **not** session-guarded; they expose
curated reference data only. See [§11](#11-implementation-alignment).

### 4.1 `GET /api/v1/catalogs/factors`

**Response `200`**

```json
{
  "items": [
    {
      "id": "ph-luzon-2024",
      "version_id": "ph-luzon-2024",
      "name": "Luzon-Visayas Grid Average 2024",
      "grid_region": "Luzon-Visayas",
      "reporting_year": 2024,
      "gas_basis": "CO2e",
      "factor_method": "Operating Margin / Grid Emission Factor",
      "kg_per_kwh": 0.7122,
      "evidence_status": "externally_sourced",
      "source_ref": "DOE Philippines Grid Emission Factors 2024"
    }
  ]
}
```

Rules: `gas_basis` is `CO2` or `CO2e`; `kg_per_kwh` must be positive; `evidence_status` is one of
`synthetic`, `assumed`, `unverified`, `externally_sourced`. A generation-mix factor is not silently
substituted for a different accounting boundary.

### 4.2 `GET /api/v1/catalogs/technologies`

**Response `200`**

```json
{
  "items": [
    {
      "id": "pax-silica-v1",
      "name": "Pax Silica Advanced Coagulation & Filtration",
      "version_id": "pax-silica-v1",
      "source_ref": "Pax Virentia Engineering Pilot Specs Rev B",
      "evidence_status": "unverified",
      "capacity_m3_per_hour": 150.0,
      "pump_power_kw": 22.0,
      "mixer_power_kw": 7.5,
      "flow_rate_range": { "minimum": 10.0, "maximum": 150.0 },
      "pump_duty_hours_range": { "minimum": 1.0, "maximum": 24.0 },
      "mixing_load_range": { "minimum": 0.2, "maximum": 1.0 },
      "chemical_dose_range": { "minimum": 5.0, "maximum": 80.0 }
    }
  ]
}
```

`Pax Silica` is shown as `unverified`; the conventional specification is `assumed`. Clients must
surface both labels wherever the technology is displayed.

### 4.3 `GET /api/v1/catalogs/models`

**Response `200`**

```json
{
  "items": [
    {
      "module": "energy",
      "version": "equipment-duty-v1",
      "name": "Equipment Duty Energy Model",
      "status": "production",
      "description": "Deterministic equipment power, duty cycle, and load multiplier calculation"
    },
    {
      "module": "carbon",
      "version": "electricity-factor-v1",
      "name": "Electricity Factor Grid Model",
      "status": "production",
      "description": "Strictly electricity-associated grid emissions (Scope 2) using DOE published factors"
    },
    {
      "module": "economics",
      "version": "period-opex-v1",
      "name": "Period OPEX Economic Model",
      "status": "production",
      "description": "Calculates power cost, chemical consumable cost, labor, maintenance, and non-energy expenses in PHP"
    },
    {
      "module": "ecology",
      "version": "evidence-gate-v1",
      "name": "Evidence Gate Ecological Model",
      "status": "restricted",
      "description": "Evidence gate requiring approved local ecological study; returns not_estimable without local calibration"
    }
  ]
}
```

---

## 5. Scenarios and revisions

A **scenario** is a proposal; a **scenario revision** is a frozen parameter set. Editing creates a
new revision; historical runs never change.

### 5.1 Scenario parameters object

Used by `POST /scenarios` and `POST /scenarios/{id}/revisions`. Additional fields are forbidden
(`extra="forbid"`).

```json
{
  "volume_m3": 61600,
  "period_start": "2026-01-01T00:00:00+08:00",
  "period_end": "2026-01-05T23:59:59+08:00",
  "currency": "PHP",
  "grid_region": "Luzon-Visayas",
  "flow_rate_m3_per_hour": 120,
  "pump_duty_hours": 24,
  "mixing_hours": 18.5,
  "mixing_load_multiplier": 0.8,
  "chemical_dose_mg_per_l": 3.3,
  "technology": {
    "version_id": "pax-silica-v1",
    "source_ref": "Pax Virentia Engineering Pilot Specs Rev B",
    "evidence_status": "unverified",
    "capacity_m3_per_hour": 150,
    "pump_power_kw": 22,
    "mixer_power_kw": 7.5,
    "flow_rate_range": { "minimum": 10, "maximum": 150 },
    "pump_duty_hours_range": { "minimum": 1, "maximum": 24 },
    "mixing_load_range": { "minimum": 0.2, "maximum": 1 },
    "chemical_dose_range": { "minimum": 5, "maximum": 80 }
  },
  "factor": {
    "version_id": "ph-luzon-2024",
    "source_ref": "DOE Philippines Grid Emission Factors 2024",
    "grid_region": "Luzon-Visayas",
    "reporting_year": 2026,
    "gas_basis": "CO2e",
    "factor_method": "Operating Margin / Grid Emission Factor",
    "kg_per_kwh": 0.7122,
    "evidence_status": "externally_sourced"
  },
  "costs": {
    "tariff_php_per_kwh": 10.45,
    "chemical_price_php_per_kg": 48.0,
    "labor_php": 25000,
    "maintenance_php": 8000,
    "other_nonenergy_php": 0,
    "source_ref": "Plant finance assumptions, Dec 2025"
  },
  "dataset_version_id": null
}
```

**Field rules**

| Field | Type | Rule |
| --- | --- | --- |
| `volume_m3` | number | `> 0`. |
| `period_start`, `period_end` | ISO 8601 string | Must include a timezone; `end > start`; at most 365 days. Canonicalised to UTC for storage; original offset retained in `source_time_basis`. |
| `currency` | string | Exactly `"PHP"`. |
| `grid_region` | string | Nonempty; must equal `factor.grid_region` when carbon is requested. |
| `flow_rate_m3_per_hour` | number | `> 0`; must not exceed `technology.capacity_m3_per_hour`. |
| `pump_duty_hours`, `mixing_hours` | number | `>= 0`; must not exceed the reporting period duration. |
| `mixing_load_multiplier` | number | `>= 0`; within `technology.mixing_load_range`. |
| `chemical_dose_mg_per_l` | number | `>= 0`; within `technology.chemical_dose_range`. |
| `technology.evidence_status` | enum | `synthetic`, `assumed`, `unverified` only. |
| `technology.*_range` | object | `{minimum, maximum}`, `minimum <= maximum`, nonnegative. |
| `factor` | object or null | Required when `carbon` is requested. `reporting_year` must cover the whole period in Asia/Manila. `gas_basis` is `CO2` or `CO2e`. |
| `costs.*` | number | Nonnegative; `source_ref` required. |
| `dataset_version_id` | UUID or null | If supplied, the dataset must have no critical missing values, invalid values, missing required columns, or duplicate rows. |
| Delivery feasibility | cross-field | `flow_rate_m3_per_hour × pump_duty_hours >= volume_m3`. A scenario that cannot deliver the required volume is rejected. |

**Error code:** `422 invalid_parameters`, with one or more `field_errors`.

### 5.2 `POST /api/v1/scenarios`

**Permission:** analyst/administrator + CSRF + trusted Origin.

**Request**

```json
{
  "name": "Pax Silica — Intervention draft",
  "kind": "intervention",
  "parameters": { "...": "Scenario parameters object" }
}
```

`kind` is `baseline` or `intervention` (default `baseline`).

**Response `201`**

```json
{
  "id": "b5d1f1d0-53bb-4a0d-a1c6-0f4a5f5a9a10",
  "name": "Pax Silica — Intervention draft",
  "kind": "intervention",
  "latest_revision": {
    "id": "e8dd7a1c-4d8e-4a0b-9a5c-6c9f0f2b7a31",
    "scenario_id": "b5d1f1d0-53bb-4a0d-a1c6-0f4a5f5a9a10",
    "revision_no": 1,
    "parameters": { "...": "canonicalised parameters" },
    "created_by": "6b1c0f6e-6f4a-4f4c-9d6a-2f5f2a7c9b11",
    "created_at": "2026-10-20T12:00:00+00:00"
  }
}
```

**Errors:** `401`, `403`, `422`.

### 5.3 `GET /api/v1/scenarios`

**Permission:** any valid session.

**Query:** `limit` (1–100, default 20), `offset` (`>= 0`, default 0).

**Response `200`**

```json
{
  "items": [
    {
      "id": "b5d1f1d0-53bb-4a0d-a1c6-0f4a5f5a9a10",
      "name": "Pax Silica — Intervention draft",
      "kind": "intervention",
      "created_by": "6b1c0f6e-6f4a-4f4c-9d6a-2f5f2a7c9b11",
      "created_at": "2026-10-20T12:00:00+00:00",
      "revision_id": "e8dd7a1c-4d8e-4a0b-9a5c-6c9f0f2b7a31",
      "revision_no": 2
    }
  ],
  "limit": 20,
  "offset": 0
}
```

Only the latest revision per scenario is returned here.

### 5.4 `POST /api/v1/scenarios/{scenario_id}/revisions`

Appends an immutable revision.

**Permission:** analyst/administrator + CSRF.

**Request**

```json
{ "parameters": { "...": "Scenario parameters object" } }
```

**Response `201`** — the revision object (`id`, `scenario_id`, `revision_no`, `parameters`,
`created_by`, `created_at`).

**Errors:** `404 scenario_not_found`, `422 invalid_parameters`.

### 5.5 `GET /api/v1/scenarios/{scenario_id}/revisions`

**Permission:** any valid session. **Query:** `limit`, `offset`.

**Response `200`** — `{items, limit, offset}` where each item is a revision object.

**Errors:** `404 scenario_not_found`.

---

## 6. Simulation runs

### 6.1 `POST /api/v1/runs`

Freezes a scenario revision and queues a durable job. The HTTP request never waits for the
calculation.

**Permission:** analyst/administrator + CSRF + trusted Origin.

**Headers**

```http
Idempotency-Key: 4d0f5cbb-2a5d-4b6e-9f3c-6f9f7b1d2e88
Content-Type: application/json
```

**Request**

```json
{
  "scenario_revision_id": "e8dd7a1c-4d8e-4a0b-9a5c-6c9f0f2b7a31",
  "requested_modules": ["energy", "carbon", "economics", "ecology"]
}
```

`requested_modules` is optional and defaults to all four. Values must be unique and drawn from
`energy`, `carbon`, `economics`, `ecology`.

**Response `202`**

```http
Location: /api/v1/runs/0f2f9d6b-6f2e-4c0e-8b7e-8e3b9a4c1d22
Retry-After: 2
```

```json
{
  "run_id": "0f2f9d6b-6f2e-4c0e-8b7e-8e3b9a4c1d22",
  "status": "queued",
  "status_url": "/api/v1/runs/0f2f9d6b-6f2e-4c0e-8b7e-8e3b9a4c1d22"
}
```

**Idempotency**

- Same user + key + identical payload → the original run reference is replayed (`202`).
- Same key + different payload → `409 idempotency_conflict`.
- Concurrent duplicate submissions are serialised by a unique key constraint; the loser replays
  the winner.

**Errors:** `401`, `403`, `404 revision_not_found`, `409 idempotency_conflict`,
`422 invalid_parameters` (including missing factor, incompatible factor year/region, failed dataset
quality gate), `422 invalid_request` for a missing `Idempotency-Key`.

### 6.2 `GET /api/v1/runs`

**Permission:** any valid session. **Status:** planned (see §11).

**Query:** `limit` (1–100, default 20), `offset`, optional `scenario_revision_id`.

**Response `200`**

```json
{
  "items": [
    {
      "id": "0f2f9d6b-6f2e-4c0e-8b7e-8e3b9a4c1d22",
      "scenario_revision_id": "e8dd7a1c-4d8e-4a0b-9a5c-6c9f0f2b7a31",
      "scenario_name": "Pax Silica — Intervention draft",
      "revision_no": 2,
      "kind": "intervention",
      "status": "succeeded",
      "snapshot_hash": "9f2c…a41b",
      "code_version": "0.1.0-dev",
      "created_at": "2026-10-20T12:01:00+00:00",
      "started_at": "2026-10-20T12:01:02+00:00",
      "ended_at": "2026-10-20T12:01:03+00:00",
      "cancel_requested": false,
      "frozen_inputs": { "...": "immutable snapshot" }
    }
  ],
  "limit": 20,
  "offset": 0
}
```

### 6.3 `GET /api/v1/runs/{run_id}`

**Permission:** any valid session.

**Response `200`**

```json
{
  "id": "0f2f9d6b-6f2e-4c0e-8b7e-8e3b9a4c1d22",
  "scenario_revision_id": "e8dd7a1c-4d8e-4a0b-9a5c-6c9f0f2b7a31",
  "status": "running",
  "snapshot_hash": "9f2c…a41b",
  "code_version": "0.1.0-dev",
  "created_at": "2026-10-20T12:01:00+00:00",
  "started_at": "2026-10-20T12:01:02+00:00",
  "ended_at": null,
  "cancel_requested": false,
  "error": null
}
```

`error` is `null` or:

```json
{ "code": "calculation_failed", "message": "Simulation calculation failed." }
```

**Run states:** `queued → running → succeeded | failed | cancelled`. A cancellation request is
recorded separately until the worker acknowledges it. Retrying a failed job creates a new attempt,
never a rewritten historical result.

**Errors:** `404 run_not_found`.

### 6.4 `GET /api/v1/runs/{run_id}/results`

Returns the immutable result envelope. Available only when the run has succeeded.

**Permission:** any valid session.

**Response `200`**

```json
{
  "run_id": "0f2f9d6b-6f2e-4c0e-8b7e-8e3b9a4c1d22",
  "snapshot_hash": "9f2c…a41b",
  "code_version": "0.1.0-dev",
  "requested_modules": ["energy", "carbon", "economics", "ecology"],
  "energy": {
    "total_kwh": 22176.0,
    "energy_intensity_kwh_per_m3": 0.36,
    "status": "valid",
    "warnings": []
  },
  "carbon": {
    "emissions_kg_co2e": 15793.7,
    "gas_basis": "CO2e",
    "grid_region": "Luzon-Visayas",
    "factor_kg_per_kwh": 0.7122,
    "delta_kg_co2e": null,
    "unit": "kg CO2e"
  },
  "economics": {
    "electricity_cost_php": 231739.2,
    "chemical_cost_php": 9757.44,
    "labor_cost_php": 25000,
    "maintenance_cost_php": 8000,
    "other_cost_php": 0,
    "total_opex_php": 274496.64,
    "chemical_kg_used": 203.28,
    "net_savings_php": null,
    "simple_payback_years": null
  },
  "ecology": {
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
  },
  "metrics": [
    { "key": "energy", "value": 22176.0, "unit": "kWh", "status": "valid", "interval_key": "total" },
    { "key": "carbon", "value": 15793.7, "unit": "kg CO2e", "status": "valid", "interval_key": "total" },
    { "key": "economics", "value": 274496.64, "unit": "PHP", "status": "valid", "interval_key": "total" },
    {
      "key": "ecology",
      "value": null,
      "unit": null,
      "status": "not_estimable",
      "reason": "Validated local exposure-response model or paired observation dataset is unavailable.",
      "required_evidence": ["..."],
      "interval_key": "total"
    }
  ],
  "warnings": [
    "Treatment specification is unverified; these outputs do not establish plant performance.",
    "Input values and supporting ranges must be independently reviewed before scientific use."
  ],
  "provenance": {
    "code_version": "0.1.0-dev",
    "model_versions": {
      "energy": "equipment-duty-v1",
      "carbon": "electricity-factor-v1",
      "economics": "period-opex-v1",
      "ecology": "evidence-gate-v1"
    },
    "technology_version": "pax-silica-v1",
    "technology_source_ref": "Pax Virentia Engineering Pilot Specs Rev B",
    "technology_evidence_status": "unverified",
    "factor": { "...": "frozen factor object" },
    "cost_assumptions": { "...": "frozen cost object" },
    "dataset": { "...": "frozen dataset metadata or null" },
    "unit_system": "SI / PHP",
    "reporting_timezone": "Asia/Manila",
    "emissions_boundary": "electricity-associated only",
    "random_seed": null
  }
}
```

**Gas-basis detail.** When the frozen factor is `CO2`, the carbon object omits `emissions_kg_co2e`
and instead returns `emissions_kg_co2` (and `delta_kg_co2`); `unit` is `kg CO`. Never relabel a
CO2-only factor as CO2e.

**Absent modules.** If a module is not requested, its object is omitted and its metric is absent
from `metrics`. Consumers must not display a fabricated zero.

**Errors:** `404 run_not_found`, `409 results_not_available` (run not succeeded or not yet
published).

### 6.5 `POST /api/v1/runs/{run_id}/cancel`

Requests cancellation. Queued work is cancelled immediately; running work is cancelled when the
worker acknowledges. Only the submitting analyst may cancel.

**Permission:** analyst/administrator + CSRF.

**Response `202`** — the run status object from §6.3.

**Errors:** `403 run_ownership_required`, `404 run_not_found`, `409 run_already_terminal`.

---

## 7. Comparisons

### 7.1 `POST /api/v1/comparisons`

Compares two completed, scientifically compatible runs. It never recomputes either run and never
creates a third altered result set.

**Permission:** analyst/administrator + CSRF.

**Request**

```json
{
  "baseline_run_id": "2b6a1c0e-4f3d-4a1b-9d8e-1c2b3a4d5e6f",
  "intervention_run_id": "0f2f9d6b-6f2e-4c0e-8b7e-8e3b9a4c1d22"
}
```

**Compatibility checks.** Both runs must have succeeded. The API compares frozen values and returns
`422 incompatible_comparison` with one `field_errors` entry per mismatch when any differ:

- `volume_m3`
- `period_start` and `period_end` (canonical UTC instants)
- `currency` (must be PHP)
- `grid_region`
- `emissions_boundary` (must be `electricity-associated only`)
- `gas_basis` and `factor_method` when both runs include carbon

**Response `200`**

```json
{
  "baseline_run_id": "2b6a1c0e-4f3d-4a1b-9d8e-1c2b3a4d5e6f",
  "intervention_run_id": "0f2f9d6b-6f2e-4c0e-8b7e-8e3b9a4c1d22",
  "compatible": true,
  "volume_m3": 61600,
  "period_start": "2025-12-31T16:00:00+00:00",
  "period_end": "2026-01-05T15:59:59+00:00",
  "currency": "PHP",
  "deltas": [
    {
      "key": "energy",
      "baseline": 24640.0,
      "intervention": 22176.0,
      "delta": -2464.0,
      "delta_pct": -10.0,
      "unit": "kWh",
      "baseline_status": "valid",
      "intervention_status": "valid"
    },
    {
      "key": "carbon",
      "baseline": 17548.6,
      "intervention": 15793.7,
      "delta": -1754.9,
      "delta_pct": -10.0,
      "unit": "kg CO2e",
      "baseline_status": "valid",
      "intervention_status": "valid"
    },
    {
      "key": "economics",
      "baseline": 312458.0,
      "intervention": 289120.0,
      "delta": -23338.0,
      "delta_pct": -7.47,
      "unit": "PHP",
      "baseline_status": "valid",
      "intervention_status": "valid"
    },
    {
      "key": "ecology",
      "baseline": null,
      "intervention": null,
      "delta": null,
      "delta_pct": null,
      "unit": null,
      "baseline_status": "not_estimable",
      "intervention_status": "not_estimable"
    }
  ],
  "net_savings_php": 23338.0
}
```

**Semantics**

- `delta = intervention − baseline`.
- `delta_pct` is `null` when the baseline value is `0` or either side is not `valid`.
- `net_savings_php` is the negated OPEX delta (baseline OPEX minus intervention OPEX). Negative
  savings mean a cost increase.
- The ecological delta remains `null` with `not_estimable`; it is never rendered as zero.
- Only compatible runs may feed a percent-difference chart.

**Errors:** `404 run_not_found`, `409 comparison_requires_completed_runs`,
`422 incompatible_comparison`.

---

## 8. AI explanations

AI narrative is optional and strictly derived from stored result facts. It never calculates
authoritative metrics and never blocks or removes numerical results. If the provider is unavailable,
the API returns a deterministic template narrative.

### 8.1 `POST /api/v1/runs/{run_id}/explain`

**Permission:** analyst/administrator + CSRF. **Status:** planned (see §11).

**Request**

```json
{ "focus": "general" }
```

`focus` is optional; default `general`.

**Response `200`**

```json
{
  "id": "b0d7b5f1-1c9e-4a6b-8d0f-1f7e3a9c2b44",
  "run_id": "0f2f9d6b-6f2e-4c0e-8b7e-8e3b9a4c1d22",
  "focus": "general",
  "model_id": "gemini-2.5-flash",
  "prompt_version": "explain-v1",
  "validation_status": "validated",
  "narrative": "The intervention uses less electricity than the baseline over the same period. Ecological effects remain not estimable because no validated local model is available.",
  "key_drivers": [
    { "metric_key": "energy", "direction": "decrease", "statement": "Electricity demand is lower." }
  ],
  "grounded_evidence": [
    { "metric_key": "energy", "value": 22176.0, "unit": "kWh" }
  ],
  "generated_at": "2026-10-20T12:05:00+00:00"
}
```

**Validation rules**

- Every referenced metric key and numerical value must exist in the stored result envelope.
- Required limitations (unverified technology, Scope 2 boundary, `not_estimable` ecology) must be
  present.
- Unsupported numbers, sources, or claims cause the narrative to be discarded and replaced by a
  deterministic template (`validation_status: "template"`).
- The narrative is labelled **AI-generated explanation** in the UI; approved numerical values are
  always rendered from stored results, not from prose.

**Errors:** `401`, `403`, `404 run_not_found`, `409 results_not_available`,
`502`/`503` provider failure only when no template fallback is possible.

### 8.2 `GET /api/v1/runs/{run_id}/explain`

**Permission:** any valid session. **Status:** planned.

**Response `200`** — the stored explanation object (§8.1). Returns `404 explanation_not_found` when
none has been generated.

---

## 9. Public reports

Public reporting is a reviewed, redacted snapshot. Publication does not imply regulatory approval.
Private draft edits never silently change published content.

### 9.1 `POST /api/v1/runs/{run_id}/publish`

**Permission:** reviewer/administrator (planned; see §11) + CSRF.

**Request**

```json
{
  "slug": "pax-silica-pilot-2026-01",
  "title": "Pax Silica pilot — representative plant comparison",
  "summary": "Electricity demand and electricity-associated emissions are lower in the modelled intervention. Ecological effects are not estimable."
}
```

**Response `201`**

```json
{
  "id": "6a2c8f1e-3a4b-4c5d-8e9f-0a1b2c3d4e5f",
  "run_id": "0f2f9d6b-6f2e-4c0e-8b7e-8e3b9a4c1d22",
  "slug": "pax-silica-pilot-2026-01",
  "title": "Pax Silica pilot — representative plant comparison",
  "summary": "Electricity demand and electricity-associated emissions are lower in the modelled intervention. Ecological effects are not estimable.",
  "published_by": "8f1c…",
  "published_at": "2026-10-20T12:10:00+00:00",
  "view_count": 0
}
```

**Errors:** `401`, `403`, `404 run_not_found`, `409 results_not_available`,
`409 slug_conflict` (planned), `422 invalid_request`.

### 9.2 `GET /api/v1/public/reports/{slug}`

**Permission:** public, unauthenticated. No session or CSRF.

**Response `200`**

```json
{
  "slug": "pax-silica-pilot-2026-01",
  "title": "Pax Silica pilot — representative plant comparison",
  "summary": "Electricity demand and electricity-associated emissions are lower in the modelled intervention. Ecological effects are not estimable.",
  "published_at": "2026-10-20T12:10:00+00:00",
  "published_by_name": "Ana Santos",
  "view_count": 12,
  "snapshot": {
    "volume_m3": 61600,
    "period_start": "2025-12-31T16:00:00+00:00",
    "period_end": "2026-01-05T15:59:59+00:00",
    "currency": "PHP",
    "energy_kwh": 22176.0,
    "energy_intensity_kwh_per_m3": 0.36,
    "emissions": { "value": 15793.7, "unit": "kg CO2e", "boundary": "electricity-associated only" },
    "opex_php": 274496.64,
    "ecology": {
      "status": "not_estimable",
      "value": null,
      "reason": "Validated local exposure-response model or paired observation dataset is unavailable."
    },
    "limitations": [
      "Treatment specification is unverified.",
      "Emissions cover purchased electricity only.",
      "Ecological effects are not estimable without validated local evidence."
    ]
  }
}
```

The public schema never includes raw CSV bytes, source files, internal notes, session data, or
unpublished runs. `view_count` is incremented on read.

**Errors:** `404 publication_not_found`.

### 9.3 `GET /api/v1/public/reports`

**Permission:** public, unauthenticated.

**Query:** `limit` (1–100, default 20), `offset`.

**Response `200`**

```json
{
  "items": [
    {
      "id": "6a2c8f1e-3a4b-4c5d-8e9f-0a1b2c3d4e5f",
      "run_id": "0f2f9d6b-6f2e-4c0e-8b7e-8e3b9a4c1d22",
      "slug": "pax-silica-pilot-2026-01",
      "title": "Pax Silica pilot — representative plant comparison",
      "summary": "Electricity demand and electricity-associated emissions are lower in the modelled intervention. Ecological effects are not estimable.",
      "published_at": "2026-10-20T12:10:00+00:00",
      "view_count": 12,
      "published_by_name": "Ana Santos"
    }
  ],
  "limit": 20,
  "offset": 0
}
```

### 9.4 Withdrawal (planned)

`POST /api/v1/public/reports/{id}/withdraw` — administrator only. Revokes public access immediately
and retains the internal audit record. Response `200` with the publication status set to
`withdrawn`. Subsequent public reads return `404`. **Status:** planned.

---

## 10. Datasets (implemented, supporting the scenario contract)

These endpoints are part of the evidence pipeline even though the assigned endpoint list focuses on
scenarios, runs, comparisons, explanations, and reports.

### 10.1 `POST /api/v1/datasets/inspect`

**Permission:** analyst/administrator. **Content-Type:** `text/csv`.

Raw UTF-8 CSV, up to 10 MB and 50,000 rows. The response is a non-destructive quality report:

```json
{
  "row_count": 5,
  "column_count": 10,
  "columns": ["period_start", "period_end", "volume_m3", "electricity_kwh", "pump_hours", "mixing_hours", "chemical_dose_mg_per_l", "water_turbidity_ntu", "ph_level", "notes"],
  "missing_values": { "period_start": 0, "...": 0 },
  "critical_missing_values": 0,
  "missing_columns": [],
  "duplicate_rows": [],
  "invalid_values": [],
  "outliers": {
    "electricity_kwh": [
      { "row": 5, "value": 5240.0, "lower_bound": 4230.0, "upper_bound": 5440.0 }
    ]
  },
  "outlier_rule": "Tukey 1.5 IQR; linear-interpolated quartiles; rows retained",
  "content_hash": "9f2c…a41b",
  "schema_version": "plant-csv-v1"
}
```

Detection rules: required columns are `period_start`, `period_end`, `volume_m3`, `electricity_kwh`,
`pump_hours`; duplicate rows are reported by row number; overlapping reporting periods are invalid;
negative or nonfinite numeric measurements are invalid; outliers are flagged, never deleted.

**Errors:** `413 csv_too_large`, `415 unsupported_media_type`, `422 invalid_csv_encoding`,
`422 invalid_csv`, `422 invalid_csv_header`, `422 invalid_csv_shape`, `422 csv_too_many_rows`.

### 10.2 `POST /api/v1/datasets`

**Query:** `source_ref` (1–1000 chars), `evidence_status` (`measured`, `externally_sourced`,
`assumed`, `synthetic`). **Content-Type:** `text/csv`.

Stores the exact bytes and checksum with the quality report.

**Response `201`**

```json
{
  "id": "c2f4a8e0-1b3d-4c5e-8f9a-0b1c2d3e4f50",
  "content_hash": "9f2c…a41b",
  "quality_report": { "...": "§10.1 report" },
  "source_ref": "Plant logbook Jan 2026",
  "evidence_status": "measured"
}
```

### 10.3 `GET /api/v1/datasets/{dataset_id}/quality`

**Permission:** any valid session. Returns the stored quality report.

**Errors:** `404 dataset_not_found`.

---

## 11. Implementation alignment

The table records what the current backend routes expose versus this contract. Planned items are
owned by the backend implementation, not by this documentation task.

| Contract endpoint | Current backend | Notes |
| --- | --- | --- |
| `POST/GET /auth/login`, `/auth/logout`, `/auth/session` | Implemented | Matches this contract. |
| `GET /catalogs/factors` | Implemented | Catalog currently lists 2024 DOE/IEA factors, including a CO2-only factor; values differ from the 2023 sample JSON in `research/data/`. |
| `GET /catalogs/technologies` | Implemented | Pax Silica is `unverified`; conventional is `assumed`. |
| `GET /catalogs/models` | Implemented | Matches module/version names used in run provenance. |
| `POST/GET /scenarios`, `POST/GET /scenarios/{id}/revisions` | Implemented | Matches this contract. |
| `POST /runs` | Implemented | `202`, `Location`, `Retry-After: 2`, idempotency replay/conflict. |
| `GET /runs` | **Planned** | Repository `list_runs()` exists; no route is mounted. |
| `GET /runs/{id}` | Implemented | Matches this contract. |
| `GET /runs/{id}/results` | Implemented | `409 results_not_available` until succeeded. |
| `POST /runs/{id}/cancel` | Implemented | Submission-owner only. |
| `POST /comparisons` | Implemented | Compatibility includes region and factor basis/method. |
| `POST/GET /runs/{id}/explain` | **Planned** | The master plan specifies `/runs/{id}/explanations` (plural). The `ai_explanations` table and repository read/write helpers already exist. |
| `POST /runs/{id}/publish` | **Planned** | The master plan specifies `POST /publications`. Repository `create_publication()` exists. |
| `GET /public/reports/{slug}` | **Planned** | The master plan specifies `GET /publications/{public_id}`. Repository `get_publication_by_slug()` exists. |
| `GET /public/reports` | **Planned** | The master plan specifies `GET /publications`. Repository `list_publications()` exists. |
| `POST .../withdraw` | **Planned** | Table has no withdrawn column yet. |
| `POST/GET /datasets*` | Implemented | Supporting evidence pipeline. |

**Additional observations for the planner**

1. **Route naming.** Explanations and publications exist in the master plan under plural
   `/explanations` and `/publications` paths, while this task specifies singular `/explain`,
   `/publish`, and `/public/reports`. Pick one set before frontend wiring; do not implement both.
2. **Catalog authentication.** `GET /catalogs/*` currently requires no session. If catalog reads
   should be private, add `require_session` to those routes.
3. **Reviewer mutations.** `require_analyst` admits `analyst` and `administrator` only. Publishing
   and withdrawal for `reviewer` require a dedicated guard.
4. **Publication withdrawal.** The `publications` table has no `status` or `withdrawn_at` column,
   so withdrawal currently needs a schema addition rather than a route alone.
5. **View counting.** `GET` on a public report mutates `view_count`; this is acceptable for public
   reads but should remain outside any transaction that could block publication.

---

## 12. Cross-cutting contract rules

- Validate all numbers as finite; reject `NaN` and `Infinity`.
- Reject unknown body fields (`extra="forbid"`).
- Preserve `null` for unavailable scientific values; never coerce to `0`.
- Never accept client-supplied calculation results, model approvals, or evidence approvals.
- Escape CSV cells beginning with `=`, `+`, `-`, or `@` on export.
- Log request IDs, run IDs, durations, and stable error codes; never log passwords, session tokens,
  raw confidential uploads, or provider traces.
- Return `Cache-Control: private, no-store` on all `/api/v1` responses.
- Rate-limit login and AI explanation requests; apply a bounded retry policy to provider calls.
