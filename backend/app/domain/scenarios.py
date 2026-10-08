"""Scenario invariants, independent of HTTP and persistence dependencies."""

from copy import deepcopy
from datetime import datetime, timedelta, timezone
import math
from zoneinfo import ZoneInfo

from app.services.errors import invalid


def parse_instant(value, field):
    try:
        instant = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, AttributeError, ValueError):
        invalid(field, "Use an ISO 8601 timestamp with a timezone.")
    if instant.tzinfo is None:
        invalid(field, "A timezone is required.")
    return instant


def number(value, field, minimum=0, positive=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        invalid(field, "A finite number is required.")
    if value < minimum or (positive and value == minimum):
        invalid(field, "Value must be positive." if positive else "Value is below its supported minimum.")
    return value


def text(value, field):
    if not isinstance(value, str) or not value.strip() or len(value) > 1000:
        invalid(field, "A nonempty string of at most 1000 characters is required.")
    return value.strip()


def object_fields(value, field, required, optional=()):
    if not isinstance(value, dict):
        invalid(field, "An object is required.")
    missing = set(required) - value.keys()
    unknown = value.keys() - set(required) - set(optional)
    if missing or unknown:
        invalid(field, "Missing or unsupported fields: " + ", ".join(sorted(missing | unknown)))


def validate_parameters(parameters):
    """Return a canonical copy; no guessed treatment limits or trusted result inputs."""
    required = ("volume_m3", "period_start", "period_end", "currency", "grid_region",
                "flow_rate_m3_per_hour", "pump_duty_hours", "mixing_hours",
                "mixing_load_multiplier", "chemical_dose_mg_per_l", "technology", "costs")
    object_fields(parameters, "parameters", required, ("factor", "dataset_version_id"))
    p = deepcopy(parameters)
    p.setdefault("factor", None)
    number(p["volume_m3"], "volume_m3", positive=True)
    number(p["flow_rate_m3_per_hour"], "flow_rate_m3_per_hour", positive=True)
    for key in ("pump_duty_hours", "mixing_hours", "mixing_load_multiplier", "chemical_dose_mg_per_l"):
        number(p[key], key)
    start = parse_instant(p["period_start"], "period_start")
    end = parse_instant(p["period_end"], "period_end")
    if end <= start:
        invalid("period_end", "Period end must follow period start.")
    duration_hours = (end - start).total_seconds() / 3600
    if duration_hours > 365 * 24:
        invalid("period", "A run supports at most 365 days.")
    for field in ("pump_duty_hours", "mixing_hours"):
        if p[field] > duration_hours:
            invalid(field, "Equipment hours cannot exceed the reporting period.")
    if p["currency"] != "PHP":
        invalid("currency", "The current economics module supports PHP only.")
    text(p["grid_region"], "grid_region")

    spec = p["technology"]
    object_fields(spec, "technology", ("version_id", "source_ref", "evidence_status",
                  "capacity_m3_per_hour", "pump_power_kw", "mixer_power_kw",
                  "flow_rate_range", "pump_duty_hours_range", "mixing_load_range", "chemical_dose_range"))
    for key in ("version_id", "source_ref"):
        text(spec[key], "technology." + key)
    if spec["evidence_status"] not in ("synthetic", "assumed", "unverified"):
        invalid("technology.evidence_status", "Client-supplied specifications cannot claim scientific approval.")
    number(spec["capacity_m3_per_hour"], "technology.capacity_m3_per_hour", positive=True)
    for key in ("pump_power_kw", "mixer_power_kw"):
        number(spec[key], "technology." + key)
    for parameter, bounds_key in (("flow_rate_m3_per_hour", "flow_rate_range"),
                                  ("pump_duty_hours", "pump_duty_hours_range"),
                                  ("mixing_load_multiplier", "mixing_load_range"),
                                  ("chemical_dose_mg_per_l", "chemical_dose_range")):
        bounds = spec[bounds_key]
        object_fields(bounds, "technology." + bounds_key, ("minimum", "maximum"))
        low = number(bounds["minimum"], bounds_key + ".minimum")
        high = number(bounds["maximum"], bounds_key + ".maximum")
        if low > high:
            invalid(bounds_key, "The supported minimum must not exceed the maximum.")
        if not low <= p[parameter] <= high:
            invalid(parameter, f"Value must lie within the specification's range [{low}, {high}].")
    if p["flow_rate_m3_per_hour"] > spec["capacity_m3_per_hour"]:
        invalid("flow_rate_m3_per_hour", "Flow exceeds treatment capacity.")
    if p["flow_rate_m3_per_hour"] * p["pump_duty_hours"] + 1e-9 < p["volume_m3"]:
        invalid("volume_m3", "Flow and pump hours cannot deliver the required service volume.")

    costs = p["costs"]
    object_fields(costs, "costs", ("tariff_php_per_kwh", "chemical_price_php_per_kg",
                  "labor_php", "maintenance_php", "other_nonenergy_php", "source_ref"))
    for key, value in costs.items():
        text(value, "costs." + key) if key == "source_ref" else number(value, "costs." + key)
    factor = p["factor"]
    if factor is not None:
        object_fields(factor, "factor", ("version_id", "source_ref", "grid_region", "reporting_year",
                      "gas_basis", "factor_method", "kg_per_kwh", "evidence_status"))
        for key in ("version_id", "source_ref", "grid_region", "factor_method"):
            text(factor[key], "factor." + key)
        number(factor["kg_per_kwh"], "factor.kg_per_kwh", positive=True)
        if isinstance(factor["reporting_year"], bool) or not isinstance(factor["reporting_year"], int):
            invalid("factor.reporting_year", "An integer reporting year is required.")
        if factor["gas_basis"] not in ("CO2", "CO2e"):
            invalid("factor.gas_basis", "Gas basis must be CO2 or CO2e.")
        if factor["evidence_status"] not in ("synthetic", "assumed", "unverified", "externally_sourced"):
            invalid("factor.evidence_status", "Unsupported evidence label.")
    # Canonical UTC instants make equivalent periods comparable; retain original time basis.
    p["source_time_basis"] = {"period_start": p["period_start"], "period_end": p["period_end"]}
    p["period_start"] = start.astimezone(timezone.utc).isoformat()
    p["period_end"] = end.astimezone(timezone.utc).isoformat()
    return p


def validate_run_factor(parameters):
    factor = parameters.get("factor")
    if factor is None:
        invalid("factor", "Carbon calculation requires an explicit compatible grid factor.")
    if factor["grid_region"] != parameters["grid_region"]:
        invalid("factor.grid_region", "Factor region must match the plant grid region.")
    # Match the plant-local reporting year; equivalent UTC timestamps must use
    # the same factor. Original source timestamps stay in the immutable snapshot.
    period = parameters["source_time_basis"]
    reporting_timezone = ZoneInfo("Asia/Manila")
    start = parse_instant(period["period_start"], "period_start").astimezone(reporting_timezone)
    end = parse_instant(period["period_end"], "period_end").astimezone(reporting_timezone)
    last_instant = end - timedelta(microseconds=1)
    if start.year != factor["reporting_year"] or last_instant.year != factor["reporting_year"]:
        invalid("factor.reporting_year", "One factor must cover the entire reporting period and year.")
