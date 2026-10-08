"""Pax Virentia domain models and value objects."""

from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Optional
from enum import Enum


class MetricStatus(str, Enum):
    VALID = "valid"
    NOT_ESTIMABLE = "not_estimable"
    OUT_OF_DOMAIN = "out_of_domain"
    ERROR = "error"


@dataclass(frozen=True)
class EquipmentDuty:
    """Represents equipment energy contribution during an operational period."""
    equipment_id: str
    power_kw: float
    load_multiplier: float = 1.0
    hours: float = 24.0

    def energy_kwh(self) -> float:
        if self.power_kw < 0:
            raise ValueError(f"Equipment power cannot be negative: {self.power_kw}")
        if self.load_multiplier < 0:
            raise ValueError(f"Load multiplier cannot be negative: {self.load_multiplier}")
        if self.hours < 0:
            raise ValueError(f"Hours cannot be negative: {self.hours}")
        return self.power_kw * self.load_multiplier * self.hours


@dataclass(frozen=True)
class EnergyResult:
    """Calculated energy output."""
    total_kwh: float
    energy_intensity_kwh_per_m3: Optional[float]
    status: MetricStatus = MetricStatus.VALID
    warnings: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class CarbonResult:
    """Calculated grid emission results."""
    emissions_kg_co2e: float
    gas_basis: str
    grid_region: str
    factor_kg_per_kwh: float
    delta_kg_co2e: Optional[float] = None


@dataclass(frozen=True)
class EconomicResult:
    """Calculated OPEX, chemical costs, and comparative savings."""
    electricity_cost_php: float
    chemical_cost_php: float
    labor_cost_php: float
    maintenance_cost_php: float
    other_cost_php: float
    total_opex_php: float
    chemical_kg_used: float
    net_savings_php: Optional[float] = None
    simple_payback_years: Optional[float] = None


@dataclass(frozen=True)
class EcologicalResult:
    """Evidence-gated ecological indicator assessment."""
    indicator_key: str
    status: MetricStatus
    value: Optional[float]
    unit: Optional[str]
    reason: str
    required_evidence: List[str] = field(default_factory=list)
