"""Scenario, run and comparison workflows over frozen calculation inputs."""

from dataclasses import asdict
from uuid import UUID

from app.calculations.carbon import calculate_emissions
from app.calculations.ecology import assess_ecological_impact
from app.calculations.economics import calculate_economics
from app.calculations.energy import calculate_energy
from app.domain.models import EquipmentDuty
from app.domain.scenarios import text, validate_parameters, validate_run_factor
from app.repositories.simulation import canonical_json, content_hash
from app.services.errors import ServiceError, invalid


MODULES = ("energy", "carbon", "economics", "ecology")
MODEL_VERSIONS = {"energy": "equipment-duty-v1", "carbon": "electricity-factor-v1",
                  "economics": "period-opex-v1", "ecology": "evidence-gate-v1"}


def identifier(value, field):
    try:
        return str(UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        invalid(field, "A UUID identifier is required.")


def calculate_snapshot(snapshot):
    """Execute one immutable envelope; no catalog, network or Gemini reads."""
    p = snapshot["parameters"]
    # Recheck invariants at the worker boundary, preserving the source reporting time.
    original = {key: value for key, value in p.items() if key != "source_time_basis"}
    original.update(p["source_time_basis"])
    validate_parameters(original)
    modules = snapshot["requested_modules"]
    if "carbon" in modules:
        validate_run_factor(p)
    energy = calculate_energy([
        EquipmentDuty("pump", p["technology"]["pump_power_kw"], 1.0, p["pump_duty_hours"]),
        EquipmentDuty("mixer", p["technology"]["mixer_power_kw"], p["mixing_load_multiplier"], p["mixing_hours"]),
    ], treated_volume_m3=p["volume_m3"])
    results = {"energy": asdict(energy), "warnings": [
        "Treatment specification is unverified; these outputs do not establish plant performance.",
        "Input values and supporting ranges must be independently reviewed before scientific use.",
    ], "provenance": snapshot["provenance"], "requested_modules": modules}
    metrics = [{"key": "energy", "value": energy.total_kwh, "unit": "kWh",
                "status": energy.status.value, "interval_key": "total"}]
    if "carbon" in modules:
        factor = p["factor"]
        carbon = calculate_emissions(energy.total_kwh, factor["kg_per_kwh"],
                                     grid_region=factor["grid_region"], gas_basis=factor["gas_basis"])
        results["carbon"] = asdict(carbon)
        # Preserve a CO2-only factor's meaning at the HTTP/result boundary.
        unit = "kg CO2e" if factor["gas_basis"] == "CO2e" else "kg CO2"
        results["carbon"]["unit"] = unit
        if factor["gas_basis"] == "CO2":
            results["carbon"]["emissions_kg_co2"] = results["carbon"].pop("emissions_kg_co2e")
            results["carbon"]["delta_kg_co2"] = results["carbon"].pop("delta_kg_co2e")
        metrics.append({"key": "carbon", "value": carbon.emissions_kg_co2e,
                        "unit": unit, "status": "valid", "interval_key": "total"})
    if "economics" in modules:
        costs = p["costs"]
        economics = calculate_economics(
            energy.total_kwh, costs["tariff_php_per_kwh"], p["volume_m3"],
            dose_mg_per_l=p["chemical_dose_mg_per_l"],
            chemical_price_php_per_kg=costs["chemical_price_php_per_kg"],
            labor_php=costs["labor_php"], maintenance_php=costs["maintenance_php"],
            other_nonenergy_php=costs["other_nonenergy_php"],
        )
        results["economics"] = asdict(economics)
        metrics.append({"key": "economics", "value": economics.total_opex_php,
                        "unit": "PHP", "status": "valid", "interval_key": "total"})
    if "ecology" in modules:
        # No approved local-model registry exists yet. Client evidence flags cannot
        # unlock ecological predictions or supply supposedly calculated values.
        ecology = assess_ecological_impact("downstream_stress")
        results["ecology"] = asdict(ecology)
        metrics.append({"key": "ecology", "value": ecology.value, "unit": ecology.unit,
                        "status": ecology.status.value, "reason": ecology.reason,
                        "required_evidence": ecology.required_evidence, "interval_key": "total"})
    results["metrics"] = metrics
    # Finite inputs can overflow during multiplication. Treat nonfinite outputs
    # as calculation failures before entering the publication transaction.
    canonical_json(results)
    return results


class SimulationService:
    def __init__(self, repository, code_version="unreleased", api_prefix="/api/v1"):
        self.repository = repository
        self.code_version = code_version
        self.api_prefix = api_prefix

    def create_scenario(self, name, kind, parameters, user_id):
        name = text(name, "name")
        if kind not in ("baseline", "intervention"):
            invalid("kind", "Scenario kind must be baseline or intervention.")
        return self.repository.create_scenario(name, kind, validate_parameters(parameters), user_id)

    def create_revision(self, scenario_id, parameters, user_id):
        return self.repository.create_revision(identifier(scenario_id, "scenario_id"),
                                               validate_parameters(parameters), user_id)

    def submit_run(self, revision_id, modules, key, user_id):
        revision_id = identifier(revision_id, "scenario_revision_id")
        if not isinstance(key, str) or not key.strip() or len(key) > 200:
            invalid("Idempotency-Key", "A nonempty idempotency key of at most 200 characters is required.")
        if not isinstance(modules, list) or not modules or any(module not in MODULES for module in modules):
            invalid("requested_modules", "Select supported calculation modules.")
        if len(set(modules)) != len(modules):
            invalid("requested_modules", "Duplicate modules are not allowed.")
        modules = sorted(modules, key=MODULES.index)
        revision = self.repository.get_revision(revision_id)
        parameters = revision["parameters"]
        if "carbon" in modules:
            validate_run_factor(parameters)
        dataset = None
        if parameters.get("dataset_version_id"):
            dataset = self.repository.get_dataset(identifier(parameters["dataset_version_id"], "dataset_version_id"))
            quality = dataset["quality_report"]
            if (quality["row_count"] == 0 or quality["critical_missing_values"] or quality["invalid_values"]
                    or quality["missing_columns"] or quality["duplicate_rows"]):
                invalid("dataset_version_id", "Resolve critical missing or invalid observations before submission.")
        snapshot = {"scenario_revision_id": revision_id, "revision_no": revision["revision_no"],
                    "parameters": parameters, "requested_modules": modules,
                    "provenance": {"code_version": self.code_version, "model_versions": MODEL_VERSIONS,
                                   "technology_version": parameters["technology"]["version_id"],
                                   "technology_source_ref": parameters["technology"]["source_ref"],
                                   "technology_evidence_status": parameters["technology"]["evidence_status"],
                                   "factor": parameters["factor"], "cost_assumptions": parameters["costs"],
                                   "dataset": dataset, "unit_system": "SI / PHP",
                                   "reporting_timezone": "Asia/Manila",
                                   "emissions_boundary": "electricity-associated only",
                                   "random_seed": None}}
        request_hash = content_hash({"scenario_revision_id": revision_id, "requested_modules": modules})
        run_id = self.repository.submit_run(revision_id, snapshot, self.code_version, key, request_hash, user_id)
        return {"run_id": run_id, "status": self.repository.get_run(run_id)["status"],
                "status_url": f"{self.api_prefix}/runs/{run_id}"}

    def get_run(self, run_id):
        run = self.repository.get_run(identifier(run_id, "run_id"))
        return {key: run[key] for key in ("id", "scenario_revision_id", "status", "snapshot_hash",
                                          "code_version", "created_at", "started_at", "ended_at")} | {
            "cancel_requested": bool(run["cancel_requested"]),
            "error": {"code": run["error_code"], "message": run["error_message"]} if run["error_code"] else None}

    def get_results(self, run_id):
        return self.repository.get_results(identifier(run_id, "run_id"))

    def cancel_run(self, run_id, user_id):
        run_id = identifier(run_id, "run_id")
        self.repository.cancel_run(run_id, user_id)
        return self.get_run(run_id)

    def compare_runs(self, baseline_id, intervention_id):
        baseline_id = identifier(baseline_id, "baseline_run_id")
        intervention_id = identifier(intervention_id, "intervention_run_id")
        baseline_run = self.repository.get_run(baseline_id)
        intervention_run = self.repository.get_run(intervention_id)
        if baseline_run["status"] != "succeeded" or intervention_run["status"] != "succeeded":
            raise ServiceError(409, "comparison_requires_completed_runs", "Both runs must have succeeded.")
        bp, ip = baseline_run["frozen_inputs"]["parameters"], intervention_run["frozen_inputs"]["parameters"]
        mismatches = []
        pairs = [("volume_m3", bp["volume_m3"], ip["volume_m3"]),
                 ("period", (bp["period_start"], bp["period_end"]), (ip["period_start"], ip["period_end"])),
                 ("currency", bp["currency"], ip["currency"]),
                 ("grid_region", bp["grid_region"], ip["grid_region"])]
        pairs.append(("emissions_boundary", baseline_run["frozen_inputs"]["provenance"]["emissions_boundary"],
                      intervention_run["frozen_inputs"]["provenance"]["emissions_boundary"]))
        bf, inf = bp.get("factor"), ip.get("factor")
        baseline_results = self.get_results(baseline_id)
        intervention_results = self.get_results(intervention_id)
        if "carbon" in baseline_results and "carbon" in intervention_results:
            for field in ("gas_basis", "factor_method"):
                pairs.append((field, bf[field], inf[field]))
        for field, before, after in pairs:
            if before != after:
                mismatches.append({"field": field, "baseline": before, "intervention": after,
                                   "message": "Run assumptions are incompatible."})
        if mismatches:
            raise ServiceError(422, "incompatible_comparison", "Runs have incompatible scientific assumptions.", mismatches)
        bm = {metric["key"]: metric for metric in baseline_results["metrics"]}
        im = {metric["key"]: metric for metric in intervention_results["metrics"]}
        deltas = []
        for key in MODULES:
            before, after = bm.get(key), im.get(key)
            bv, iv = before["value"] if before else None, after["value"] if after else None
            valid = before is not None and after is not None and before["status"] == after["status"] == "valid"
            delta = round(iv - bv, 4) if valid and bv is not None and iv is not None else None
            deltas.append({"key": key, "baseline": bv, "intervention": iv, "delta": delta,
                           "delta_pct": round((iv - bv) / bv * 100, 4) if delta is not None and bv != 0 else None,
                           "unit": before["unit"] if before else after["unit"] if after else None,
                           "baseline_status": before["status"] if before else "not_estimable",
                           "intervention_status": after["status"] if after else "not_estimable"})
        opex = next(item for item in deltas if item["key"] == "economics")
        return {"baseline_run_id": baseline_id, "intervention_run_id": intervention_id,
                "compatible": True, "volume_m3": bp["volume_m3"], "period_start": bp["period_start"],
                "period_end": bp["period_end"], "currency": bp["currency"], "deltas": deltas,
                "net_savings_php": round(-opex["delta"], 2) if opex["delta"] is not None else None}
