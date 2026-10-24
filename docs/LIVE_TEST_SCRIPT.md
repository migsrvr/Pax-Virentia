# Pax Virentia — Live Test Script

Live site: https://pax-virentia.vercel.app · API: https://pax-virentia.onrender.com
Run the commands from the repo root in PowerShell. In Claude Code, prefix each one with `!`.
Use two browsers (or one normal window and one private window): **A = analyst**, **R = reviewer**.

---

## Step 1 — Create a reviewer account

`backend/.env` points at the production Supabase database.

```powershell
cd backend
.venv\Scripts\python -m app.bootstrap create-user --email reviewer@paxvirentia.org --role reviewer --name "Live Reviewer" --password "Rev!ewer-2026-Live"
cd ..
```

Expected output:
```
Store schema ready (migrations applied).
Provisioned account: reviewer@paxvirentia.org (role: reviewer)
```

| Check | Expected |
|---|---|
| Sign in on browser R with the reviewer email and password | Dashboard loads; the header shows **Live Reviewer · Reviewer** |
| Sidebar on R | Shows a **Review → Publication reviews** section |
| Sidebar on A (analyst) | No **Publication reviews** item |

> Email domains like `.test` are rejected. Use a normal domain. You can change the email and password above, but write down what you use.

---

## Step 2 — Lock the demo account

Production still has `ana.santos@example.com`, an analyst created by the old setup script, possibly with a public dev password. Give it a new random password:

```powershell
cd backend
.venv\Scripts\python -m app.bootstrap create-user --email ana.santos@example.com --role analyst --password "Locked-$(Get-Random -Minimum 100000000 -Maximum 999999999)-Demo"
cd ..
```

Expected: `Updated account: ana.santos@example.com (role: analyst)`

| Check | Expected |
|---|---|
| Sign in as `ana.santos@example.com` with `pax-virentia-dev` | **Email or password is incorrect.** |

---

## Step 3 — Fix Render auto-deploy (dashboard), then verify

1. Open https://dashboard.render.com/web/srv-dbdnqebncjis73are6h0 and go to **Settings → Build & Deploy**.
2. Under **Repository**, confirm it shows `migsrvr/Pax-Virentia`, branch `main`, and **Auto-Deploy: On Commit**.
3. If GitHub isn't connected for that repo: go to **Account settings → GitHub → Configure**, then grant the Render app access to `migsrvr/Pax-Virentia`.
4. Verify with an empty commit:

```powershell
git commit --allow-empty -m "Verify Render and Vercel auto-deploy"
git push origin main
```

| Check (within about 5 minutes) | Expected |
|---|---|
| Render dashboard → **Events** | A new deploy for the empty commit starts **automatically** and goes **Live** |
| Vercel dashboard → **Deployments** | A new **Production** deployment for the same commit shows **Ready** (Root Directory is now `apps/web`) |
| `curl.exe -s https://pax-virentia.onrender.com/health` | `{"status":"healthy","service":"Pax Virentia","version":"0.1.0"}` |

Fallback if Render still doesn't auto-deploy (run in WSL):
```bash
~/.render/bin/render deploys create srv-dbdnqebncjis73are6h0 --wait --confirm
```

---

## Step 4 — Full smoke test

### 4.1 Sign in (browser A)
- Go to https://pax-virentia.vercel.app/login and sign in with your seed analyst account (`SEED_USER_EMAIL` / `SEED_USER_PASSWORD` on Render). Tick **Remember me**.
- Expected: the dashboard loads. The header shows your name with the role **Analyst**.

### 4.2 Scenario A — Baseline (browser A → Simulations)

**Step 1 · Scenario and process**

| Field | Value |
|---|---|
| Scenario name | `LT Baseline — Conventional clarifier` |
| Scenario type | **Baseline** |
| Treatment specification | `Conventional Clarifier Baseline · conv-clarifier-v1 · assumed` |
| Dataset version UUID | *(leave empty)* |

**Step 2 · Operating conditions**

| Field | Value |
|---|---|
| Period start | `2024-03-01 00:00` (03/01/2024 12:00 AM) |
| Period end | `2024-03-02 00:00` (03/02/2024 12:00 AM) |
| Treated volume (m³) | `1200` |
| Flow rate (m³/h) | `100` |
| Pump duty hours (h) | `12` |
| Mixing hours (h) | `6` |
| Mixing load multiplier (×) | `1` |
| Chemical dose (mg/L) | `30` |

**Step 3 · Costs and emission factor**

| Field | Value |
|---|---|
| Electricity tariff (PHP/kWh) | `11` |
| Chemical price (PHP/kg) | `50` |
| Labor cost (PHP) | `4000` |
| Maintenance cost (PHP) | `1500` |
| Other non-energy cost (PHP) | `1200` |
| Cost assumptions source | `Live test assumptions` |
| Versioned factor | `Luzon-Visayas Grid Average 2024 · 2024 · CO2e` |

**Step 4 · Review and run:** click **Run simulation**, then wait for it to finish and open the results.

**Expected results (Results page)**

| Metric | Expected |
|---|---|
| Energy consumption | **534 kWh** |
| Energy intensity | **0.445 kWh/m³** |
| Energy breakdown | Pumps **444**, Mixers **90** |
| Electricity-associated emissions | **380.31 kg CO₂e** |
| Operating cost | **14,374 PHP** |
| Cost breakdown | Electricity **5,874** · Chemicals **1,800** · Labor **4,000** · Maintenance **1,500** · Other **1,200** |
| Cost intensity | **11.9783 PHP/m³** |
| Downstream ecosystem stress | **Not estimable** (never 0) |

### 4.3 Scenario B — Intervention (browser A → Simulations, new scenario)

Same as Scenario A, **except** these fields:

| Field | Value |
|---|---|
| Scenario name | `LT Intervention — Pax Silica` |
| Scenario type | **Intervention** |
| Treatment specification | `Pax Silica Advanced Coagulation & Filtration · pax-silica-v1 · unverified` |
| Mixing load multiplier (×) | `0.8` |
| Chemical dose (mg/L) | `20` |

All other values are identical: period, volume `1200`, flow `100`, pump duty `12`, mixing hours `6`, all costs, and the factor.

**Expected results**

| Metric | Expected |
|---|---|
| Energy consumption | **300 kWh** |
| Energy intensity | **0.25 kWh/m³** |
| Energy breakdown | Pumps **264**, Mixers **36** |
| Electricity-associated emissions | **213.66 kg CO₂e** |
| Operating cost | **11,200 PHP** |
| Cost breakdown | Electricity **3,300** · Chemicals **1,200** · Labor **4,000** · Maintenance **1,500** · Other **1,200** |
| Cost intensity | **9.3333 PHP/m³** |
| Downstream ecosystem stress | **Not estimable** |
| Chip | **unverified specification** (warning) |

### 4.4 Validation checks (browser A, new scenario — do not save)
Start from Scenario A's values and change **one** field at a time. Click **Save draft** after each change, and expect the listed error. Then restore the field.

| Change | Expected error |
|---|---|
| Period `2026-03-01 00:00` → `2026-03-02 00:00` | *The selected factor covers 2024; the entire reporting period must fit that year.* |
| Flow rate `50` | *Flow × pump duty must cover the treated volume.* |
| Chemical dose `10` (conventional) | *Chemical dose must be between 20 and 120 for this specification.* |
| Flow rate `200` | *Flow exceeds the selected treatment capacity.* |
| Mixing load multiplier `0.3` (conventional) | *Mixing load must be between 0.4 and 1 for this specification.* |
| Pump duty hours `30` | *Equipment hours must fit within the reporting period.* |

### 4.5 Compare (browser A → Compare)

| Field | Value |
|---|---|
| Baseline run | `LT Baseline — Conventional clarifier` |
| Intervention run | `LT Intervention — Pax Silica` |

| Metric | Baseline | Intervention | Change | Change (%) |
|---|---|---|---|---|
| Energy consumption (kWh) | 534 | 300 | **-234** | **-43.8202%** |
| Electricity-associated emissions (kg CO₂e) | 380.3148 | 213.66 | **-166.6548** | **-43.8202%** |
| Operating cost (PHP) | 14,374 | 11,200 | **-3,174** | **-22.0815%** |
| Downstream ecosystem stress | Not estimable | Not estimable | **Not estimable** | Not applicable |

- **Compatible boundaries** chip; 1,200 m³; currency PHP.
- **Net operating savings: 3,174 PHP.**

### 4.6 Comparison insights (browser A → Comparison insights)
- One card: **LT Intervention — Pax Silica · rev 1 vs LT Baseline — Conventional clarifier · rev 1**.
- Differences shown: Energy **−234 kWh · 43.82% lower**; Emissions **−166.65 kg CO2e · 43.82% lower**; Operating cost **−3,174 PHP · 22.08% lower**; Ecology **Not estimable**.
- **What differs between the runs** lists the technology fields (version, power, ranges, evidence status), **mixing load multiplier: 1 → 0.8** and **chemical dose mg per l: 30 → 20**.
- Click **Mark reviewed**, go to Dashboard, then come back. The card still shows **Reviewed**, and the sidebar box reads **1 of 1 reviewed · 100%**.
- Click **View comparison**. Compare opens with both runs preselected.
- Click **Simulate a variation**. Simulations opens with a notice *“Started from the frozen inputs of “LT Intervention — Pax Silica” (revision 1)…”*, an empty name, **Intervention** selected, and the Pax Silica values prefilled. Leave without saving.

### 4.7 Datasets (browser A → Datasets)
1. Click **Choose CSV file** and pick `research/data/sample_plant_data.csv`.
2. Expected inspection: **Usable for runs** · **5 rows · 10 columns · schema plant-csv-v1**.
   - Outliers: *pump_hours: 1 value(s) outside 24 – 24*. Outliers are flagged but rows are kept.
   - No missing columns, no invalid values, no duplicates.
3. Source reference: `sample_plant_data.csv (live test)`. Evidence status: **Synthetic / test data**.
4. Click **Register dataset version**. Expected: *Registered dataset version <uuid>*, and it appears in **Dataset versions** with the chip **Usable**.

### 4.8 Reports (browser A → Reports)

| Field | Value |
|---|---|
| Title | `Live test — Conventional vs Pax Silica` |
| Report type | **Technical report** |
| Runs included | ☑ both LT runs, nothing else |
| Sections | ☑ Summary · ☐ Inputs and assumptions · ☑ Results by run · ☑ Scenario comparison |
| Baseline run / Intervention run | LT Baseline / LT Intervention |
| Format | ☑ PDF report · ☑ CSV data |

| Check | Expected |
|---|---|
| Preview pager | **Page 1 of 4** (Summary, Results by run, Scenario comparison, Methodology and limitations) |
| Summary paragraph | *Net operating savings (baseline minus intervention): 3174.0 PHP* |
| Comparison table, Energy row | 534 · 300 · -234 · -43.8202 · kWh |
| Ecology rows | **Not estimable** in every value cell |
| Untick **CSV data** | The preview updates; the export dialog later lists only the PDF. Tick it again. |
| **Export report** → dialog | Two files (PDF, CSV), each with **Download** |
| PDF download | Every page header reads *Simulated estimates · offline plant model — not measured or validated results* |
| CSV download | Has *Scenario comparison*; **no** *Inputs and assumptions* block |
| **Print preview** | The PDF opens in a new tab |
| **Generated reports** table | Shows the report: 2 runs, PDF · CSV |

### 4.9 Submit for review (browser A → Results → LT Intervention)
- Public summary: `Live test: Pax Silica scenario at 1,200 m³ over one day (sample assumptions).`
- Click **Submit for review**. The status shows **Awaiting review**.
- In a **private window**, open https://pax-virentia.vercel.app/public/reports. Expected: *No reports have been published yet…* (the report is **not** listed).

### 4.10 Review (browser R → Publication reviews)
1. On the **Awaiting review** tab, the snapshot appears. Click **Preview public payload**. Expected: energy **300 kWh**, carbon **213.66 kg CO2e**, economics **11,200 PHP**, ecology **Not estimable**.
2. Click **Reject**, reason `Add the plant boundary to the summary.`, then **Confirm**. It moves to the **Rejected** tab.
3. On browser A (Results → LT Intervention), the Public snapshot card shows **Rejected** and *Reviewer’s reason: Add the plant boundary to the summary.*
4. On A, set the summary to `Live test: Pax Silica scenario, representative plant, 1,200 m³ on 1 Mar 2024 (sample assumptions).` and click **Submit a new version for review**.
5. On R, click **Approve and publish**, note `Checked limitations and units.`, then **Confirm**. It moves to the **Published** tab.

### 4.11 Public portal (private window, not signed in)

| Page | Expected |
|---|---|
| `/public/reports` | One row **LT Intervention — Pax Silica — simulation results**, status **Current** |
| `/public/reports/<slug>` (via **View report**) | Energy **300 kWh**, emissions **213.66 kg CO₂e**, ecology **Not estimable**, plus a limitations list |
| **Download PDF** / **Download CSV** | The dialog shows *Your download has started* and the file downloads |
| `/public/home` | **Latest published snapshot** card shows the same four metrics |
| `/public/overview` | Headline cards: 300 kWh · 213.66 kg CO₂e · 11,200 PHP · Not estimable |
| `/public/impacts` | Energy *About 0.25 kWh to treat each cubic metre*; Costs *About ₱9.33 per cubic metre* |
| `/public/scenarios` | *No comparable scenarios yet* (only one published), and the report listed under **Published on their own** |

### 4.12 Withdraw (browser R → Publication reviews → Published)
- Click **Withdraw**, reason `Live test complete.`, then **Confirm**.
- In the private window, reload `/public/reports/<slug>`. Expected: **This report is no longer available** · **Withdrawn** · *Reason: Live test complete.* No figures are shown.
- `/public/reports` no longer lists it.

### 4.13 Returning session (browser A)
- Fully close the browser, reopen https://pax-virentia.vercel.app (you should still be signed in), go to Simulations, enter Scenario A's values with the name `LT Session check`, and click **Save draft**.
- Expected: it saves (no `403`). Repeat in a **new tab**.
- Click **Sign out**. You land on `/login`, and reopening `/results` sends you back to `/login`.

### 4.14 Search (browser A, signed in again)
- Search box: `LT` then Enter. Expected: **Scenarios** (LT Baseline, LT Intervention, LT Session check), **Runs**, **Reports** (*Live test — Conventional vs Pax Silica*) and **Public snapshots** (rejected and withdrawn ones).

---

## Clean-up (optional)
The LT scenarios, runs, dataset and report stay in the workspace; there is no delete feature. The withdrawn and rejected snapshots stay private and are kept for the audit trail.
