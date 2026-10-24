# Research data files

| File | Status |
| --- | --- |
| `sample_plant_data.csv` | Five daily sample observations (1–5 Jan 2026) in the `plant-csv-v1` schema. Import it on the workspace **Datasets** page to try the inspection and registration flow. It is sample data, not plant records. |
| `grid_emission_factors.json` | **Superseded research note.** The application does not read this file. The factors runs actually use are the versioned catalog in `backend/app/api/v1/catalogs.py` (served at `GET /api/v1/catalogs/factors`). |

## Known differences pending domain review

The research note and the running catalog disagree, and neither has been reviewed against the source documents:

- Years: the note lists 2023 factors; the catalog lists 2024 factors. A run's reporting period must fall entirely within its factor's year, so scenarios outside 2024 cannot calculate emissions with the current catalog.
- Mindanao: 0.5480 kg CO2e/kWh (note) vs 0.5941 (catalog).
- The note's IEA national factor (0.6850) is not in the catalog; the catalog adds a CO2-only Luzon–Visayas factor (0.6980).
- Field names differ (`kg_co2e_per_kwh` / `accounting_method` vs `kg_per_kwh` / `factor_method`).

Resolve these by publishing a new catalog version with cited sources; do not edit historical runs, which keep the exact values they froze.
