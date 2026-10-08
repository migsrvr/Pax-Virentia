"""API and durable execution contracts, using synthetic arithmetic fixtures only."""

from copy import deepcopy
import importlib.util
from pathlib import Path
import tempfile
import unittest
from uuid import uuid4

from app.repositories.simulation import SimulationRepository
from app.services.errors import ServiceError
from app.services.simulations import SimulationService
from app.services.datasets import inspect_csv
from app.jobs.worker import RunWorker


def scenario_parameters(**changes):
    """100 m3 at 10 m3/h for 10 h; a 10 kW pump consumes 100 kWh."""
    parameters = {
        "volume_m3": 100.0,
        "period_start": "2026-01-01T00:00:00+08:00",
        "period_end": "2026-01-02T00:00:00+08:00",
        "currency": "PHP",
        "grid_region": "synthetic-test-grid",
        "flow_rate_m3_per_hour": 10.0,
        "pump_duty_hours": 10.0,
        "mixing_hours": 0.0,
        "mixing_load_multiplier": 1.0,
        "chemical_dose_mg_per_l": 0.0,
        "technology": {
            "version_id": "synthetic-spec-v1",
            "source_ref": "synthetic arithmetic fixture; not plant evidence",
            "evidence_status": "synthetic",
            "capacity_m3_per_hour": 20.0,
            "pump_power_kw": 10.0,
            "mixer_power_kw": 2.0,
            "flow_rate_range": {"minimum": 1.0, "maximum": 20.0},
            "pump_duty_hours_range": {"minimum": 0.0, "maximum": 24.0},
            "mixing_load_range": {"minimum": 0.0, "maximum": 2.0},
            "chemical_dose_range": {"minimum": 0.0, "maximum": 10.0},
        },
        "factor": {
            "version_id": "synthetic-factor-v1",
            "source_ref": "synthetic 0.5 kg/kWh arithmetic fixture",
            "grid_region": "synthetic-test-grid",
            "reporting_year": 2026,
            "gas_basis": "CO2e",
            "factor_method": "synthetic-test-method",
            "kg_per_kwh": 0.5,
            "evidence_status": "synthetic",
        },
        "costs": {
            "tariff_php_per_kwh": 10.0,
            "chemical_price_php_per_kg": 60.0,
            "labor_php": 0.0,
            "maintenance_php": 0.0,
            "other_nonenergy_php": 0.0,
            "source_ref": "synthetic cost assumptions",
        },
    }
    parameters.update(changes)
    return parameters


class RepositoryFixture:
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.database_url = "sqlite:///" + str(Path(self.directory.name) / "test.db")
        self.repository = SimulationRepository(self.database_url)
        self.repository.create_schema()
        self.service = SimulationService(self.repository, code_version="test-release")
        self.worker = RunWorker(self.repository)
        self.user_id = str(uuid4())

    def tearDown(self):
        self.repository.close()
        self.directory.cleanup()

    def create_scenario(self, parameters=None):
        return self.service.create_scenario(
            "Synthetic scenario", "baseline", parameters or scenario_parameters(), self.user_id
        )

    def submit(self, revision_id, key=None, modules=None):
        return self.service.submit_run(
            revision_id,
            modules or ["energy", "carbon", "economics", "ecology"],
            key or str(uuid4()),
            self.user_id,
        )

    def completed(self, parameters=None):
        created = self.create_scenario(parameters)
        submitted = self.submit(created["latest_revision"]["id"])
        self.assertTrue(self.worker.run_once())
        self.assertEqual(self.service.get_run(submitted["run_id"])["status"], "succeeded")
        return submitted["run_id"]


class SimulationContracts(RepositoryFixture, unittest.TestCase):

    def test_run_submission_is_queued_with_status_url(self):
        scenario = self.create_scenario()
        response = self.submit(scenario["latest_revision"]["id"])
        self.assertEqual(response["status"], "queued")
        self.assertEqual(response["status_url"], "/api/v1/runs/" + response["run_id"])
        with self.assertRaises(ServiceError) as error:
            self.service.get_results(response["run_id"])
        self.assertEqual(error.exception.status_code, 409)

    def test_metric_retrieval_uses_pure_calculations_and_ecology_gate(self):
        results = self.service.get_results(self.completed())
        self.assertEqual(results["energy"]["total_kwh"], 100.0)
        self.assertEqual(results["carbon"]["emissions_kg_co2e"], 50.0)
        self.assertEqual(results["economics"]["total_opex_php"], 1000.0)
        self.assertEqual(results["ecology"]["status"], "not_estimable")
        self.assertIsNone(results["ecology"]["value"])
        self.assertTrue(results["ecology"]["required_evidence"])

    def test_baseline_intervention_comparison_has_signed_deltas_and_savings(self):
        baseline = self.completed()
        intervention_parameters = scenario_parameters(chemical_dose_mg_per_l=2.5)
        intervention_parameters["technology"]["pump_power_kw"] = 8.0
        intervention = self.completed(intervention_parameters)
        comparison = self.service.compare_runs(baseline, intervention)
        metrics = {item["key"]: item for item in comparison["deltas"]}
        self.assertEqual(metrics["energy"]["delta"], -20.0)
        self.assertEqual(metrics["energy"]["delta_pct"], -20.0)
        self.assertEqual(metrics["carbon"]["delta"], -10.0)
        self.assertEqual(metrics["economics"]["delta"], -185.0)
        self.assertEqual(comparison["net_savings_php"], 185.0)
        self.assertIsNone(metrics["ecology"]["delta"])

    def test_identical_run_comparison_has_zero_deltas(self):
        run_id = self.completed()
        result = self.service.compare_runs(run_id, run_id)
        self.assertEqual(result["net_savings_php"], 0.0)
        self.assertTrue(all(item["delta"] == 0 for item in result["deltas"][:3]))

    def test_zero_baseline_has_undefined_percentage(self):
        parameters = scenario_parameters()
        parameters["technology"]["pump_power_kw"] = 0.0
        baseline = self.completed(parameters)
        result = self.service.compare_runs(baseline, self.completed())
        self.assertEqual(result["deltas"][0]["delta"], 100.0)
        self.assertIsNone(result["deltas"][0]["delta_pct"])

    def test_revision_and_result_remain_immutable(self):
        parameters = scenario_parameters()
        scenario = self.create_scenario(parameters)
        submitted = self.submit(scenario["latest_revision"]["id"])
        parameters["technology"]["pump_power_kw"] = 99
        revision = self.service.create_revision(
            scenario["id"], scenario_parameters(chemical_dose_mg_per_l=2), self.user_id
        )
        self.assertEqual(revision["revision_no"], 2)
        self.worker.run_once()
        original = self.service.get_results(submitted["run_id"])
        expected = deepcopy(original)
        original["energy"]["total_kwh"] = -999
        self.assertEqual(self.service.get_results(submitted["run_id"]), expected)
        self.assertEqual(expected["energy"]["total_kwh"], 100.0)
        self.assertEqual(expected["code_version"], "test-release")

    def test_idempotency_replays_original_and_conflicting_payload_returns_409(self):
        scenario = self.create_scenario()
        revision_id = scenario["latest_revision"]["id"]
        first = self.submit(revision_id, key="same-key")
        self.worker.run_once()
        self.assertEqual(self.submit(revision_id, key="same-key")["run_id"], first["run_id"])
        with self.assertRaises(ServiceError) as error:
            self.submit(revision_id, key="same-key", modules=["energy"])
        self.assertEqual(error.exception.status_code, 409)
        self.assertFalse(self.worker.run_once())

    def test_bounds_and_capacity_violations_are_rejected(self):
        cases = [
            {"flow_rate_m3_per_hour": 21}, {"flow_rate_m3_per_hour": 0},
            {"pump_duty_hours": 25}, {"mixing_hours": 25},
            {"mixing_load_multiplier": 3}, {"chemical_dose_mg_per_l": 11},
            {"chemical_dose_mg_per_l": -1}, {"volume_m3": 101},
            {"volume_m3": 0}, {"flow_rate_m3_per_hour": float("nan")},
            {"mixing_load_multiplier": float("inf")},
        ]
        for change in cases:
            with self.subTest(change=change), self.assertRaises(ServiceError) as error:
                self.create_scenario(scenario_parameters(**change))
            self.assertEqual(error.exception.status_code, 422)

    def test_missing_or_incompatible_grid_factor_blocks_carbon(self):
        for factor_change in (None, {"grid_region": "other-grid"}, {"reporting_year": 2025}):
            parameters = scenario_parameters()
            if factor_change is None:
                parameters["factor"] = None
            else:
                parameters["factor"].update(factor_change)
            scenario = self.create_scenario(parameters)
            with self.subTest(factor_change=factor_change), self.assertRaises(ServiceError) as error:
                self.submit(scenario["latest_revision"]["id"])
            self.assertEqual(error.exception.status_code, 422)

    def test_energy_only_does_not_require_a_factor(self):
        scenario = self.create_scenario(scenario_parameters(factor=None))
        submitted = self.submit(scenario["latest_revision"]["id"], modules=["energy"])
        self.worker.run_once()
        results = self.service.get_results(submitted["run_id"])
        self.assertEqual(results["energy"]["total_kwh"], 100.0)
        self.assertNotIn("carbon", results)

    def test_co2_only_factor_never_labels_emissions_as_co2e(self):
        parameters = scenario_parameters()
        parameters["factor"]["gas_basis"] = "CO2"
        results = self.service.get_results(self.completed(parameters))
        self.assertEqual(results["carbon"]["emissions_kg_co2"], 50.0)
        self.assertNotIn("emissions_kg_co2e", results["carbon"])
        self.assertEqual(results["metrics"][1]["unit"], "kg CO2")

    def test_nonfinite_calculation_marks_run_failed_with_safe_error(self):
        parameters = scenario_parameters()
        parameters["technology"]["pump_power_kw"] = 1e308
        scenario = self.create_scenario(parameters)
        submitted = self.submit(scenario["latest_revision"]["id"])
        with self.assertLogs("app.jobs.worker", level="ERROR"):
            self.assertTrue(self.worker.run_once())
        status = self.service.get_run(submitted["run_id"])
        self.assertEqual(status["status"], "failed")
        self.assertEqual(status["error"]["code"], "calculation_failed")
        with self.assertRaises(ServiceError):
            self.service.get_results(submitted["run_id"])

    def test_missing_resource_and_unfinished_comparison_return_safe_errors(self):
        with self.assertRaises(ServiceError) as error:
            self.service.get_run(str(uuid4()))
        self.assertEqual(error.exception.status_code, 404)
        scenario = self.create_scenario()
        submitted = self.submit(scenario["latest_revision"]["id"])
        with self.assertRaises(ServiceError) as error:
            self.service.compare_runs(submitted["run_id"], submitted["run_id"])
        self.assertEqual(error.exception.status_code, 409)

    def test_session_expiry_and_role_changes_are_enforced(self):
        self.repository.create_user(self.user_id, "analyst")
        expired, _ = self.repository.create_session(self.user_id, lifetime_hours=-1)
        self.assertIsNone(self.repository.authenticate(expired))
        token, _ = self.repository.create_session(self.user_id)
        self.assertEqual(self.repository.authenticate(token)["role"], "analyst")
        self.repository.create_user(self.user_id, "reviewer")
        self.assertEqual(self.repository.authenticate(token)["role"], "reviewer")

    def test_equivalent_utc_period_uses_manila_reporting_year(self):
        baseline = self.completed()
        parameters = scenario_parameters(period_start="2025-12-31T16:00:00Z", period_end="2026-01-01T16:00:00Z")
        equivalent = self.completed(parameters)
        self.assertEqual(self.service.compare_runs(baseline, equivalent)["deltas"][1]["delta"], 0.0)

    def test_dataset_provenance_and_original_bytes_are_preserved(self):
        raw = (b"period_start,period_end,volume_m3,electricity_kwh,pump_hours\n"
               b"2026-01-01T00:00:00+08:00,2026-01-02T00:00:00+08:00,100,100,10\n")
        dataset = self.repository.create_dataset(raw, inspect_csv(raw), "synthetic-observations", "synthetic", self.user_id)
        run_id = self.completed(scenario_parameters(dataset_version_id=dataset["id"]))
        results = self.service.get_results(run_id)
        self.assertEqual(results["provenance"]["dataset"]["content_hash"], dataset["content_hash"])
        with self.repository.transaction() as connection:
            stored = connection.one("SELECT original_csv FROM dataset_versions WHERE id=:id", {"id": dataset["id"]})
        self.assertEqual(stored["original_csv"], raw)

    def test_scenario_and_revision_lists_are_paginated(self):
        scenario = self.create_scenario()
        self.service.create_revision(scenario["id"], scenario_parameters(chemical_dose_mg_per_l=2), self.user_id)
        self.create_scenario()
        self.assertEqual(len(self.repository.list_scenarios(limit=1)["items"]), 1)
        revisions = self.repository.list_revisions(scenario["id"], limit=1, offset=1)
        self.assertEqual(revisions["items"][0]["revision_no"], 2)

    def test_empty_and_duplicate_period_datasets_cannot_be_used_for_runs(self):
        raw_cases = (
            b"period_start,period_end,volume_m3,electricity_kwh,pump_hours\n",
            (b"period_start,period_end,volume_m3,electricity_kwh,pump_hours\n"
             b"2026-01-01T00:00:00+08:00,2026-01-02T00:00:00+08:00,100,100,10\n"
             b"2026-01-01T12:00:00+08:00,2026-01-02T12:00:00+08:00,100,100,10\n"),
        )
        for raw in raw_cases:
            dataset = self.repository.create_dataset(raw, inspect_csv(raw), "synthetic", "synthetic", self.user_id)
            scenario = self.create_scenario(scenario_parameters(dataset_version_id=dataset["id"]))
            with self.subTest(raw=raw):
                with self.assertRaises(ServiceError) as error:
                    self.submit(scenario["latest_revision"]["id"])
                self.assertEqual(error.exception.status_code, 422)

    def test_comparison_reports_volume_period_and_boundary_mismatches(self):
        baseline = self.completed()
        cases = [
            (scenario_parameters(volume_m3=90), "volume_m3"),
            (scenario_parameters(period_start="2026-01-02T00:00:00+08:00",
                                 period_end="2026-01-03T00:00:00+08:00"), "period"),
        ]
        gas_parameters = scenario_parameters()
        gas_parameters["factor"]["gas_basis"] = "CO2"
        cases.append((gas_parameters, "gas_basis"))
        for parameters, field in cases:
            other = self.completed(parameters)
            with self.subTest(field=field), self.assertRaises(ServiceError) as error:
                self.service.compare_runs(baseline, other)
            self.assertEqual(error.exception.status_code, 422)
            self.assertIn(field, [item["field"] for item in error.exception.field_errors])

    def test_results_survive_repository_reopen(self):
        run_id = self.completed()
        expected = self.service.get_results(run_id)
        self.repository.close()
        self.repository = SimulationRepository(self.database_url)
        service = SimulationService(self.repository)
        self.assertEqual(service.get_results(run_id), expected)

    def test_expired_attempt_cannot_publish_after_new_worker_claim(self):
        scenario = self.create_scenario()
        submitted = self.submit(scenario["latest_revision"]["id"])
        old_claim = self.repository.claim_job(lease_seconds=-1)
        new_claim = self.repository.claim_job()
        self.assertNotEqual(old_claim["lease_token"], new_claim["lease_token"])
        self.assertFalse(self.repository.publish_results(submitted["run_id"], old_claim["lease_token"], {}))
        self.assertEqual(self.service.get_run(submitted["run_id"])["status"], "running")
        from app.services.simulations import calculate_snapshot
        self.assertTrue(self.repository.publish_results(
            submitted["run_id"], new_claim["lease_token"], calculate_snapshot(new_claim["frozen_inputs"])
        ))

    def test_exhausted_expired_attempts_mark_run_failed(self):
        scenario = self.create_scenario()
        submitted = self.submit(scenario["latest_revision"]["id"])
        for _ in range(3):
            self.assertIsNotNone(self.repository.claim_job(lease_seconds=-1))
        self.assertIsNone(self.repository.claim_job())
        run = self.service.get_run(submitted["run_id"])
        self.assertEqual(run["status"], "failed")
        self.assertEqual(run["error"]["code"], "worker_attempts_exhausted")

    def test_cancellation_prevents_result_publication(self):
        scenario = self.create_scenario()
        submitted = self.submit(scenario["latest_revision"]["id"])
        self.service.cancel_run(submitted["run_id"], self.user_id)
        self.assertFalse(self.worker.run_once())
        self.assertEqual(self.service.get_run(submitted["run_id"])["status"], "cancelled")

    def test_running_cancellation_is_pending_until_worker_acknowledges(self):
        scenario = self.create_scenario()
        submitted = self.submit(scenario["latest_revision"]["id"])
        claim = self.repository.claim_job()
        status = self.service.cancel_run(submitted["run_id"], self.user_id)
        self.assertEqual(status["status"], "running")
        self.assertTrue(status["cancel_requested"])
        self.assertFalse(self.repository.publish_results(submitted["run_id"], claim["lease_token"], {}))
        self.assertEqual(self.service.get_run(submitted["run_id"])["status"], "cancelled")

    def test_csv_quality_report_retains_missing_duplicate_and_outlier_rows(self):
        raw = b"volume_m3,electricity_kwh,notes\n10,10,a\n10,11,b\n10,,c\n10,12,d\n10,10,a\n10,1000,high\n"
        report = inspect_csv(raw)
        self.assertEqual(report["row_count"], 6)
        self.assertEqual(report["missing_values"]["electricity_kwh"], 1)
        self.assertEqual(report["duplicate_rows"], [6])
        self.assertEqual(report["outliers"]["electricity_kwh"][0]["row"], 7)
        self.assertEqual(report["outliers"]["electricity_kwh"][0]["value"], 1000.0)
        self.assertEqual(report["outlier_rule"], "Tukey 1.5 IQR; linear-interpolated quartiles; rows retained")

    def test_csv_rejects_bad_encoding_shape_and_nonfinite_numeric_values(self):
        for raw in (b"a,b\n1,2,3\n", b"a,a\n1,2\n", b"a\n\xff\n"):
            with self.subTest(raw=raw), self.assertRaises(ServiceError):
                inspect_csv(raw)
        report = inspect_csv(b"volume_m3,electricity_kwh\n1,NaN\n")
        self.assertTrue(report["invalid_values"])

    def test_csv_row_and_byte_limits_are_enforced(self):
        with self.assertRaises(ServiceError) as error:
            inspect_csv(b"a\n" + b"1\n" * 50_001)
        self.assertEqual(error.exception.status_code, 422)
        with self.assertRaises(ServiceError) as error:
            inspect_csv(b"a" * (10 * 1024 * 1024 + 1))
        self.assertEqual(error.exception.status_code, 413)


HTTP_DEPENDENCIES = all(importlib.util.find_spec(name) for name in
                        ("fastapi", "pydantic", "pydantic_settings", "httpx"))


@unittest.skipUnless(HTTP_DEPENDENCIES, "HTTP integration requires the declared FastAPI/Pydantic/httpx dependencies")
class HTTPContracts(RepositoryFixture, unittest.TestCase):
    """Exercise the real ASGI app and SQLite repository, without a live database."""
    def setUp(self):
        super().setUp()
        from fastapi.testclient import TestClient
        from app.main import create_app
        self.repository.create_user(self.user_id, "analyst")
        self.token, self.csrf = self.repository.create_session(self.user_id)
        self.client_context = TestClient(create_app(repository=self.repository, code_version="test-release",
                                                    allowed_origins=["http://localhost:5173"]),
                                         base_url="https://testserver")
        self.client = self.client_context.__enter__()
        self.client.cookies.set("__Host-pv_session", self.token)
        self.headers = {"Origin": "http://localhost:5173", "X-CSRF-Token": self.csrf}

    def tearDown(self):
        self.client_context.__exit__(None, None, None)
        super().tearDown()

    def test_healthcheck(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")

    def test_http_run_submission_metrics_and_comparison(self):
        runs = []
        for power in (10.0, 8.0):
            parameters = scenario_parameters()
            parameters["technology"]["pump_power_kw"] = power
            created = self.client.post("/api/v1/scenarios", headers=self.headers,
                                       json={"name": "Synthetic", "kind": "baseline", "parameters": parameters})
            self.assertEqual(created.status_code, 201, created.text)
            submitted = self.client.post("/api/v1/runs", headers={**self.headers, "Idempotency-Key": str(uuid4())},
                                         json={"scenario_revision_id": created.json()["latest_revision"]["id"]})
            self.assertEqual(submitted.status_code, 202, submitted.text)
            run_id = submitted.json()["run_id"]
            self.assertEqual(self.client.get(submitted.json()["status_url"]).json()["status"], "queued")
            self.worker.run_once()
            results = self.client.get(f"/api/v1/runs/{run_id}/results")
            self.assertEqual(results.status_code, 200, results.text)
            self.assertEqual(results.json()["ecology"]["status"], "not_estimable")
            runs.append(run_id)
        response = self.client.post("/api/v1/comparisons", headers=self.headers,
                                    json={"baseline_run_id": runs[0], "intervention_run_id": runs[1]})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["net_savings_php"], 200.0)

    def test_private_endpoints_require_session_role_and_csrf(self):
        self.client.cookies.clear()
        self.assertEqual(self.client.get("/api/v1/scenarios").status_code, 401)
        self.client.cookies.set("__Host-pv_session", self.token)
        self.assertEqual(self.client.post("/api/v1/scenarios", json={}).status_code, 403)
        self.assertEqual(self.client.post("/api/v1/scenarios", headers={**self.headers, "Origin": "https://untrusted.example"},
                                         json={}).status_code, 403)
        self.repository.create_user(self.user_id, "reviewer")
        self.assertEqual(self.client.post("/api/v1/scenarios", headers=self.headers, json={}).status_code, 403)

    def test_http_invalid_bounds_and_missing_idempotency_key(self):
        response = self.client.post("/api/v1/scenarios", headers=self.headers,
                                    json={"name": "Invalid", "parameters": scenario_parameters(pump_duty_hours=25)})
        self.assertEqual(response.status_code, 422)
        self.assertIn("request_id", response.json()["error"])
        self.assertEqual(self.client.post("/api/v1/runs", headers=self.headers,
                                         json={"scenario_revision_id": str(uuid4())}).status_code, 422)

    def test_http_csv_inspection_and_stored_quality(self):
        raw = b"volume_m3,electricity_kwh\n10,20\n10,\n"
        headers = {**self.headers, "Content-Type": "text/csv"}
        inspected = self.client.post("/api/v1/datasets/inspect", headers=headers, content=raw)
        self.assertEqual(inspected.status_code, 200, inspected.text)
        self.assertEqual(inspected.json()["row_count"], 2)
        created = self.client.post("/api/v1/datasets?source_ref=synthetic-fixture&evidence_status=synthetic",
                                   headers=headers, content=raw)
        self.assertEqual(created.status_code, 201, created.text)
        quality = self.client.get("/api/v1/datasets/" + created.json()["id"] + "/quality")
        self.assertEqual(quality.status_code, 200)
        self.assertEqual(quality.json()["missing_values"]["electricity_kwh"], 1)


if __name__ == "__main__":
    unittest.main()
