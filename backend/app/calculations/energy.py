"""Pure mathematical module for water treatment energy simulation."""

from typing import List, Optional
from app.domain.models import EquipmentDuty, EnergyResult, MetricStatus
from app.domain.exceptions import InvalidOperatingParameterError


def calculate_energy(
    equipment_duties: List[EquipmentDuty],
    treated_volume_m3: Optional[float] = None,
) -> EnergyResult:
    """
    Computes total electrical energy consumption (kWh) and intensity (kWh/m3).

    Formula:
      E_total_kWh = sum(P_i_kW * load_multiplier_i * hours_i)
      intensity = E_total_kWh / treated_volume_m3 (if volume > 0)
    """
    if not equipment_duties:
        return EnergyResult(
            total_kwh=0.0,
            energy_intensity_kwh_per_m3=None,
            status=MetricStatus.VALID,
            warnings=["No equipment duties provided."]
        )

    total_kwh = sum(duty.energy_kwh() for duty in equipment_duties)
    warnings: List[str] = []

    if treated_volume_m3 is not None:
        if treated_volume_m3 < 0:
            raise InvalidOperatingParameterError(f"Treated volume cannot be negative: {treated_volume_m3}")
        if treated_volume_m3 == 0:
            intensity = None
            warnings.append("Treated volume is zero; per-volume intensity is not applicable.")
        else:
            intensity = total_kwh / treated_volume_m3
    else:
        intensity = None

    return EnergyResult(
        total_kwh=round(total_kwh, 4),
        energy_intensity_kwh_per_m3=round(intensity, 4) if intensity is not None else None,
        status=MetricStatus.VALID,
        warnings=warnings,
    )
