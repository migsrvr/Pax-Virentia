"""Pure mathematical module for Philippine grid greenhouse gas emissions calculation."""

from typing import Optional
from app.domain.models import CarbonResult
from app.domain.exceptions import MissingEmissionFactorError, InvalidOperatingParameterError


def calculate_emissions(
    energy_kwh: float,
    factor_kg_per_kwh: float,
    grid_region: str = "Luzon-Visayas",
    gas_basis: str = "CO2e",
    baseline_emissions_kg_co2e: Optional[float] = None,
) -> CarbonResult:
    """
    Computes greenhouse-gas emissions (kg CO2e or kg CO2) from grid electricity.

    Formula:
      GHG_kgCO2e = energy_kwh * factor_kg_per_kwh
      delta_GHG = GHG_kgCO2e - baseline_emissions_kg_co2e
    """
    if energy_kwh < 0:
        raise InvalidOperatingParameterError(f"Energy consumption cannot be negative: {energy_kwh}")
    if factor_kg_per_kwh <= 0:
        raise MissingEmissionFactorError(f"Grid emission factor must be positive: {factor_kg_per_kwh}")

    emissions = energy_kwh * factor_kg_per_kwh
    delta = (emissions - baseline_emissions_kg_co2e) if baseline_emissions_kg_co2e is not None else None

    return CarbonResult(
        emissions_kg_co2e=round(emissions, 4),
        gas_basis=gas_basis,
        grid_region=grid_region,
        factor_kg_per_kwh=factor_kg_per_kwh,
        delta_kg_co2e=round(delta, 4) if delta is not None else None,
    )
