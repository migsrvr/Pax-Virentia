"""Pax Virentia domain models and exceptions."""

from app.domain.models import (
    MetricStatus,
    EquipmentDuty,
    EnergyResult,
    CarbonResult,
    EconomicResult,
    EcologicalResult,
)
from app.domain.exceptions import (
    PaxVirentiaError,
    InvalidOperatingParameterError,
    ZeroVolumeError,
    MissingEmissionFactorError,
    IncompatibleScenarioComparisonError,
)

__all__ = [
    "MetricStatus",
    "EquipmentDuty",
    "EnergyResult",
    "CarbonResult",
    "EconomicResult",
    "EcologicalResult",
    "PaxVirentiaError",
    "InvalidOperatingParameterError",
    "ZeroVolumeError",
    "MissingEmissionFactorError",
    "IncompatibleScenarioComparisonError",
]
