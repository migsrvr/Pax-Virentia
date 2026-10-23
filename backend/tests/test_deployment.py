"""Deployment contracts: shared origins, managed worker and provider schema."""

import asyncio
from copy import deepcopy
import json
import os
from pathlib import Path
import re
import threading
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import OriginPolicy, Settings, parse_allowed_origins
from app.integrations.gemini import ExplanationOutput, _provider_output, provider_schema
from app.main import create_app
from app.services.auth import hash_password
from test_api import RepositoryFixture, scenario_parameters

LOCAL = "http://localhost:5173"
PREVIEW = "https://pax-virentia-git-feature-analyst.vercel.app"
ROOT = Path(__file__).resolve().parents[2]


class OriginConfigurationContracts(unittest.TestCase):
    def test_json_csv_and_environment_values_normalize_equally(self):
        expected = [LOCAL, "https://*.vercel.app"]
        for value in ([" " + LOCAL + "/ ", "https://*.vercel.app/"],
                      ' ["http://localhost:5173/", "https://*.vercel.app"] ',
                      " http://localhost:5173/ , https://*.vercel.app/ "):
            with self.subTest(value=value):
                self.assertEqual(Settings(_env_file=None, ALLOWED_ORIGINS=value).ALLOWED_ORIGINS, expected)
        for value in (json.dumps(expected), ", ".join(expected)):
            with patch.dict(os.environ, {"ALLOWED_ORIGINS": value, "ENABLE_EMBEDDED_WORKER": "false"}):
                config = Settings(_env_file=None)
                self.assertEqual(config.ALLOWED_ORIGINS, expected)
                self.assertFalse(config.ENABLE_EMBEDDED_WORKER)
        self.assertEqual(parse_allowed_origins([LOCAL, LOCAL + "/"]), [LOCAL])
        self.assertEqual(parse_allowed_origins(""), [])

    def test_invalid_configuration_rejects_non_origins_and_regex_injection(self):
        invalid = ["*", "null", "ftp://example.com", "http://*.vercel.app", "https://*.example.com",
                   "https://.*.vercel.app", "https://(.*).vercel.app", "https://user:secret@example.com",
                   "https://example.com/path", "https://example.com?query", "https://example.com#fragment",
                   "https://example.com:65536", "https://example.com:0", "https://example.com\\evil",
                   "http://localhost:5173,", '["https://example.com", null]', '["invalid"]']
        for value in invalid:
            with self.subTest(value=value), self.assertRaises((ValueError, ValidationError)):
                Settings(_env_file=None, ALLOWED_ORIGINS=value)

    def test_wildcard_matches_only_https_vercel_subdomains(self):
        policy = OriginPolicy([LOCAL, "https://*.vercel.app"])
        for origin in (LOCAL, LOCAL + "/", "  " + PREVIEW + "/ ",
                       "https://my-app.vercel.app", "https://nested.preview.vercel.app"):
            self.assertTrue(policy.allows(origin), origin)
        for origin in (None, "", "null", "http://my-app.vercel.app", "https://vercel.app",
                       "https://vercel.app.evil.com", "https://my-app.vercel.app.evil.com",
                       "https://evilvercel.app", "https://evil.com/vercel.app",
                       "https://my-app.vercel.app/path", "https://my-app.vercel.app?query",
                       "https://my-app.vercel.app#fragment", "https://user@my-app.vercel.app",
                       "https://my-app.vercel.app@evil.com", "https://my-app.vercel.app:444",
                       "https://-invalid.vercel.app", "https://invalid-.vercel.app", "https://*.vercel.app",
                       "https://my-app.vercel.app\\evil.com", "https://my-app.vercel.app\nevil.com"):
            self.assertFalse(policy.allows(origin), origin)
        self.assertTrue(OriginPolicy(["https://vercel.app"]).allows("https://vercel.app"))

    def test_exact_overrides_do_not_implicitly_trust_preview_or_other_local_ports(self):
        policy = OriginPolicy([LOCAL])
        self.assertTrue(policy.allows(LOCAL))
        for origin in (PREVIEW, "http://localhost:5174", "http://127.0.0.1:5173", "http://localhost:51730"):
            self.assertFalse(policy.allows(origin))
        self.assertFalse(OriginPolicy([]).allows(LOCAL))
        self.assertTrue(OriginPolicy(["http://[::1]:5173/"]).allows("http://[::1]:5173"))


class OriginHTTPContracts(RepositoryFixture, unittest.TestCase):
    def setUp(self):
        super().setUp()
        self.repository.create_user(self.user_id, "analyst", email="analyst@example.com",
                                    password_hash=hash_password("correct-battery-horse"))

    def login(self, client, origin):
        headers = {"Origin": origin} if origin else {}
        return client.post("/api/v1/auth/login", headers=headers,
                           json={"email": "analyst@example.com", "password": "correct-battery-horse"})

    def test_preview_cors_login_and_csrf_share_the_policy(self):
        app = create_app(repository=self.repository, allowed_origins=[LOCAL, "https://*.vercel.app"])
        with TestClient(app, base_url="https://testserver") as client:
            for origin in (LOCAL, PREVIEW, PREVIEW + "/"):
                with self.subTest(origin=origin):
                    preflight = client.options("/api/v1/scenarios", headers={
                        "Origin": origin, "Access-Control-Request-Method": "POST",
                        "Access-Control-Request-Headers": "content-type,x-csrf-token"})
                    self.assertEqual(preflight.status_code, 200, preflight.text)
                    self.assertEqual(preflight.headers["access-control-allow-origin"], origin)
                    self.assertEqual(preflight.headers["access-control-allow-credentials"], "true")
                    login = self.login(client, origin)
                    self.assertEqual(login.status_code, 200, login.text)
                    self.assertEqual(login.headers["access-control-allow-origin"], origin)
                    self.assertIn("Secure", login.headers["set-cookie"])
                    self.assertIn("HttpOnly", login.headers["set-cookie"])
                    self.assertIn("SameSite=lax", login.headers["set-cookie"])
                    response = client.post("/api/v1/scenarios", headers={
                        "Origin": origin, "X-CSRF-Token": login.json()["csrf_token"]},
                        json={"name": "Preview scenario", "kind": "baseline", "parameters": scenario_parameters()})
                    self.assertEqual(response.status_code, 201, response.text)
                    self.assertEqual(response.headers["access-control-allow-origin"], origin)
                    denied = client.post("/api/v1/scenarios", headers={"Origin": origin}, json={})
                    self.assertEqual(denied.status_code, 403)
                    self.assertEqual(denied.json()["error"]["code"], "csrf_rejected")

    def test_lookalike_origins_reject_cors_login_and_authenticated_writes(self):
        app = create_app(repository=self.repository, allowed_origins=[LOCAL, "https://*.vercel.app"])
        with TestClient(app, base_url="https://testserver") as client:
            token, csrf = self.repository.create_session(self.user_id)
            client.cookies.set("__Host-pv_session", token)
            for origin in (None, "null", "http://project.vercel.app", "https://vercel.app",
                           PREVIEW + ".evil.com", PREVIEW + "/private", PREVIEW + "?q=1",
                           "https://user@project.vercel.app", "https://project.vercel.app@evil.com"):
                with self.subTest(origin=origin):
                    if origin:
                        preflight = client.options("/api/v1/scenarios", headers={
                            "Origin": origin, "Access-Control-Request-Method": "POST"})
                        self.assertEqual(preflight.status_code, 400, preflight.text)
                        self.assertNotIn("access-control-allow-origin", preflight.headers)
                    login = self.login(client, origin)
                    self.assertEqual(login.status_code, 403, login.text)
                    self.assertEqual(login.json()["error"]["code"], "origin_rejected")
                    headers = {"X-CSRF-Token": csrf}
                    if origin:
                        headers["Origin"] = origin
                    response = client.post("/api/v1/scenarios", headers=headers, json={})
                    self.assertEqual(response.status_code, 403)
                    self.assertNotIn("access-control-allow-origin", response.headers)

    def test_injected_origin_list_overrides_settings_without_broadening(self):
        with patch("app.main.settings.ALLOWED_ORIGINS", ["https://*.vercel.app"]):
            app = create_app(repository=self.repository, allowed_origins=[LOCAL])
        with TestClient(app, base_url="https://testserver") as client:
            self.assertEqual(self.login(client, PREVIEW).status_code, 403)
            self.assertEqual(self.login(client, LOCAL).status_code, 200)


class EmbeddedWorkerContracts(unittest.TestCase):
    def test_injected_repository_never_starts_worker_or_closes_external_store(self):
        async def check():
            store = MagicMock()
            with patch("app.main.settings.ENABLE_EMBEDDED_WORKER", True), patch("app.main.RunWorker") as worker:
                app = create_app(repository=store)
                async with app.router.lifespan_context(app):
                    self.assertIs(app.state.repository, store)
                    self.assertIsNone(app.state.worker_thread)
                worker.assert_not_called()
                store.close.assert_not_called()
        asyncio.run(check())

    def test_disabled_worker_still_closes_owned_store(self):
        async def check():
            store = MagicMock()
            with patch("app.main.settings.ENABLE_EMBEDDED_WORKER", False), \
                    patch("app.main.SimulationRepository", return_value=store), patch("app.main.RunWorker") as worker:
                app = create_app()
                async with app.router.lifespan_context(app):
                    self.assertIsNone(app.state.worker_thread)
                    store.close.assert_not_called()
                worker.assert_not_called()
                store.close.assert_called_once_with()
        asyncio.run(check())

    def test_shutdown_joins_claimed_work_before_closing_owned_store(self):
        async def check():
            started, release = threading.Event(), threading.Event()
            store, worker = MagicMock(), MagicMock()

            def run_once():
                started.set()
                release.wait(3)
                store.close.assert_not_called()
                return True

            worker.run_once.side_effect = run_once
            with patch("app.main.settings.ENABLE_EMBEDDED_WORKER", True), \
                    patch("app.main.SimulationRepository", return_value=store), \
                    patch("app.main.RunWorker", return_value=worker) as constructor:
                app = create_app()
                manager = app.router.lifespan_context(app)
                await manager.__aenter__()
                closing = None
                try:
                    self.assertTrue(await asyncio.to_thread(started.wait, 2))
                    thread = app.state.worker_thread
                    self.assertTrue(thread.daemon)
                    self.assertTrue(thread.is_alive())
                    constructor.assert_called_once_with(store)
                    closing = asyncio.create_task(manager.__aexit__(None, None, None))
                    await asyncio.sleep(0)
                    self.assertFalse(closing.done())
                    store.close.assert_not_called()
                finally:
                    release.set()
                    if closing is not None:
                        await closing
                    else:
                        await manager.__aexit__(None, None, None)
                self.assertFalse(thread.is_alive())
                store.close.assert_called_once_with()
        asyncio.run(check())

    def test_cancelled_shutdown_still_joins_before_close(self):
        async def check():
            started, release = threading.Event(), threading.Event()
            store, worker = MagicMock(), MagicMock()
            worker.run_once.side_effect = lambda: (started.set(), release.wait(3), True)[-1]
            with patch("app.main.settings.ENABLE_EMBEDDED_WORKER", True), \
                    patch("app.main.SimulationRepository", return_value=store), \
                    patch("app.main.RunWorker", return_value=worker):
                app = create_app()
                manager = app.router.lifespan_context(app)
                await manager.__aenter__()
                self.assertTrue(await asyncio.to_thread(started.wait, 2))
                closing = asyncio.create_task(manager.__aexit__(None, None, None))
                await asyncio.sleep(0)
                closing.cancel()
                await asyncio.sleep(0)
                try:
                    store.close.assert_not_called()
                finally:
                    release.set()
                    with self.assertRaises(asyncio.CancelledError):
                        await closing
                self.assertFalse(app.state.worker_thread.is_alive())
                store.close.assert_called_once_with()
        asyncio.run(check())

    def test_worker_failure_logs_safely_then_stops_without_idle_delay(self):
        async def check():
            failed = threading.Event()
            store, worker = MagicMock(), MagicMock()

            def fail():
                failed.set()
                raise RuntimeError("secret-database-url")

            worker.run_once.side_effect = fail
            with patch("app.main.settings.ENABLE_EMBEDDED_WORKER", True), \
                    patch("app.main.SimulationRepository", return_value=store), \
                    patch("app.main.RunWorker", return_value=worker), patch("app.main.logger.warning") as warning:
                app = create_app()
                async with app.router.lifespan_context(app):
                    self.assertTrue(await asyncio.to_thread(failed.wait, 2))
                self.assertFalse(app.state.worker_thread.is_alive())
                self.assertEqual(worker.run_once.call_count, 1)
                self.assertEqual(warning.call_count, 1)
                self.assertNotIn("secret-database-url", str(warning.call_args))
                store.close.assert_called_once_with()
        asyncio.run(check())

    def test_double_cancel_preserves_join_and_closes_only_after_worker_exit(self):
        async def check():
            started, release = threading.Event(), threading.Event()
            store, worker = MagicMock(), MagicMock()
            events = []

            def run_once():
                started.set()
                release.wait(5)
                events.append("work_finished")
                return True

            worker.run_once.side_effect = run_once
            with patch("app.main.settings.ENABLE_EMBEDDED_WORKER", True), \
                    patch("app.main.SimulationRepository", return_value=store), \
                    patch("app.main.RunWorker", return_value=worker):
                app = create_app()
                manager = app.router.lifespan_context(app)
                await manager.__aenter__()
                self.assertTrue(await asyncio.to_thread(started.wait, 2))
                thread = app.state.worker_thread
                store.close.side_effect = lambda: events.append(("store_closed", thread.is_alive()))
                closing = asyncio.create_task(manager.__aexit__(None, None, None))
                try:
                    # Yield after each cancellation so cleanup receives both while
                    # the worker remains blocked, rather than coalescing requests.
                    await asyncio.sleep(0)
                    closing.cancel("first cancellation")
                    await asyncio.sleep(0)
                    closing.cancel("second cancellation")
                    await asyncio.sleep(0)
                    self.assertFalse(closing.done())
                    self.assertTrue(thread.is_alive())
                    store.close.assert_not_called()
                finally:
                    release.set()
                    with self.assertRaises(asyncio.CancelledError) as cancelled:
                        await closing
                self.assertEqual(cancelled.exception.args, ("second cancellation",))
                self.assertTrue(closing.cancelled())
                self.assertFalse(thread.is_alive())
                self.assertEqual(events, ["work_finished", ("store_closed", False)])
                store.close.assert_called_once_with()
        asyncio.run(check())

    def test_startup_failure_closes_owned_store(self):
        async def check():
            store = MagicMock()
            with patch("app.main.settings.ENABLE_EMBEDDED_WORKER", True), \
                    patch("app.main.SimulationRepository", return_value=store), \
                    patch("app.main.RunWorker", side_effect=RuntimeError("startup failed")):
                app = create_app()
                with self.assertRaises(RuntimeError):
                    async with app.router.lifespan_context(app):
                        self.fail("Startup must not yield after a failure.")
                store.close.assert_called_once_with()
        asyncio.run(check())


class DeploymentArtifactsContracts(unittest.TestCase):
    def test_recursive_provider_schema_removal_keeps_local_validation_strict(self):
        original = {"additionalProperties": False, "$defs": {"Nested": {"additionalProperties": False}},
                    "anyOf": [{"properties": {"child": {"additionalProperties": {"type": "string"}}}}]}
        expected = {"$defs": {"Nested": {}}, "anyOf": [{"properties": {"child": {}}}]}
        before = deepcopy(original)
        self.assertEqual(provider_schema(original), expected)
        self.assertEqual(original, before)
        self.assertNotIn("additionalProperties", json.dumps(provider_schema(ExplanationOutput.model_json_schema())))
        with self.assertRaises(ValidationError):
            ExplanationOutput.model_validate({"summary": "Summary", "key_findings": ["Finding"],
                                              "limitations": ["Limitation"], "cited_metric_keys": ["energy"],
                                              "extra": "Provider schema relaxation cannot relax local validation"})

    def test_provider_receives_cleaned_schema_and_configured_model(self):
        approved = ExplanationOutput(summary="Summary", key_findings=["Finding"],
                                     limitations=["Limitation"], cited_metric_keys=["energy"])
        with patch("google.genai.Client") as constructor:
            client = constructor.return_value.__enter__.return_value
            client.models.generate_content.return_value.text = json.dumps(approved.model_dump())
            result = _provider_output(approved, "fake-api-key", "gemini-3.5-flash")
        self.assertEqual(result, approved.model_dump())
        call = client.models.generate_content.call_args.kwargs
        self.assertEqual(call["model"], "gemini-3.5-flash")
        schema = call["config"].response_schema
        self.assertIsInstance(schema, dict)
        self.assertNotIn("additionalProperties", json.dumps(schema))
        self.assertEqual(schema["properties"]["summary"]["type"], "string")
        self.assertEqual(Settings.model_fields["GEMINI_MODEL"].default, "gemini-3.5-flash")

    def test_render_blueprint_and_runtime_dependency_essentials(self):
        requirements = set((ROOT / "backend/requirements.txt").read_text().splitlines())
        self.assertTrue({"fastapi>=0.115.0", "uvicorn[standard]>=0.30.0", "pydantic>=2.8.0",
                         "pydantic-settings>=2.4.0", "email-validator>=2.0.0", "sqlalchemy>=2.0.30",
                         "alembic>=1.13.0", "asyncpg>=0.29.0", "psycopg[binary]>=3.2.0",
                         "google-genai>=0.1.1", "passlib[argon2]>=1.7.4", "argon2-cffi>=23.1.0",
                         "python-multipart>=0.0.9"} <= requirements)
        blueprint = (ROOT / "render.yaml").read_text()
        for line in ("rootDir: backend", "plan: free", "buildCommand: pip install -r requirements.txt",
                     "startCommand: python -m app.bootstrap && uvicorn app.main:application --host 0.0.0.0 --port $PORT",
                     "value: 3.11.9", "value: gemini-3.5-flash", 'value: "true"'):
            self.assertIn(line, blueprint)
        for secret in ("DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY",
                       "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY"):
            self.assertRegex(blueprint, rf"key: {secret}\n\s+sync: false")
        self.assertRegex(blueprint, r"key: SECRET_KEY\n\s+generateValue: true")
        origins = re.search(r"key: ALLOWED_ORIGINS\n\s+value: '([^']+)'", blueprint).group(1)
        self.assertEqual(json.loads(origins), [LOCAL, "https://*.vercel.app"])
        from app.main import app, application
        self.assertIs(application, app)


if __name__ == "__main__":
    unittest.main()
