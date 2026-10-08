"""Typed OpenAPI contracts; scientific cross-field rules live in the domain."""

from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field


Nonnegative = Annotated[float, Field(ge=0, allow_inf_nan=False, strict=True)]
Positive = Annotated[float, Field(gt=0, allow_inf_nan=False, strict=True)]
Reference = Annotated[str, Field(min_length=1, max_length=1000)]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class ParameterRange(Contract):
    minimum: Nonnegative
    maximum: Nonnegative


class TechnologySpecification(Contract):
    version_id: Reference
    source_ref: Reference
    evidence_status: Literal["synthetic", "assumed", "unverified"] = "unverified"
    capacity_m3_per_hour: Positive
    pump_power_kw: Nonnegative
    mixer_power_kw: Nonnegative
    flow_rate_range: ParameterRange
    pump_duty_hours_range: ParameterRange
    mixing_load_range: ParameterRange
    chemical_dose_range: ParameterRange


class GridFactor(Contract):
    version_id: Reference
    source_ref: Reference
    grid_region: Reference
    reporting_year: Annotated[int, Field(ge=1900, le=9999, strict=True)]
    gas_basis: Literal["CO2", "CO2e"]
    factor_method: Reference
    kg_per_kwh: Positive
    evidence_status: Literal["synthetic", "assumed", "unverified", "externally_sourced"]


class CostAssumptions(Contract):
    tariff_php_per_kwh: Nonnegative
    chemical_price_php_per_kg: Nonnegative = 0
    labor_php: Nonnegative = 0
    maintenance_php: Nonnegative = 0
    other_nonenergy_php: Nonnegative = 0
    source_ref: Reference


class ScenarioParameters(Contract):
    volume_m3: Positive
    period_start: AwareDatetime
    period_end: AwareDatetime
    currency: Literal["PHP"] = "PHP"
    grid_region: Reference
    flow_rate_m3_per_hour: Positive
    pump_duty_hours: Nonnegative
    mixing_hours: Nonnegative
    mixing_load_multiplier: Nonnegative
    chemical_dose_mg_per_l: Nonnegative
    technology: TechnologySpecification
    factor: GridFactor | None = None
    costs: CostAssumptions
    dataset_version_id: UUID | None = None


class CreateScenario(Contract):
    name: Annotated[str, Field(min_length=1, max_length=200)]
    kind: Literal["baseline", "intervention"] = "baseline"
    parameters: ScenarioParameters


class CreateRevision(Contract):
    parameters: ScenarioParameters


class SubmitRun(Contract):
    scenario_revision_id: UUID
    requested_modules: Annotated[list[Literal["energy", "carbon", "economics", "ecology"]],
                                 Field(min_length=1, max_length=4)] = Field(
        default_factory=lambda: ["energy", "carbon", "economics", "ecology"])


class CompareRuns(Contract):
    baseline_run_id: UUID
    intervention_run_id: UUID
