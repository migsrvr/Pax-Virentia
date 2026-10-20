"""Verified Catalogs API for emission factors, treatment technology specs, and models."""

from fastapi import APIRouter

router = APIRouter(prefix="/catalogs", tags=["Catalogs"])

GRID_FACTORS = [
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
        "source_ref": "DOE Philippines Grid Emission Factors 2024",
    },
    {
        "id": "ph-mindanao-2024",
        "version_id": "ph-mindanao-2024",
        "name": "Mindanao Grid Average 2024",
        "grid_region": "Mindanao",
        "reporting_year": 2024,
        "gas_basis": "CO2e",
        "factor_method": "Operating Margin / Grid Emission Factor",
        "kg_per_kwh": 0.5941,
        "evidence_status": "externally_sourced",
        "source_ref": "DOE Philippines Grid Emission Factors 2024",
    },
    {
        "id": "ph-luzon-co2-2024",
        "version_id": "ph-luzon-co2-2024",
        "name": "Luzon-Visayas Direct CO2 Factor 2024",
        "grid_region": "Luzon-Visayas",
        "reporting_year": 2024,
        "gas_basis": "CO2",
        "factor_method": "Direct CO2 Emission Factor",
        "kg_per_kwh": 0.6980,
        "evidence_status": "externally_sourced",
        "source_ref": "DOE Philippines Grid Emission Factors 2024",
    },
]

TECHNOLOGIES = [
    {
        "id": "pax-silica-v1",
        "name": "Pax Silica Advanced Coagulation & Filtration",
        "version_id": "pax-silica-v1",
        "source_ref": "Pax Virentia Engineering Pilot Specs Rev B",
        "evidence_status": "unverified",
        "capacity_m3_per_hour": 150.0,
        "pump_power_kw": 22.0,
        "mixer_power_kw": 7.5,
        "flow_rate_range": {"minimum": 10.0, "maximum": 150.0},
        "pump_duty_hours_range": {"minimum": 1.0, "maximum": 24.0},
        "mixing_load_range": {"minimum": 0.2, "maximum": 1.0},
        "chemical_dose_range": {"minimum": 5.0, "maximum": 80.0},
    },
    {
        "id": "conv-clarifier-v1",
        "name": "Conventional Clarifier Baseline",
        "version_id": "conv-clarifier-v1",
        "source_ref": "Standard Water Utility Baseline Spec 2023",
        "evidence_status": "assumed",
        "capacity_m3_per_hour": 150.0,
        "pump_power_kw": 37.0,
        "mixer_power_kw": 15.0,
        "flow_rate_range": {"minimum": 10.0, "maximum": 150.0},
        "pump_duty_hours_range": {"minimum": 1.0, "maximum": 24.0},
        "mixing_load_range": {"minimum": 0.4, "maximum": 1.0},
        "chemical_dose_range": {"minimum": 20.0, "maximum": 120.0},
    },
]

MODELS = [
    {
        "module": "energy",
        "version": "equipment-duty-v1",
        "name": "Equipment Duty Energy Model",
        "status": "production",
        "description": "Deterministic equipment power, duty cycle, and load multiplier calculation",
    },
    {
        "module": "carbon",
        "version": "electricity-factor-v1",
        "name": "Electricity Factor Grid Model",
        "status": "production",
        "description": "Strictly electricity-associated grid emissions (Scope 2) using DOE published factors",
    },
    {
        "module": "economics",
        "version": "period-opex-v1",
        "name": "Period OPEX Economic Model",
        "status": "production",
        "description": "Calculates power cost, chemical consumable cost, labor, maintenance, and non-energy expenses in PHP",
    },
    {
        "module": "ecology",
        "version": "evidence-gate-v1",
        "name": "Evidence Gate Ecological Model",
        "status": "restricted",
        "description": "Evidence gate requiring approved local ecological study; returns not_estimable without local calibration",
    },
]


@router.get("/factors")
def get_grid_factors():
    return {"items": GRID_FACTORS}


@router.get("/technologies")
def get_technologies():
    return {"items": TECHNOLOGIES}


@router.get("/models")
def get_models():
    return {"items": MODELS}
