"""Sign-in, session and sign-out contracts over the real ASGI app and SQLite."""

import importlib.util
from pathlib import Path
import tempfile
import unittest
from uuid import uuid4

from app.repositories.simulation import SimulationRepository
from app.services.auth import hash_password

HTTP_DEPENDENCIES = all(importlib.util.find_spec(name) for name in
                        ("fastapi", "pydantic", "pydantic_settings", "httpx", "passlib", "argon2"))

ORIGIN = "http://localhost:5173"


@unittest.skipUnless(HTTP_DEPENDENCIES, "HTTP integration requires the declared FastAPI/Pydantic/httpx dependencies")
class AuthHTTPContracts(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.repository = SimulationRepository("sqlite:///" + str(Path(self.directory.name) / "auth.db"))
        self.repository.create_schema()
        self.user_id = str(uuid4())
        self.email = "analyst@example.com"
        self.password = "correct-horse-battery"
        self.repository.create_user(self.user_id, "analyst", email=self.email,
                                    password_hash=hash_password(self.password), display_name="Analyst Sample")
        from fastapi.testclient import TestClient
        from app.main import create_app
        self.client_context = TestClient(create_app(repository=self.repository, code_version="test-release",
                                                    allowed_origins=[ORIGIN]), base_url="https://testserver")
        self.client = self.client_context.__enter__()

    def tearDown(self):
        self.client_context.__exit__(None, None, None)
        self.repository.close()
        self.directory.cleanup()

    def login(self, email=None, password=None, remember=False, origin=ORIGIN):
        headers = {"Origin": origin} if origin else {}
        return self.client.post("/api/v1/auth/login", headers=headers,
                                json={"email": email or self.email, "password": password or self.password,
                                      "remember": remember})

    def test_login_sets_session_cookie_and_returns_user(self):
        response = self.login()
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["user"]["email"], self.email)
        self.assertEqual(body["user"]["display_name"], "Analyst Sample")
        self.assertEqual(body["user"]["role"], "analyst")
        self.assertTrue(body["csrf_token"])
        self.assertEqual(self.client.cookies.get("__Host-pv_session"),
                         response.cookies.get("__Host-pv_session"))
        session = self.client.get("/api/v1/auth/session")
        self.assertEqual(session.status_code, 200, session.text)
        self.assertEqual(session.json()["user"]["id"], self.user_id)

    def test_invalid_credentials_share_one_generic_error(self):
        for email, password in ((self.email, "wrong-password"), ("missing@example.com", self.password)):
            response = self.login(email=email, password=password)
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.json()["error"]["code"], "invalid_credentials")

    def test_login_requires_trusted_origin(self):
        self.assertEqual(self.login(origin=None).status_code, 403)
        self.assertEqual(self.login(origin="https://untrusted.example").status_code, 403)

    def test_inactive_membership_cannot_sign_in(self):
        with self.repository.transaction() as c:
            c.execute("UPDATE users SET active=0 WHERE id=:id", {"id": self.user_id})
        response = self.login()
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "invalid_credentials")

    def test_remember_me_extends_session_lifetime(self):
        response = self.login(remember=True)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["expires_in_hours"], 720)

    def test_session_endpoint_requires_sign_in(self):
        response = self.client.get("/api/v1/auth/session")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["error"]["code"], "authentication_required")

    def test_sign_out_revokes_the_session(self):
        self.login()
        self.assertEqual(self.client.post("/api/v1/auth/logout", headers={"Origin": ORIGIN}).status_code, 200)
        self.assertEqual(self.client.get("/api/v1/auth/session").status_code, 401)


if __name__ == "__main__":
    unittest.main()
