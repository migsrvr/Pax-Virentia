"""Grounded explanations and public snapshots against real SQLite/HTTP contracts."""

from copy import deepcopy
import json
import unittest
from unittest.mock import patch
from uuid import uuid4

from app.config import Settings
from app.integrations.gemini import (ECOLOGY_LIMITATION, UNVERIFIED, approved_output,
                                     generate_explanation)
from test_api import RepositoryFixture, scenario_parameters


class GroundingContracts(RepositoryFixture, unittest.TestCase):
    def results(self):
        parameters = scenario_parameters()
        parameters["technology"]["evidence_status"] = "unverified"
        return self.service.get_results(self.completed(parameters))

    def test_missing_key_uses_deterministic_fallback_without_provider_or_mutation(self):
        results = self.results()
        before = deepcopy(results)
        with patch("app.integrations.gemini._provider_output") as provider:
            first = generate_explanation(results, api_key="")
            second = generate_explanation(results, api_key="  ")
        provider.assert_not_called()
        self.assertEqual(first, second)
        self.assertEqual(results, before)
        evidence = first["grounded_evidence"]
        self.assertEqual(evidence["fallback_reason"], "missing_api_key")
        self.assertEqual(evidence["metrics"], results["metrics"])
        self.assertIn("energy: 100.0 kWh", first["narrative"])
        self.assertIn(UNVERIFIED, evidence["limitations"])
        self.assertIn(ECOLOGY_LIMITATION, evidence["limitations"])
        self.assertIsNone(evidence["metrics"][-1]["value"])

    def test_new_numbers_wrong_units_and_reassociated_existing_numbers_reject(self):
        results = self.results()
        for finding in ("energy: 999.0 kWh (stored calculated result).",
                        "energy: 50.0 kWh (stored calculated result).",
                        "energy: 100.0 PHP (stored calculated result).",
                        "energy: one hundred kWh; guarantees plant performance."):
            candidate = approved_output(results).model_dump()
            candidate["key_findings"][0] = finding
            with self.subTest(finding=finding), patch("app.integrations.gemini._provider_output", return_value=candidate):
                output = generate_explanation(results, api_key="test-key")
                self.assertEqual(output["grounded_evidence"]["fallback_reason"], "grounding_rejected")
                self.assertEqual(output["key_drivers"], approved_output(results).key_findings)

    def test_unknown_citations_missing_caveats_ecology_safety_and_extra_fields_reject(self):
        results = self.results()
        approved = approved_output(results).model_dump()
        candidates = []
        invalid = deepcopy(approved)
        invalid["cited_metric_keys"].append("fabricated_damage")
        candidates.append(invalid)
        for limitation in (UNVERIFIED, ECOLOGY_LIMITATION):
            invalid = deepcopy(approved)
            invalid["limitations"].remove(limitation)
            candidates.append(invalid)
        invalid = deepcopy(approved)
        invalid["key_findings"][-1] = "ecology: 0; safe with zero damage."
        candidates.append(invalid)
        candidates.append(approved | {"recommendation": "Approved for public safety"})
        for candidate in candidates:
            with self.subTest(candidate=candidate), patch("app.integrations.gemini._provider_output", return_value=candidate):
                output = generate_explanation(results, api_key="test-key")
                self.assertEqual(output["grounded_evidence"]["fallback_reason"], "grounding_rejected")

    def test_valid_structured_output_is_accepted_and_exact_model_is_requested(self):
        results = self.results()
        candidate = approved_output(results).model_dump()
        candidate["key_findings"].reverse()
        with patch("app.integrations.gemini._provider_output", return_value=candidate) as provider:
            output = generate_explanation(results, api_key="test-key", model_id="gemini-3.5-flash")
        self.assertEqual(provider.call_args.args[2], "gemini-3.5-flash")
        self.assertEqual(Settings.model_fields["GEMINI_MODEL"].default, "gemini-3.5-flash")
        self.assertEqual(output["grounded_evidence"]["source"], "gemini")
        self.assertIsNone(output["grounded_evidence"]["fallback_reason"])

    def test_provider_failure_is_safe_and_does_not_change_results(self):
        results = self.results()
        before = deepcopy(results)
        with patch("app.integrations.gemini._provider_output", side_effect=RuntimeError("private-provider-detail")):
            output = generate_explanation(results, api_key="test-key")
        self.assertEqual(output["grounded_evidence"]["fallback_reason"], "provider_unavailable")
        self.assertNotIn("private-provider-detail", json.dumps(output))
        self.assertEqual(results, before)

    def test_focus_cites_only_available_metrics_and_preserves_global_caveats(self):
        results = self.results()
        output = generate_explanation(results, "energy", api_key="")
        self.assertEqual(output["grounded_evidence"]["cited_metric_keys"], ["energy"])
        self.assertEqual(len(output["key_drivers"]), 1)
        self.assertIn(ECOLOGY_LIMITATION, output["grounded_evidence"]["limitations"])


class MilestoneHTTPContracts(RepositoryFixture, unittest.TestCase):
    def setUp(self):
        super().setUp()
        from fastapi.testclient import TestClient
        from app.main import create_app
        self.repository.create_user(self.user_id, "analyst", email="private@example.com",
                                    display_name="Private Analyst")
        self.token, self.csrf = self.repository.create_session(self.user_id)
        self.context = TestClient(create_app(repository=self.repository,
                                            allowed_origins=["http://localhost:5173"]),
                                  base_url="https://testserver")
        self.client = self.context.__enter__()
        self.client.cookies.set("__Host-pv_session", self.token)
        self.headers = {"Origin": "http://localhost:5173", "X-CSRF-Token": self.csrf}
        self.key_patch = patch("app.integrations.gemini.settings.GEMINI_API_KEY", "")
        self.key_patch.start()

    def tearDown(self):
        self.key_patch.stop()
        self.context.__exit__(None, None, None)
        super().tearDown()

    def explain(self, run_id, **kwargs):
        return self.client.post(f"/api/v1/runs/{run_id}/explain", headers=self.headers, **kwargs)

    def publish(self, run_id, json=None):
        return self.client.post("/api/v1/publications", headers=self.headers,
                                json={"run_id": str(run_id), **(json or {})})

    def reviewer(self):
        if not hasattr(self, "_reviewer"):
            reviewer_id = str(uuid4())
            self.repository.create_user(reviewer_id, "reviewer", email="reviewer@example.com",
                                        display_name="Private Reviewer")
            token, csrf = self.repository.create_session(reviewer_id)
            self._reviewer = (reviewer_id, token, csrf)
        return self._reviewer

    def review(self, publication_id, action="approve", reason=None):
        _, token, csrf = self.reviewer()
        self.client.cookies.set("__Host-pv_session", token)
        try:
            return self.client.post(f"/api/v1/publications/{publication_id}/{action}",
                                    headers={**self.headers, "X-CSRF-Token": csrf},
                                    json={"reason": reason} if reason else None)
        finally:
            self.client.cookies.set("__Host-pv_session", self.token)

    def publish_approved(self, run_id, json=None):
        created = self.publish(run_id, json)
        self.assertEqual(created.status_code, 201, created.text)
        approved = self.review(created.json()["id"])
        self.assertEqual(approved.status_code, 200, approved.text)
        return created

    def test_explanation_can_omit_body_and_get_returns_persisted_structured_output(self):
        run_id = self.completed()
        before = self.repository.get_results(run_id)
        self.assertEqual(self.client.get(f"/api/v1/runs/{run_id}/explain").status_code, 404)
        response = self.explain(run_id)
        self.assertEqual(response.status_code, 200, response.text)
        stored = self.client.get(f"/api/v1/runs/{run_id}/explain").json()
        self.assertEqual(stored, response.json())
        self.assertEqual(stored["grounded_evidence"]["source"], "deterministic_fallback")
        self.assertTrue(stored["limitations"])
        self.assertEqual(stored["key_findings"], stored["key_drivers"])
        refreshed = self.explain(run_id)
        self.assertEqual(refreshed.json()["id"], stored["id"])
        self.assertEqual(self.repository.get_results(run_id), before)

    def test_explanation_focus_and_validation(self):
        run_id = self.completed()
        response = self.explain(run_id, json={"focus": "ecology"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["cited_metric_keys"], ["ecology"])
        self.assertEqual(self.client.get(f"/api/v1/runs/{run_id}/explain?focus=ecology").json(), response.json())
        self.assertEqual(self.explain(run_id, json={"focus": "invented"}).status_code, 422)
        self.assertEqual(self.explain(run_id, json={"results": {}}).status_code, 422)

    def test_private_endpoints_enforce_auth_role_origin_and_csrf(self):
        run_id = self.completed()
        self.client.cookies.clear()
        for path in ("/api/v1/runs", f"/api/v1/runs/{run_id}/explain"):
            self.assertEqual(self.client.get(path).status_code, 401)
        writes = ((f"/api/v1/runs/{run_id}/explain", None), ("/api/v1/publications", {"run_id": run_id}))
        for path, body in writes:
            self.assertEqual(self.client.post(path, headers=self.headers, json=body).status_code, 401)
        self.client.cookies.set("__Host-pv_session", self.token)
        for path, body in writes:
            self.assertEqual(self.client.post(path, json=body).status_code, 403)
            self.assertEqual(self.client.post(path, json=body, headers={**self.headers, "X-CSRF-Token": "wrong"}).status_code, 403)
            self.assertEqual(self.client.post(path, json=body, headers={**self.headers, "Origin": "https://evil.example"}).status_code, 403)
        self.repository.create_user(self.user_id, "reviewer")
        self.assertEqual(self.explain(run_id).status_code, 403)
        # Reviewers decide on submissions; they cannot submit their own.
        self.assertEqual(self.publish(run_id).status_code, 403)
        self.assertEqual(self.client.get("/api/v1/runs").status_code, 200)

    def test_incomplete_and_missing_runs_cannot_be_explained_or_published(self):
        created = self.create_scenario()
        run_id = self.submit(created["latest_revision"]["id"])["run_id"]
        for action in (self.explain, self.publish):
            response = action(run_id)
            self.assertEqual(response.status_code, 409, response.text)
            self.assertEqual(action(str(uuid4())).status_code, 404)
        self.assertEqual(self.client.get(f"/api/v1/runs/{uuid4()}/explain").status_code, 404)
        self.assertEqual(self.repository.list_publications()["items"], [])
        self.assertIsNone(self.repository.get_ai_explanation(run_id))

    def test_run_listing_pagination_revision_filter_and_validation(self):
        first = self.completed()
        second = self.completed()
        revision = self.repository.get_run(first)["scenario_revision_id"]
        page = self.client.get("/api/v1/runs?limit=1&offset=1")
        self.assertEqual(page.status_code, 200, page.text)
        self.assertEqual(len(page.json()["items"]), 1)
        self.assertEqual(page.json()["limit"], 1)
        self.assertEqual(page.json()["offset"], 1)
        filtered = self.client.get(f"/api/v1/runs?scenario_revision_id={revision}").json()
        self.assertEqual([item["id"] for item in filtered["items"]], [first])
        self.assertNotEqual(first, second)
        self.assertEqual(self.client.get("/api/v1/runs?offset=999").json()["items"], [])
        for query in ("limit=0", "limit=101", "offset=-1", "scenario_revision_id=invalid"):
            self.assertEqual(self.client.get("/api/v1/runs?" + query).status_code, 422)

    def test_publish_public_list_and_detail_are_allowlisted_immutable_and_unauthenticated(self):
        parameters = scenario_parameters()
        parameters["technology"]["source_ref"] = "private-technology-source"
        parameters["technology"]["evidence_status"] = "unverified"
        run_id = self.completed(parameters)
        results = deepcopy(self.repository.get_results(run_id))
        created = self.publish(run_id, json={"title": "Reviewed scenario", "summary": "Selected calculations.", "slug": "reviewed-scenario"})
        self.assertEqual(created.status_code, 201, created.text)
        publication = created.json()
        self.assertEqual(created.headers["location"], f"/api/v1/publications/{publication['id']}")
        self.assertEqual(publication["status"], "pending_review")
        self.assertIsNone(publication["published_at"])
        public_path = "/api/v1/public/reports/reviewed-scenario"
        # Submission alone is not publication.
        self.assertEqual(self.client.get(public_path).status_code, 404)
        self.assertEqual(self.client.get("/api/v1/public/reports").json()["items"], [])
        approved = self.review(publication["id"])
        self.assertEqual(approved.status_code, 200, approved.text)
        self.assertEqual(approved.json()["status"], "published")
        snapshot = publication["snapshot_data"]
        self.assertEqual(snapshot["energy"]["total_kwh"], 100.0)
        self.assertEqual(snapshot["ecology"]["status"], "not_estimable")
        self.assertIsNone(snapshot["ecology"]["value"])
        self.assertTrue(snapshot["ecology"]["required_evidence"])
        self.assertIn(UNVERIFIED, snapshot["limitations"])
        self.assertIn(ECOLOGY_LIMITATION, snapshot["limitations"])
        self.assertEqual(snapshot["boundary"]["volume_m3"], 100.0)
        self.client.cookies.clear()
        detail = self.client.get(public_path)
        self.assertEqual(detail.status_code, 200, detail.text)
        self.assertEqual(detail.json()["snapshot_data"], snapshot)
        page = self.client.get("/api/v1/public/reports?limit=1&offset=0")
        self.assertEqual(page.status_code, 200)
        self.assertEqual(page.json()["items"][0]["slug"], "reviewed-scenario")
        self.assertIn("private-technology-source", json.dumps(self.repository.get_run(run_id)))
        reviewer_id = self.reviewer()[0]
        for data in (snapshot, detail.json(), page.json()):
            encoded = json.dumps(data)
            for private in (run_id, self.user_id, reviewer_id, publication["id"], "private@example.com",
                            "Private Analyst", "Private Reviewer", "private-technology-source", "frozen_inputs",
                            "source_ref", "submitted_by", "reviewed_by", "pending_review"):
                self.assertNotIn(private, encoded)
        self.service.create_revision(self.repository.get_revision(self.repository.get_run(run_id)["scenario_revision_id"])["scenario_id"],
                                     scenario_parameters(chemical_dose_mg_per_l=5), self.user_id)
        self.assertEqual(self.client.get(public_path).json()["snapshot_data"], snapshot)
        self.assertEqual(self.repository.get_results(run_id), results)

    def test_public_reads_remove_legacy_extra_data(self):
        run_id = self.completed()
        legacy = self.repository.create_publication(run_id, "legacy-report", "Report", "Summary",
                                                    {"frozen_inputs": {"password": "private-secret"},
                                                     "provenance": {"dataset": "private-secret"},
                                                     "energy": {"total_kwh": 100.0, "private": "private-secret"}}, self.user_id)
        self.repository.transition_publication(legacy["id"], "approve", self.reviewer()[0])
        self.client.cookies.clear()
        response = self.client.get("/api/v1/public/reports/legacy-report")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertNotIn("private-secret", response.text)
        self.assertEqual(response.json()["snapshot_data"]["energy"], {"total_kwh": 100.0})

    def test_energy_only_publication_does_not_require_emissions_factor_or_other_modules(self):
        parameters = scenario_parameters(factor=None)
        created = self.create_scenario(parameters)
        run_id = self.submit(created["latest_revision"]["id"], modules=["energy"])["run_id"]
        self.assertTrue(self.worker.run_once())
        response = self.publish(run_id)
        self.assertEqual(response.status_code, 201, response.text)
        snapshot = response.json()["snapshot_data"]
        self.assertEqual(snapshot["energy"]["total_kwh"], 100.0)
        self.assertNotIn("carbon", snapshot)
        self.assertNotIn("ecology", snapshot)
        self.assertEqual([item["key"] for item in snapshot["metrics"]], ["energy"])
        explanation = self.explain(run_id, json={"focus": "carbon"})
        self.assertEqual(explanation.status_code, 200, explanation.text)
        self.assertEqual(explanation.json()["cited_metric_keys"], ["energy"])

    def test_publication_preserves_co2_only_units_and_values(self):
        parameters = scenario_parameters()
        parameters["factor"]["gas_basis"] = "CO2"
        run_id = self.completed(parameters)
        response = self.publish(run_id)
        self.assertEqual(response.status_code, 201, response.text)
        carbon = response.json()["snapshot_data"]["carbon"]
        self.assertEqual(carbon["emissions_kg_co2"], 50.0)
        self.assertEqual(carbon["unit"], "kg CO2")
        self.assertNotIn("emissions_kg_co2e", carbon)
        explanation = self.explain(run_id)
        self.assertIn("carbon: 50.0 kg CO2 (", explanation.json()["narrative"])

    def test_publish_slug_generation_duplicate_and_safe_text_validation(self):
        run_id = self.completed()
        first = self.publish_approved(run_id)
        second = self.publish(run_id)
        self.assertEqual(second.status_code, 201, second.text)
        self.assertNotEqual(first.json()["slug"], second.json()["slug"])
        # One pending submission per run at a time.
        pending = self.publish(run_id)
        self.assertEqual(pending.status_code, 409, pending.text)
        self.assertEqual(pending.json()["error"]["code"], "publication_already_pending")
        self.assertEqual(self.publish(run_id, json={"slug": first.json()["slug"]}).status_code, 409)
        for body in ({"slug": "Not Safe"}, {"slug": "../escape"}, {"title": "<script>"},
                     {"summary": "unsafe\ntext"}, {"title": "   "}, {"snapshot_data": {}}):
            self.assertEqual(self.publish(run_id, json=body).status_code, 422)
        for path in ("unknown-report", "INVALID"):
            self.assertEqual(self.client.get("/api/v1/public/reports/" + path).status_code, 404)
        for query in ("limit=0", "limit=101", "offset=-1"):
            self.assertEqual(self.client.get("/api/v1/public/reports?" + query).status_code, 422)

    def test_concurrent_slug_conflict_is_a_safe_409(self):
        run_id = self.completed()
        self.assertEqual(self.publish(run_id, json={"slug": "same-slug"}).status_code, 201)
        with patch("app.api.v1.publications._slug_exists", side_effect=[False, True]):
            response = self.publish(self.completed(), json={"slug": "same-slug"})
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(response.json()["error"]["code"], "publication_slug_conflict")
        self.assertEqual(len(self.repository.list_publications()["items"]), 1)


if __name__ == "__main__":
    unittest.main()
