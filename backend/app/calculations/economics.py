"""Pure mathematical module for water treatment operational cost and savings simulation."""

from typing import Optional
from app.domain.models import EconomicResult
from app.domain.exceptions import InvalidOperatingParameterError


def calculate_economics(
    energy_kwh: float,
    tariff_php_per_kwh: float,
    treated_volume_m3: float,
    dose_mg_per_l: float = 0.0,
    chemical_price_php_per_kg: float = 0.0,
    labor_php: float = 0.0,
    maintenance_php: float = 0.0,
    other_nonenergy_php: float = 0.0,
    baseline_opex_php: Optional[float] = None,
    incremental_capex_php: Optional[float] = None,
) -> EconomicResult:
    """
    Computes OPEX components, chemical mass, net savings, and simple payback.

    Formulas:
      chemical_kg = dose_mg_per_l * treated_volume_m3 / 1000
      OPEX = (energy_kwh * tariff_php_per_kwh) + (chemical_kg * chemical_price_php_per_kg)
             + labor_php + maintenance_php + other_nonenergy_php
      net_savings = baseline_opex_php - OPEX
      simple_payback = incremental_capex_php / annual_net_savings (if both > 0)
    """
    if energy_kwh < 0 or tariff_php_per_kwh < 0:
        raise InvalidOperatingParameterError("Energy and electricity tariff must be non-negative.")
    if dose_mg_per_l < 0 or chemical_price_php_per_kg < 0:
        raise InvalidOperatingParameterError("Chemical dose and price must be non-negative.")
    if treated_volume_m3 < 0:
        raise InvalidOperatingParameterError("Treated volume must be non-negative.")

    chemical_kg = (dose_mg_per_l * treated_volume_m3) / 1000.0
    elec_cost = energy_kwh * tariff_php_per_kwh
    chem_cost = chemical_kg * chemical_price_php_per_kg

    total_opex = elec_cost + chem_cost + labor_php + maintenance_php + other_nonenergy_php

    net_savings: Optional[float] = None
    if baseline_opex_php is not None:
        net_savings = round(baseline_opex_php - total_opex, 2)

    payback: Optional[float] = None
    if incremental_capex_php is not None and net_savings is not None:
        if incremental_capex_php > 0 and net_savings > 0:
            payback = round(incremental_capex_php / net_savings, 2)

    return EconomicResult(
        electricity_cost_php=round(elec_cost, 2),
        chemical_cost_php=round(chem_cost, 2),
        labor_cost_php=round(labor_php, 2),
        maintenance_cost_php=round(maintenance_php, 2),
        other_cost_php=round(other_nonenergy_php, 2),
        total_opex_php=round(total_opex, 2),
        chemical_kg_used=round(chemical_kg, 4),
        net_savings_php=net_savings,
        simple_payback_years=payback,
    )
