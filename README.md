# Pax Virentia

> **An Economic Simulation Model for Sustainable Pax Silica Implementation Using Machine Learning Models**  
> *José Rizal University — College of Computer Studies and Engineering*  
> **Authors:** John Mark Abringe, Lucky Prince Espiritu, Miggy Rivera, Jeric Jacob Reece Roque

---

## 1. Overview

**Pax Virentia** is a web-based decision-support simulation platform designed to evaluate and compare the economic and environmental consequences of water-treatment operating scenarios in the Philippines.

Central to this study is evaluating the operational trade-offs of the prospective **Pax Silica** intervention against an **offline digital-twin-inspired plant baseline**. Water-treatment facilities require significant electrical energy, and because the Philippine grid remains largely fossil-fuel dependent, technological efficiency gains must be balanced against grid-associated greenhouse-gas emissions and downstream environmental trade-offs.

### Core Computational Modules
1. **Digital Twin Model (Offline Scenario Simulation)**: Simulates equipment electrical consumption across operational variations (flow rate, pump duty hours, mixing intensity, and chemical dosing).
2. **Carbon Emissions Calculator**: Converts energy demand into greenhouse-gas emissions ($\text{kg CO}_2\text{e}$) utilizing localized Philippine Department of Energy (DOE) and International Energy Agency (IEA) grid factors.
3. **Ecosystem-Impact Predictor**: Evaluates indicative terrestrial and marine stress metrics with scientific evidence gating (`not_estimable` when local exposure-response relationships lack empirical validation).
4. **Economic Simulation Module**: Models operating expenses (electricity tariffs, chemical consumption, maintenance, labor) and calculates net operational savings and simple payback periods.
5. **Central Sustainability Dashboard**: Consolidates multi-metric projections and side-by-side scenario comparisons for stakeholders (DENR, Local Water Units, DOE, and the public).

---

## 2. Architecture & Technology Stack

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, ECharts (designed for deployment on Vercel).
* **Backend API & Worker**: Python FastAPI (modular monolith) + durable PostgreSQL job queue (`FOR UPDATE SKIP LOCKED`) with transactional lease management (designed for deployment on Railway).
* **Database**: PostgreSQL / Neon serverless with SQLAlchemy 2.0 and Alembic migrations.
* **AI Explanation Service**: Google Gemini API via `google-genai` for generating strictly grounded narrative explanations over stored, immutable numerical results.

---

## 3. Repository Layout

```text
├── .github/workflows/          # CI workflows (Backend & Frontend)
├── apps/
│   └── web/                    # React + Vite frontend application
│       ├── src/
│       │   ├── components/     # UI components (ComparisonRail, MetricCard, StatusBadge, Logo)
│       │   ├── layout/         # AppLayout, Sidebar (6 destinations), Header
│       │   ├── pages/          # Overview, Datasets, Scenarios, Results, Reports, Settings, PublicSnapshot
│       │   ├── services/       # Mock fixtures & API integration
│       │   └── types/          # TypeScript domain models & status enums
│       ├── tailwind.config.js  # Branding palette tokens (River Teal, Canopy Green, Slate Ink, etc.)
│       └── vite.config.ts      # Vite dev server & API proxy
├── backend/
│   ├── alembic/                # Database migrations
│   ├── app/
│   │   ├── api/v1/             # FastAPI REST endpoints (scenarios, runs, comparisons, datasets)
│   │   ├── calculations/       # Pure, auditable mathematical domain logic (energy, carbon, cost, ecology)
│   │   ├── domain/             # Invariants, exceptions, and data contracts
│   │   ├── services/           # Simulation orchestration, revision freezing & CSV validation
│   │   ├── repositories/       # Transactional persistence & job queue
│   │   ├── jobs/               # Background worker routines & lease management
│   │   └── integrations/       # Gemini AI client & schema validators
│   └── tests/                  # Automated unit, contract, and calculation tests
├── research/
│   ├── data/                   # Philippine grid emission factors (DOE/IEA) & sample plant records
│   ├── models/                 # Baseline ML energy regression models
│   └── evaluation/             # Model cards & ISO/IEC 25010 evaluation plans
├── docs/                       # Architecture diagrams & manuals (DENR/LWU/DOE)
├── CONTEXT.md                  # Domain language & glossary
├── Branding.md                 # UI design tokens, color palette & layout brief
└── Pax-Virentia-System-Design.md # System architecture & design specification
```

---

## 4. How to Run

### A. Running the Frontend (UI)

The frontend is pre-populated with realistic simulation fixtures from [`sample_plant_data.csv`](research/data/sample_plant_data.csv) and [`grid_emission_factors.json`](research/data/grid_emission_factors.json), making all pages, charts, and comparison views interactive immediately.

#### In Windows (PowerShell / CMD / VS Code Terminal):
Because the project resides on the Windows filesystem (`C:\Users\Miggy\Documents\Pax Virentia`), running npm from Windows avoids WSL permission quirks:

```powershell
cd "C:\Users\Miggy\Documents\Pax Virentia\apps\web"
npm install
npm run dev
```

#### In WSL (Linux Shell):
```bash
cd "/mnt/c/Users/Miggy/Documents/Pax Virentia/apps/web"
npm install
npm run dev
```

The Vite development server will start at:
👉 **`http://localhost:5173/`**

#### Available Routes in the Browser:
| Route | View | Description |
| :--- | :--- | :--- |
| `/` | **Overview** | Next-step guide, recent scenarios, run activity, and evidence readiness. |
| `/datasets` | **Datasets** | CSV dataset inspector and validation report (IQR outliers, duplicates). |
| `/scenarios` | **Scenarios** | Baseline vs. Pax Silica parameter configuration (flow rate, duty hours, dosage). |
| `/results` | **Results** | Run inspector, multi-metric charts, and the **Baseline–Intervention Comparison Rail**. |
| `/reports` | **Reports** | Report export generator and publication review gate. |
| `/settings` | **Settings** | Curated Philippine grid emission factor registry (DOE/IEA) & model registry. |
| `/public/:id` | **Public Snapshot** | Simplified, unauthenticated read-only view for citizens and public reviewers. |

---

### B. Running Backend Tests & Calculations

The backend calculation engine and simulation contracts run without requiring external cloud databases or network dependencies:

```bash
# From the repository root:
PYTHONPATH=backend python3 -m unittest discover -s backend/tests -p "test_*.py" -v
```

This verifies:
* Pure energy demand ($E_{\text{total}} = \sum P_i \cdot \text{load} \cdot \text{hours}$) and per-volume intensity ($\text{kWh/m}^3$).
* Philippine grid GHG emissions ($\text{kg CO}_2\text{e}$) using localized DOE/IEA emission factors.
* Operating costs, chemical consumption, and net operating savings ($\text{OPEX}_{\text{baseline}} - \text{OPEX}_{\text{intervention}}$).
* Ecological evidence gating: returns `not_estimable` when localized exposure-response data is absent.
* Idempotency, scenario revision immutability, and worker job-lease recovery.

---

### C. Running the Full Backend API (Optional / Production Setup)

To run the live FastAPI server with full HTTP endpoints:

1. Create and activate a Python virtual environment:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -e ".[dev]"
   ```

2. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

3. Open the interactive API documentation:
   👉 **`http://localhost:8000/api/v1/docs`**

---

## 5. Domain Invariants & Scientific Integrity

* **No Automated "Green" Scores**: An intervention that lowers electricity costs may still increase chemical expenditure or grid carbon emissions. Metrics are reported individually with explicit units.
* **Evidence-Gated Ecology**: If local exposure-response data is absent, the system returns `not_estimable` rather than zero. "Zero" remains a measured result, never a placeholder for missing evidence.
* **Separation of Computation and AI**: Calculations are computed deterministically in Python. Google Gemini is utilized strictly for narrative explanations of stored, approved numerical results; AI failures never invalidate numerical simulation outputs.
