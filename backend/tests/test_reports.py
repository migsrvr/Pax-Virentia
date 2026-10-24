"""Report exports, insight reviews and run inputs over the real ASGI app and SQLite."""

import csv
import io
import unittest
from uuid import uuid4

from app.services.reports import NOT_ESTIMABLE, csv_cell, render_csv
from test_api import RepositoryFixture, scenario_parameters

ORIGIN = "http://localhost:5173"
COOKIE = "__Host-pv_session"


def csv_rows(content):
    return list(csv.reader(io.StringIO(content.decode("utf-8-sig"))))


class ReportFixture(RepositoryFixture):
    def setUp(self):
        super().setUp()
        from fastapi.testclient import TestClient
        from app.main import create_app
        self.repository.create_user(self.user_id, "analyst", email="analyst@example.com", display_name="Ana Analyst")
        self.token, self.csrf = self.repository.create_session(self.user_id)
        self.context = TestClient(create_app(repository=self.repository, allowed_origins=[ORIGIN]),
                                  base_url="https://testserver")
        self.client = self.context.__enter__()
        self.client.cookies.set(COOKIE, self.token)
        self.headers = {"Origin": ORIGIN, "X-CSRF-Token": self.csrf}

    def tearDown(self):
        self.context.__exit__(None, None, None)
        super().tearDown()

    def pair(self):
        baseline = self.completed()
        parameters = scenario_parameters()
        parameters["technology"]["pump_power_kw"] = 8.0
        return baseline, self.completed(parameters)

    def create(self, **body):
        return self.client.post("/api/v1/reports", headers=self.headers, json=body)

    def download(self, report_id, file_format, **params):
        return self.client.get(f"/api/v1/reports/{report_id}/download", params={"format": file_format, **params})


class ReportContracts(ReportFixture, unittest.TestCase):
    def test_selected_sections_and_formats_drive_preview_and_files(self):
        baseline, intervention = self.pair()
        response = self.create(title="Pump comparison", run_ids=[baseline, intervention],
                               sections=["summary", "comparison"], formats=["csv"],
                               comparison={"baseline_run_id": baseline, "intervention_run_id": intervention})
        self.assertEqual(response.status_code, 201, response.text)
        body = response.json()
        preview = body["preview"]
        self.assertEqual([section["key"] for section in preview["sections"]], ["summary", "comparison", "methodology"])
        self.assertEqual(preview["page_count"], 3)
        self.assertEqual(body["formats"], ["csv"])
        comparison = preview["sections"][1]["tables"][0]["rows"]
        energy = next(row for row in comparison if row[0] == "Energy")
        self.assertEqual(energy[1:4], [100.0, 80.0, -20.0])
        ecology = next(row for row in comparison if row[0] == "Downstream ecosystem stress")
        self.assertEqual(ecology[1:5], [NOT_ESTIMABLE] * 4)
        self.assertIn("Net operating savings", " ".join(preview["sections"][0]["paragraphs"]))

        csv_file = self.download(body["id"], "csv")
        self.assertEqual(csv_file.status_code, 200, csv_file.text)
        self.assertTrue(csv_file.headers["content-type"].startswith("text/csv"))
        self.assertIn('attachment; filename="pump-comparison.csv"', csv_file.headers["content-disposition"])
        rows = csv_rows(csv_file.content)
        flat = [cell for row in rows for cell in row]
        self.assertIn("Scenario comparison", flat)
        self.assertNotIn("Inputs and assumptions", flat)
        self.assertNotIn("Results by run", flat)
        self.assertIn(baseline, flat)
        # The unrequested PDF format is unavailable.
        self.assertEqual(self.download(body["id"], "pdf").status_code, 404)
        listed = self.client.get("/api/v1/reports").json()["items"]
        self.assertEqual([item["id"] for item in listed], [body["id"]])
        self.assertEqual(listed[0]["created_by_name"], "Ana Analyst")

    def test_preview_matches_export_without_storing_a_report(self):
        run_id = self.completed()
        body = {"run_ids": [run_id], "sections": ["results", "summary"], "formats": ["csv"]}
        preview = self.client.post("/api/v1/reports/preview", headers=self.headers, json=body)
        self.assertEqual(preview.status_code, 200, preview.text)
        self.assertEqual([section["key"] for section in preview.json()["preview"]["sections"]],
                         ["summary", "results", "methodology"])
        self.assertEqual(self.client.get("/api/v1/reports").json()["items"], [])
        created = self.create(**body).json()
        for key in ("sections", "label", "run_ids", "formats"):
            self.assertEqual(created["preview"][key], preview.json()["preview"][key])
        self.assertEqual(self.client.post("/api/v1/reports/preview", json=body).status_code, 403)

    def test_pdf_is_a_real_document_containing_run_identifiers(self):
        run_id = self.completed()
        body = self.create(run_ids=[run_id], sections=["summary", "inputs", "results"], formats=["pdf", "csv"]).json()
        pdf = self.download(body["id"], "pdf", disposition="inline")
        self.assertEqual(pdf.status_code, 200, pdf.text)
        self.assertEqual(pdf.headers["content-type"], "application/pdf")
        self.assertTrue(pdf.headers["content-disposition"].startswith("inline;"))
        self.assertTrue(pdf.content.startswith(b"%PDF-"))
        self.assertGreater(len(pdf.content), 2000)
        # Regeneration from immutable data is byte-stable.
        self.assertEqual(self.download(body["id"], "pdf", disposition="inline").content, pdf.content)
        rows = csv_rows(self.download(body["id"], "csv").content)
        ecology = next(row for row in rows if row and row[0] == "Downstream ecosystem stress")
        self.assertEqual(ecology[1], NOT_ESTIMABLE)
        self.assertNotIn("0", ecology[1:2])
        self.assertIn(run_id, [cell for row in rows for cell in row])
        detail = self.client.get(f"/api/v1/reports/{body['id']}").json()
        self.assertEqual(detail["preview"], body["preview"])

    def test_validation_rejects_inconsistent_requests(self):
        baseline, intervention = self.pair()
        for body in ({"run_ids": [], "sections": ["summary"], "formats": ["csv"]},
                     {"run_ids": [baseline, baseline], "sections": ["summary"], "formats": ["csv"]},
                     {"run_ids": [baseline], "sections": [], "formats": ["csv"]},
                     {"run_ids": [baseline], "sections": ["summary"], "formats": []},
                     {"run_ids": [baseline], "sections": ["recommendations"], "formats": ["csv"]},
                     {"run_ids": [baseline], "sections": ["summary"], "formats": ["pdf"], "report_type": "data_export"},
                     {"run_ids": [baseline], "sections": ["comparison"], "formats": ["csv"]},
                     {"run_ids": [baseline], "sections": ["comparison"], "formats": ["csv"],
                      "comparison": {"baseline_run_id": baseline, "intervention_run_id": intervention}},
                     {"run_ids": [baseline], "sections": ["summary"], "formats": ["csv"], "title": "<b>"}):
            with self.subTest(body=body):
                self.assertEqual(self.create(**body).status_code, 422)
        self.assertEqual(self.client.get("/api/v1/reports").json()["items"], [])

    def test_incompatible_comparison_and_unfinished_runs_are_rejected(self):
        baseline = self.completed()
        other = self.completed(scenario_parameters(volume_m3=90.0))
        response = self.create(run_ids=[baseline, other], sections=["comparison"], formats=["csv"],
                               comparison={"baseline_run_id": baseline, "intervention_run_id": other})
        self.assertEqual(response.status_code, 422, response.text)
        self.assertEqual(response.json()["error"]["code"], "incompatible_comparison")
        queued = self.submit(self.create_scenario()["latest_revision"]["id"])["run_id"]
        response = self.create(run_ids=[queued], sections=["summary"], formats=["csv"])
        self.assertEqual(response.status_code, 409, response.text)
        self.assertEqual(self.create(run_ids=[str(uuid4())], sections=["summary"], formats=["csv"]).status_code, 404)
        self.assertEqual(self.client.get("/api/v1/reports").json()["items"], [])

    def test_authorization_and_csrf(self):
        run_id = self.completed()
        body = {"run_ids": [run_id], "sections": ["summary"], "formats": ["csv"]}
        self.assertEqual(self.client.post("/api/v1/reports", json=body).status_code, 403)
        created = self.create(**body).json()
        self.client.cookies.clear()
        self.assertEqual(self.client.post("/api/v1/reports", headers=self.headers, json=body).status_code, 401)
        self.assertEqual(self.client.get("/api/v1/reports").status_code, 401)
        self.assertEqual(self.download(created["id"], "csv").status_code, 401)

    def test_public_download_follows_publication_status(self):
        run_id = self.completed()
        submitted = self.client.post("/api/v1/publications", headers=self.headers,
                                     json={"run_id": run_id, "slug": "public-download"}).json()
        self.client.cookies.clear()
        path = "/api/v1/public/reports/public-download/download"
        self.assertEqual(self.client.get(path, params={"format": "csv"}).status_code, 404)
        reviewer_id = str(uuid4())
        self.repository.create_user(reviewer_id, "reviewer")
        self.repository.transition_publication(submitted["id"], "approve", reviewer_id)
        csv_file = self.client.get(path, params={"format": "csv"})
        self.assertEqual(csv_file.status_code, 200, csv_file.text)
        text = csv_file.content.decode("utf-8-sig")
        self.assertIn("reviewed public snapshot", text)
        self.assertIn(NOT_ESTIMABLE, text)
        for private in (run_id, self.user_id, "analyst@example.com", "synthetic arithmetic fixture"):
            self.assertNotIn(private, text)
        self.assertTrue(self.client.get(path, params={"format": "pdf"}).content.startswith(b"%PDF-"))
        self.repository.transition_publication(submitted["id"], "withdraw", reviewer_id, "Correction")
        self.assertEqual(self.client.get(path, params={"format": "csv"}).status_code, 410)

    def test_csv_cells_neutralize_formula_injection(self):
        for value in ("=HYPERLINK(\"x\")", "+1", "-2+3", "@SUM(A1)", "\tcmd", "\rcmd"):
            self.assertTrue(csv_cell(value).startswith("'"), value)
        self.assertEqual(csv_cell(-20.0), "-20.0")
        self.assertEqual(csv_cell("Energy"), "Energy")
        self.assertEqual(csv_cell(None), "")
        model = {"id": "r", "title": "=cmd", "label": "l", "created_at": "t", "sections": [
            {"key": "summary", "title": "S", "paragraphs": [], "tables": [
                {"caption": "c", "columns": ["Run"], "rows": [["=1+1"]]}]}]}
        rows = csv_rows(render_csv(model))
        self.assertEqual(rows[0][1], "'=cmd")
        self.assertIn(["'=1+1"], rows)


class InsightAndInputContracts(ReportFixture, unittest.TestCase):
    def test_insight_reviews_persist_per_user(self):
        baseline, intervention = self.pair()
        key = f"{baseline}:{intervention}"
        saved = self.client.put(f"/api/v1/insight-reviews/{key}", headers=self.headers,
                                json={"status": "reviewed", "note": "Checked against plant log."})
        self.assertEqual(saved.status_code, 200, saved.text)
        self.client.put(f"/api/v1/insight-reviews/{key}", headers=self.headers, json={"status": "dismissed"})
        items = self.client.get("/api/v1/insight-reviews").json()["items"]
        self.assertEqual([(item["insight_key"], item["status"]) for item in items], [(key, "dismissed")])
        other = str(uuid4())
        self.repository.create_user(other, "analyst")
        token, _ = self.repository.create_session(other)
        self.client.cookies.set(COOKIE, token)
        self.assertEqual(self.client.get("/api/v1/insight-reviews").json()["items"], [])
        self.client.cookies.set(COOKIE, self.token)
        self.assertEqual(self.client.delete(f"/api/v1/insight-reviews/{key}", headers=self.headers).status_code, 204)
        self.assertEqual(self.client.get("/api/v1/insight-reviews").json()["items"], [])
        for bad_key, body in (("not-a-key", {"status": "reviewed"}), (key, {"status": "approved"}),
                              (key, {"status": "reviewed", "note": "<b>"})):
            self.assertEqual(self.client.put(f"/api/v1/insight-reviews/{bad_key}", headers=self.headers,
                                             json=body).status_code, 422)
        self.assertEqual(self.client.put(f"/api/v1/insight-reviews/{key}", json={"status": "reviewed"}).status_code, 403)

    def test_run_inputs_expose_frozen_parameters_for_prefill(self):
        run_id = self.completed()
        response = self.client.get(f"/api/v1/runs/{run_id}/inputs")
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["run_id"], run_id)
        self.assertEqual(body["kind"], "baseline")
        self.assertEqual(body["parameters"]["volume_m3"], 100.0)
        self.assertIn("source_time_basis", body["parameters"])
        self.assertEqual(self.client.get(f"/api/v1/runs/{uuid4()}/inputs").status_code, 404)


if __name__ == "__main__":
    unittest.main()
