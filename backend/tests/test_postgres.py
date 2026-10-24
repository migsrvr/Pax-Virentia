"""PostgreSQL-only contracts: migrations on a legacy schema and UUID-typed ownership checks.

Runs only when PV_TEST_POSTGRES_URL points at a disposable database (CI provides one);
the schema in that database is dropped and recreated.
"""

import os
import unittest
from uuid import uuid4

from app.repositories.migrations import current_revision, upgrade
from app.repositories.simulation import SimulationRepository, canonical_json
from app.services.errors import ServiceError
from app.services.simulations import SimulationService
from app.jobs.worker import RunWorker
from test_api import scenario_parameters

URL = os.environ.get("PV_TEST_POSTGRES_URL")


@unittest.skipUnless(URL, "Set PV_TEST_POSTGRES_URL to a disposable PostgreSQL database to run these tests")
class PostgresContracts(unittest.TestCase):
    def setUp(self):
        self.repository = SimulationRepository(URL)
        with self.repository.transaction() as c:
            c.execute("DROP SCHEMA public CASCADE")
            c.execute("CREATE SCHEMA public")

    def tearDown(self):
        self.repository.close()

    def test_legacy_upgrade_backfill_and_publication_workflow(self):
        upgrade(self.repository, "0001")
        analyst, reviewer = str(uuid4()), str(uuid4())
        self.repository.create_user(analyst, "analyst", email="pg-analyst@example.org")
        self.repository.create_user(reviewer, "reviewer", email="pg-reviewer@example.org")
        service = SimulationService(self.repository, code_version="pg-test")
        scenario = service.create_scenario("PG", "baseline", scenario_parameters(), analyst)
        run_id = service.submit_run(scenario["latest_revision"]["id"], ["energy", "ecology"], str(uuid4()), analyst)["run_id"]
        self.assertTrue(RunWorker(self.repository).run_once())
        with self.repository.transaction() as c:
            c.execute("INSERT INTO publications(id,run_id,slug,title,summary,snapshot_data,published_by,published_at,view_count) "
                      "VALUES(:id,:run,'legacy-pg','Legacy','S',CAST(:snap AS JSONB),:user,'2026-10-13T00:00:00+00:00',3)",
                      {"id": str(uuid4()), "run": run_id, "snap": canonical_json({"energy": {"total_kwh": 1.0}}), "user": analyst})

        self.repository.create_schema()
        self.assertEqual(current_revision(self.repository), "0004")
        legacy = self.repository.list_publications()["items"][0]
        self.assertEqual(legacy["status"], "pending_review")
        self.assertEqual(legacy["submitted_by"], analyst)
        self.assertIsNone(legacy["published_at"])
        self.assertEqual(self.repository.list_public_publications()["items"], [])

        # UUID columns come back as strings, so the self-review guard holds on PostgreSQL.
        with self.assertRaises(ServiceError) as error:
            self.repository.transition_publication(legacy["id"], "approve", analyst)
        self.assertEqual(error.exception.code, "self_review_forbidden")
        published = self.repository.transition_publication(legacy["id"], "approve", reviewer, "Checked")
        self.assertEqual(published["status"], "published")
        self.assertEqual(published["reviewed_by"], reviewer)
        self.assertEqual(self.repository.get_public_publication("legacy-pg")["view_count"], 4)
        self.repository.transition_publication(legacy["id"], "withdraw", reviewer, "Correction")
        with self.assertRaises(ServiceError) as error:
            self.repository.get_public_publication("legacy-pg")
        self.assertEqual(error.exception.status_code, 410)
        self.assertEqual([event["action"] for event in self.repository.list_audit_events("publication", legacy["id"])],
                         ["publication.approved", "publication.withdrawn"])

        # Run ownership checks also compare strings to strings.
        queued = service.submit_run(scenario["latest_revision"]["id"], ["energy"], str(uuid4()), analyst)["run_id"]
        self.assertEqual(service.cancel_run(queued, analyst)["status"], "cancelled")

        report = self.repository.create_report("technical", "PG report", {"sections": ["summary"], "formats": ["csv"]},
                                               [run_id], {run_id: "hash"}, analyst)
        self.assertEqual(report["run_ids"], [run_id])
        self.assertEqual(report["created_by"], analyst)
        self.repository.save_insight_review(analyst, f"{run_id}:{run_id}", "reviewed", None)
        self.repository.save_insight_review(analyst, f"{run_id}:{run_id}", "dismissed", "again")
        self.assertEqual([item["status"] for item in self.repository.list_insight_reviews(analyst)], ["dismissed"])
        self.assertEqual(self.repository.list_datasets()["items"], [])
        self.repository.create_schema()
        self.assertEqual(current_revision(self.repository), "0004")


if __name__ == "__main__":
    unittest.main()
