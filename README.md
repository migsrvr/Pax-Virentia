# Pax Virentia

> **An Economic Simulation Model for Sustainable Pax Silica Implementation Using Machine Learning Models**
> José Rizal University — College of Computer Studies and Engineering
> Authors: John Mark Abringe, Lucky Prince Espiritu, Miggy Rivera, Jeric Jacob Reece Roque

---

## Overview

Pax Virentia is a web-based decision-support platform designed to model and compare the economic and environmental consequences of water-treatment operating scenarios in the Philippines. It focuses on evaluating the prospective operational trade-offs of the Pax Silica intervention against a baseline offline plant model.

### Key Computational Modules

1. **Digital Twin Model (Offline Scenario Simulation)**: Simulates equipment electrical consumption across operational variations (flow rate, pump duty hours, mixing intensity, and chemical dosing).
2. **Carbon Emissions Calculator**: Converts energy demand into greenhouse-gas emissions (kg CO₂e) utilizing localized Philippine Department of Energy (DOE) and International Energy Agency (IEA) grid emission factors.
3. **Ecosystem-Impact Predictor**: Evaluates indicative terrestrial and marine stress metrics with scientific evidence gating (`not_estimable` when local exposure-response relationships lack empirical validation).
4. **Economic Simulation Module**: Models operating expenses (electricity tariffs, chemical consumption, maintenance, labor) and calculates net operational savings and simple payback periods.
5. **Central Sustainability Dashboard**: Consolidates projections and scenario comparisons for stakeholders (DENR, Local Water Units, DOE, and public access).

---

## Architecture & Technology Stack

- **Frontend**: React + TypeScript + Vite, React Router, TanStack Query, ECharts (deployed to Vercel).
- **Backend API & Worker**: Python FastAPI (modular monolith) + durable PostgreSQL-backed job queue (`SKIP LOCKED`) for asynchronous simulations (deployed to Railway).
- **Database**: PostgreSQL / Neon serverless with SQLAlchemy 2.0 & Alembic migrations.
- **AI Explanation Integration**: Google Gemini API via `google-genai` for generating strictly grounded explanations of stored, immutable numerical results.

---

## Repository Structure

```text
├── .github/workflows/          # Automated CI workflows (Backend & Frontend)
├── apps/
│   └── web/                    # React + Vite frontend application
├── backend/
│   ├── alembic/                # Database migrations
│   ├── app/
│   │   ├── api/v1/             # FastAPI REST endpoints
│   │   ├── calculations/       # Pure numerical domain modules (energy, carbon, cost, ecology)
│   │   ├── domain/             # Invariants, exceptions, and data models
│   │   ├── services/           # Orchestration workflows
│   │   ├── repositories/       # SQLAlchemy persistence
│   │   ├── jobs/               # Background worker routines
│   │   └── integrations/       # Gemini AI client & schema validators
│   └── tests/                  # Automated test suite
├── research/
│   ├── data/                   # Philippine grid factors (DOE/IEA) & sample plant records
│   ├── models/                 # Machine learning baseline regression models
│   └── evaluation/             # Model cards & ISO/IEC 25010 evaluation plans
├── docs/                       # System design specifications & manuals (DENR/LWU/DOE)
├── CONTEXT.md                  # Domain language & glossary
└── Pax-Virentia-System-Design.md # System design & architecture blueprint
```

---

## Getting Started

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -e ".[dev]"
pytest tests/ -v
```

### Frontend Setup

```bash
cd apps/web
npm install
npm run dev
```
