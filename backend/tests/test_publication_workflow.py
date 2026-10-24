"""Reviewed publication state machine, audit trail, migrations and dataset listing."""

import json
import unittest
from unittest.mock import patch
from uuid import uuid4

from app.repositories.migrations import current_revision, upgrade
from app.repositories.simulation import SimulationRepository, canonical_json
from test_api import RepositoryFixture, scenario_parameters

ORIGIN = "http://localhost:5173"
COOKIE = "__Host-pv_session"


class PublicationWorkflowContracts(RepositoryFixture, unittest.TestCase):
    def setUp(self):
        super().setUp()
        from fastapi.testclient import TestClient
        from app.main import create_app
        self.users = {}
        for role in ("analyst", "reviewer", "administrator"):
            user_id = self.user_id if role == "analyst" else str(uuid4())
            self.repository.create_user(user_id, role, email=f"{role}@example.com", display_name=f"{role.title()} User")
            token, csrf = self.repository.create_session(user_id)
            self.users[role] = {"id": user_id, "token": token, "csrf": csrf}
        self.context = TestClient(create_app(repository=self.repository, allowed_origins=[ORIGIN]),
                                  base_url="https://testserver")
        self.client = self.context.__enter__()

    def tearDown(self):
        self.context.__exit__(None, None, None)
        super().tearDown()

    def call(self, role, method, path, json_body=None, csrf=True):
        user = self.users[role]
        self.client.cookies.set(COOKIE, user["token"])
        headers = {"Origin": ORIGIN, "X-CSRF-Token": user["csrf"]} if csrf else {}
        return self.client.request(method, path, headers=headers, json=json_body)

    def submit_publication(self, run_id=None, role="analyst", **body):
        response = self.call(role, "POST", "/api/v1/publications", {"run_id": run_id or self.completed(), **body})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def decide(self, publication_id, action, role="reviewer", reason=None):
        return self.call(role, "POST", f"/api/v1/publications/{publication_id}/{action}",
                         {"reason": reason} if reason else None)

    def public(self, slug):
        self.client.cookies.clear()
        return self.client.get(f"/api/v1/public/reports/{slug}")

    def test_full_lifecycle_submit_approve_withdraw_with_public_visibility(self):
        created = self.submit_publication(slug="lifecycle-report")
        self.assertEqual(created["status"], "pending_review")
        self.assertEqual(created["submitted_by"], self.users["analyst"]["id"])
        self.assertEqual(self.public("lifecycle-report").status_code, 404)

        approved = self.decide(created["id"], "approve", reason="Evidence limitations are displayed.")
        self.assertEqual(approved.status_code, 200, approved.text)
        body = approved.json()
        self.assertEqual(body["status"], "published")
        self.assertEqual(body["reviewed_by"], self.users["reviewer"]["id"])
        self.assertEqual(body["decision_reason"], "Evidence limitations are displayed.")
        self.assertIsNotNone(body["published_at"])
        visible = self.public("lifecycle-report")
        self.assertEqual(visible.status_code, 200, visible.text)
        self.assertEqual(visible.json()["view_count"], 1)
        listed = self.client.get("/api/v1/public/reports").json()["items"]
        self.assertEqual([item["slug"] for item in listed], ["lifecycle-report"])
        self.assertNotIn("snapshot_data", listed[0])
        with_snapshot = self.client.get("/api/v1/public/reports?include_snapshot=true").json()["items"][0]
        self.assertEqual(with_snapshot["snapshot_data"]["energy"]["total_kwh"], 100.0)
        self.assertNotIn(self.users["analyst"]["id"], json.dumps(with_snapshot))
        self.assertEqual(self.public("lifecycle-report").json()["view_count"], 2)

        withdrawn = self.decide(created["id"], "withdraw", reason="Superseded by a corrected factor set.")
        self.assertEqual(withdrawn.status_code, 200, withdrawn.text)
        self.assertEqual(withdrawn.json()["status"], "withdrawn")
        gone = self.public("lifecycle-report")
        self.assertEqual(gone.status_code, 410, gone.text)
        error = gone.json()["error"]
        self.assertEqual(error["code"], "publication_withdrawn")
        self.assertEqual(error["details"]["withdrawal_reason"], "Superseded by a corrected factor set.")
        self.assertEqual(error["details"]["title"], created["title"])
        self.assertNotIn("snapshot_data", json.dumps(error))
        self.assertNotIn(self.users["reviewer"]["id"], gone.text)
        self.assertEqual(self.client.get("/api/v1/public/reports").json()["items"], [])

        audit = self.call("analyst", "GET", f"/api/v1/publications/{created['id']}").json()["audit"]
        self.assertEqual([event["action"] for event in audit],
                         ["publication.submitted", "publication.approved", "publication.withdrawn"])
        self.assertEqual(audit[-1]["change_summary"]["status"], {"from": "published", "to": "withdrawn"})
        self.assertEqual(audit[1]["actor_id"], self.users["reviewer"]["id"])

    def test_rejection_requires_reason_keeps_report_private_and_allows_resubmission(self):
        created = self.submit_publication()
        self.assertEqual(self.decide(created["id"], "reject").status_code, 422)
        rejected = self.decide(created["id"], "reject", reason="Factor year does not match the period.")
        self.assertEqual(rejected.status_code, 200, rejected.text)
        self.assertEqual(rejected.json()["status"], "rejected")
        self.assertEqual(rejected.json()["decision_reason"], "Factor year does not match the period.")
        self.assertEqual(self.public(created["slug"]).status_code, 404)
        resubmitted = self.submit_publication(created["run_id"])
        self.assertEqual(resubmitted["status"], "pending_review")
        self.assertNotEqual(resubmitted["slug"], created["slug"])

    def test_invalid_transitions_are_conflicts(self):
        created = self.submit_publication()
        self.assertEqual(self.decide(created["id"], "withdraw", reason="Too early").status_code, 409)
        self.assertEqual(self.decide(created["id"], "approve").status_code, 200)
        for action, reason in (("approve", None), ("reject", "Late")):
            response = self.decide(created["id"], action, reason=reason)
            self.assertEqual(response.status_code, 409, response.text)
            self.assertEqual(response.json()["error"]["code"], "invalid_publication_state")
        self.assertEqual(self.decide(created["id"], "withdraw", reason="Correction").status_code, 200)
        self.assertEqual(self.decide(created["id"], "withdraw", reason="Again").status_code, 409)
        self.assertEqual(self.decide(created["id"], "approve").status_code, 409)
        self.assertEqual(self.decide(str(uuid4()), "approve").status_code, 404)

    def test_roles_self_review_csrf_and_origin_are_enforced(self):
        created = self.submit_publication()
        # Analysts cannot decide; reviewers cannot submit.
        self.assertEqual(self.decide(created["id"], "approve", role="analyst").status_code, 403)
        self.assertEqual(self.call("reviewer", "POST", "/api/v1/publications",
                                   {"run_id": created["run_id"]}).status_code, 403)
        # An administrator may submit, but must not approve their own submission.
        own = self.submit_publication(role="administrator")
        response = self.decide(own["id"], "approve", role="administrator")
        self.assertEqual(response.status_code, 403, response.text)
        self.assertEqual(response.json()["error"]["code"], "self_review_forbidden")
        self.assertEqual(self.decide(own["id"], "approve", role="reviewer").status_code, 200)
        # The administrator can review another user's work and withdraw publications.
        self.assertEqual(self.decide(created["id"], "approve", role="administrator").status_code, 200)
        self.assertEqual(self.decide(own["id"], "withdraw", role="administrator", reason="Policy").status_code, 200)
        for action in ("approve", "reject", "withdraw"):
            path = f"/api/v1/publications/{created['id']}/{action}"
            self.client.cookies.set(COOKIE, self.users["reviewer"]["token"])
            for headers in ({}, {"Origin": ORIGIN, "X-CSRF-Token": "wrong"},
                            {"Origin": "https://evil.example", "X-CSRF-Token": self.users["reviewer"]["csrf"]}):
                with self.subTest(action=action, headers=headers):
                    denied = self.client.post(path, headers=headers, json={"reason": "x"})
                    self.assertEqual(denied.status_code, 403)
                    self.assertEqual(denied.json()["error"]["code"], "csrf_rejected")
        self.client.cookies.clear()
        self.assertEqual(self.client.post(f"/api/v1/publications/{created['id']}/approve").status_code, 401)
        self.assertEqual(self.client.get("/api/v1/publications").status_code, 401)

    def test_private_listing_filters_by_status_and_run(self):
        first = self.submit_publication()
        second = self.submit_publication()
        self.decide(second["id"], "approve")
        pending = self.call("reviewer", "GET", "/api/v1/publications?status=pending_review").json()["items"]
        self.assertEqual([item["id"] for item in pending], [first["id"]])
        by_run = self.call("analyst", "GET", f"/api/v1/publications?run_id={second['run_id']}").json()["items"]
        self.assertEqual([item["status"] for item in by_run], ["published"])
        self.assertEqual(self.call("analyst", "GET", "/api/v1/publications?status=invented").status_code, 422)
        detail = self.call("reviewer", "GET", f"/api/v1/publications/{first['id']}").json()
        self.assertEqual(detail["snapshot_data"]["energy"]["total_kwh"], 100.0)
        self.assertEqual(detail["submitted_by_name"], "Analyst User")

    def test_decision_text_is_plain_and_bounded(self):
        created = self.submit_publication()
        for body in ({"reason": "<b>bold</b>"}, {"reason": "two\nlines"}, {"reason": "x" * 2001},
                     {"reason": "ok", "status": "published"}):
            with self.subTest(body=body):
                response = self.call("reviewer", "POST", f"/api/v1/publications/{created['id']}/reject", body)
                self.assertEqual(response.status_code, 422, response.text)

    def test_dataset_listing_returns_summaries_without_raw_csv(self):
        csv = ("period_start,period_end,volume_m3,electricity_kwh,pump_hours\n"
               "2026-01-01T00:00:00+08:00,2026-01-02T00:00:00+08:00,100,50,10\n").encode()
        self.client.cookies.set(COOKIE, self.users["analyst"]["token"])
        created = self.client.post("/api/v1/datasets?source_ref=plant-log-jan&evidence_status=measured",
                                   headers={"Origin": ORIGIN, "X-CSRF-Token": self.users["analyst"]["csrf"],
                                            "Content-Type": "text/csv"}, content=csv)
        self.assertEqual(created.status_code, 201, created.text)
        page = self.client.get("/api/v1/datasets")
        self.assertEqual(page.status_code, 200, page.text)
        item = page.json()["items"][0]
        self.assertEqual(item["id"], created.json()["id"])
        self.assertEqual(item["row_count"], 1)
        self.assertEqual(item["source_ref"], "plant-log-jan")
        self.assertEqual(item["quality"]["invalid_values"], 0)
        self.assertNotIn("original_csv", page.text)
        self.assertEqual(self.client.get("/api/v1/datasets?limit=0").status_code, 422)
        self.client.cookies.clear()
        self.assertEqual(self.client.get("/api/v1/datasets").status_code, 401)


class MigrationContracts(RepositoryFixture, unittest.TestCase):
    def test_fresh_schema_is_at_head_and_idempotent(self):
        self.assertEqual(current_revision(self.repository), "0004")
        self.repository.create_schema()
        self.assertEqual(current_revision(self.repository), "0004")

    def test_legacy_published_rows_are_backfilled_as_pending_review(self):
        repository = SimulationRepository(self.database_url.replace("test.db", "legacy.db"))
        try:
            upgrade(repository, "0001")
            self.assertEqual(current_revision(repository), "0001")
            repository.create_user(self.user_id, "analyst", email="legacy@example.com")
            run_id = str(uuid4())
            with repository.transaction() as c:
                c.execute("INSERT INTO scenarios(id,name,kind,created_by,created_at) VALUES('s','n','baseline',:u,'2026-01-01')",
                          {"u": self.user_id})
                c.execute("INSERT INTO scenario_revisions(id,scenario_id,revision_no,parameters,created_by,created_at) "
                          "VALUES('r','s',1,'{}',:u,'2026-01-01')", {"u": self.user_id})
                c.execute("INSERT INTO simulation_runs(id,scenario_revision_id,frozen_inputs,snapshot_hash,code_version,status,submitted_by,created_at) "
                          "VALUES(:id,'r','{}','h','v','succeeded',:u,'2026-01-01')", {"id": run_id, "u": self.user_id})
                c.execute("INSERT INTO publications(id,run_id,slug,title,summary,snapshot_data,published_by,published_at,view_count) "
                          "VALUES('p',:run,'legacy-slug','Legacy','S',:snap,:u,'2026-10-13T00:00:00+00:00',7)",
                          {"run": run_id, "snap": canonical_json({"energy": {"total_kwh": 1.0}}), "u": self.user_id})
            repository.create_schema()
            self.assertEqual(current_revision(repository), "0004")
            publication = repository.get_publication("p")
            self.assertEqual(publication["status"], "pending_review")
            self.assertEqual(publication["submitted_by"], self.user_id)
            self.assertEqual(publication["submitted_at"], "2026-10-13T00:00:00+00:00")
            self.assertIsNone(publication["published_at"])
            self.assertEqual(publication["view_count"], 7)
            self.assertEqual(repository.list_public_publications()["items"], [])
            with self.assertRaises(Exception) as error:
                repository.get_public_publication("legacy-slug")
            self.assertEqual(error.exception.status_code, 404)
        finally:
            repository.close()


class BootstrapContracts(unittest.TestCase):
    def test_create_user_command_provisions_reviewer_accounts(self):
        import tempfile
        from pathlib import Path
        from app import bootstrap
        from app.services.auth import verify_password
        with tempfile.TemporaryDirectory() as directory:
            url = "sqlite:///" + str(Path(directory) / "boot.db")
            with patch.object(bootstrap.settings, "DATABASE_URL", url):
                bootstrap.main(["create-user", "--email", "Reviewer@Example.com", "--role", "reviewer",
                                "--name", "Rev", "--password", "long-enough-password"])
                bootstrap.main(["create-user", "--email", "reviewer@example.com", "--role", "administrator"])
                with self.assertRaises(SystemExit):
                    bootstrap.main(["create-user", "--email", "short@example.com", "--role", "reviewer",
                                    "--password", "short"])
            repository = SimulationRepository(url)
            try:
                user = repository.find_user_by_email("reviewer@example.com")
                self.assertEqual(user["role"], "administrator")
                self.assertTrue(verify_password("long-enough-password", user["password_hash"]))
                self.assertIsNone(repository.find_user_by_email("short@example.com"))
            finally:
                repository.close()


class PostgresRowContracts(unittest.TestCase):
    def test_uuid_columns_are_strings_so_ownership_checks_compare_equal(self):
        # PostgreSQL returns uuid.UUID for every UUID column, not only *_id columns.
        from uuid import UUID
        from app.repositories.simulation import _SQLConnection
        submitter = uuid4()
        row = _SQLConnection._row({"id": uuid4(), "submitted_by": submitter, "reviewed_by": None,
                                   "created_by": uuid4(), "title": "t"})
        self.assertEqual(row["submitted_by"], str(submitter))
        self.assertIsNone(row["reviewed_by"])
        self.assertIsInstance(row["created_by"], str)
        self.assertFalse(any(isinstance(value, UUID) for value in row.values()))


if __name__ == "__main__":
    unittest.main()
