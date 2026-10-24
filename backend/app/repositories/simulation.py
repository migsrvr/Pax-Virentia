"""Transactional PostgreSQL persistence, with dependency-free SQLite test support.

PostgreSQL uses SQLAlchemy and psycopg. SQLite is an explicit local/test adapter;
production defaults still use the configured PostgreSQL URL.
"""

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
import hashlib
import json
import secrets
import sqlite3
from uuid import UUID, uuid4

from app.security import derive_csrf_token
from app.services.errors import ServiceError


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False)


def content_hash(value):
    return hashlib.sha256(canonical_json(value).encode()).hexdigest()


def decode(value):
    return json.loads(value) if isinstance(value, str) else value


class _SQLConnection:
    def __init__(self, connection, postgres):
        self.connection = connection
        self.postgres = postgres

    def execute(self, sql, parameters=None):
        if self.postgres:
            from sqlalchemy import text
            return self.connection.execute(text(sql), parameters or {})
        return self.connection.execute(sql, parameters or {})

    def one(self, sql, parameters=None):
        result = self.execute(sql, parameters)
        row = result.mappings().first() if self.postgres else result.fetchone()
        return self._row(row)

    def all(self, sql, parameters=None):
        result = self.execute(sql, parameters)
        rows = result.mappings().all() if self.postgres else result.fetchall()
        return [self._row(row) for row in rows]

    @staticmethod
    def _row(row):
        if row is None:
            return None
        result = dict(row)
        for key, value in result.items():
            if isinstance(value, datetime):
                result[key] = value.astimezone(timezone.utc).isoformat()
            elif isinstance(value, UUID) or key.endswith("_id") or key == "id":
                # PostgreSQL returns UUID objects for every UUID column (e.g. submitted_by,
                # reviewed_by); ownership and self-review checks compare against strings.
                result[key] = str(value) if value is not None else None
        return result


class SimulationRepository:
    def __init__(self, database_url):
        self.postgres = not database_url.startswith("sqlite:///")
        self.engine = None
        self.keeper = None
        if self.postgres:
            from sqlalchemy import create_engine
            from sqlalchemy.engine import make_url
            url = make_url(database_url)
            if url.get_backend_name() != "postgresql":
                raise ValueError("Only PostgreSQL and explicit SQLite test databases are supported.")
            self.engine = create_engine(url.set(drivername="postgresql+psycopg"),
                                        pool_size=5, max_overflow=0, pool_pre_ping=True)
        else:
            self.path = database_url[len("sqlite:///"):]
            self.uri = self.path == ":memory:"
            if self.uri:
                self.path = f"file:pax-{uuid4()}?mode=memory&cache=shared"
                self.keeper = self._sqlite_connection()

    def _sqlite_connection(self):
        connection = sqlite3.connect(self.path, uri=self.uri, timeout=10, check_same_thread=False)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys=ON")
        return connection

    @contextmanager
    def transaction(self):
        if self.postgres:
            with self.engine.begin() as connection:
                yield _SQLConnection(connection, True)
        else:
            connection = self._sqlite_connection()
            try:
                connection.execute("BEGIN IMMEDIATE")
                yield _SQLConnection(connection, False)
                connection.commit()
            except BaseException:
                connection.rollback()
                raise
            finally:
                connection.close()

    def close(self):
        if self.engine is not None:
            self.engine.dispose()
        if self.keeper is not None:
            self.keeper.close()
            self.keeper = None

    def json_parameter(self, name):
        return f"CAST(:{name} AS JSONB)" if self.postgres else ":" + name

    @contextmanager
    def migration_connection(self):
        """A SQLAlchemy connection on this store, for Alembic revisions."""
        if self.postgres:
            with self.engine.connect() as connection:
                yield connection
                connection.commit()
            return
        from sqlalchemy import create_engine
        from sqlalchemy.pool import NullPool

        def connect():
            connection = sqlite3.connect(self.path, uri=self.uri, timeout=10, check_same_thread=False)
            connection.execute("PRAGMA foreign_keys=ON")
            return connection

        engine = create_engine("sqlite://", creator=connect, poolclass=NullPool)
        try:
            with engine.connect() as connection:
                yield connection
                connection.commit()
        finally:
            engine.dispose()

    def create_schema(self):
        """Explicit local/bootstrap helper; API startup never performs DDL.

        Applies every Alembic revision, adopting pre-migration databases in place.
        """
        from app.repositories.migrations import upgrade
        upgrade(self)

    def create_user(self, user_id, role, email=None, password_hash=None, display_name=None):
        """Provisioning hook; no public registration route is provided."""
        values = {"id": user_id, "role": role, "email": email, "hash": password_hash, "name": display_name}
        with self.transaction() as c:
            c.execute("INSERT INTO users(id,role,email,password_hash,display_name,active) VALUES(:id,:role,:email,:hash,:name,1) "
                      "ON CONFLICT(id) DO UPDATE SET role=excluded.role, email=COALESCE(excluded.email, users.email), "
                      "password_hash=COALESCE(excluded.password_hash, users.password_hash), display_name=COALESCE(excluded.display_name, users.display_name)",
                      values)

    def find_user_by_email(self, email):
        with self.transaction() as c:
            return c.one("SELECT id,role,active,email,password_hash,display_name FROM users WHERE email=:email",
                         {"email": email})

    def create_session(self, user_id, lifetime_hours=24):
        token = secrets.token_urlsafe(32)
        csrf = derive_csrf_token(token)
        with self.transaction() as c:
            c.execute("INSERT INTO sessions(token_hash,user_id,csrf_hash,expires_at) VALUES(:token,:user,:csrf,:expires)",
                      {"token": hashlib.sha256(token.encode()).hexdigest(), "user": user_id,
                       "csrf": hashlib.sha256(csrf.encode()).hexdigest(),
                       "expires": (datetime.now(timezone.utc) + timedelta(hours=lifetime_hours)).isoformat()})
        return token, csrf

    def authenticate(self, token):
        with self.transaction() as c:
            return c.one("SELECT s.user_id,s.csrf_hash,u.role,u.email,u.display_name FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=:token AND s.revoked=0 AND u.active=1 AND s.expires_at>:now",
                         {"token": hashlib.sha256(token.encode()).hexdigest(), "now": utc_now()})

    def restore_csrf(self, token):
        """Return the session's derived CSRF token, adopting legacy random tokens.

        Sessions created before derivation stored the hash of a random token that
        only the original tab held. Rewriting it once to the derived token's hash
        keeps the session usable after a browser restart or in a new tab.
        """
        csrf = derive_csrf_token(token)
        expected = hashlib.sha256(csrf.encode()).hexdigest()
        with self.transaction() as c:
            c.execute("UPDATE sessions SET csrf_hash=:csrf WHERE token_hash=:token AND revoked=0 AND csrf_hash<>:csrf",
                      {"csrf": expected, "token": hashlib.sha256(token.encode()).hexdigest()})
        return csrf

    def revoke_session(self, token):
        with self.transaction() as c:
            c.execute("UPDATE sessions SET revoked=1 WHERE token_hash=:token",
                      {"token": hashlib.sha256(token.encode()).hexdigest()})

    def create_scenario(self, name, kind, parameters, user_id):
        scenario_id = str(uuid4())
        with self.transaction() as c:
            c.execute("INSERT INTO scenarios(id,name,kind,created_by,created_at) VALUES(:id,:name,:kind,:user,:now)",
                      {"id": scenario_id, "name": name, "kind": kind, "user": user_id, "now": utc_now()})
            revision = self._insert_revision(c, scenario_id, 1, parameters, user_id)
        return {"id": scenario_id, "name": name, "kind": kind, "latest_revision": revision}

    def _insert_revision(self, c, scenario_id, revision_no, parameters, user_id):
        values = {"id": str(uuid4()), "scenario_id": scenario_id, "revision_no": revision_no,
                  "parameters": canonical_json(parameters), "user": user_id, "now": utc_now()}
        c.execute("INSERT INTO scenario_revisions(id,scenario_id,revision_no,parameters,created_by,created_at) "
                  f"VALUES(:id,:scenario_id,:revision_no,{self.json_parameter('parameters')},:user,:now)", values)
        return {"id": values["id"], "scenario_id": scenario_id, "revision_no": revision_no,
                "parameters": decode(values["parameters"]), "created_by": user_id, "created_at": values["now"]}

    def create_revision(self, scenario_id, parameters, user_id):
        with self.transaction() as c:
            lock = " FOR UPDATE" if self.postgres else ""
            if c.one("SELECT id FROM scenarios WHERE id=:id" + lock, {"id": scenario_id}) is None:
                raise ServiceError(404, "scenario_not_found", "Scenario was not found.")
            number = c.one("SELECT MAX(revision_no) AS revision_no FROM scenario_revisions WHERE scenario_id=:id",
                           {"id": scenario_id})["revision_no"] + 1
            return self._insert_revision(c, scenario_id, number, parameters, user_id)

    def get_revision(self, revision_id):
        with self.transaction() as c:
            revision = c.one("SELECT * FROM scenario_revisions WHERE id=:id", {"id": revision_id})
        if revision is None:
            raise ServiceError(404, "revision_not_found", "Scenario revision was not found.")
        revision["parameters"] = decode(revision["parameters"])
        return revision

    def list_scenarios(self, limit=20, offset=0):
        with self.transaction() as c:
            items = c.all("SELECT s.*,r.id AS revision_id,r.revision_no FROM scenarios s JOIN scenario_revisions r ON r.scenario_id=s.id WHERE r.revision_no=(SELECT MAX(r2.revision_no) FROM scenario_revisions r2 WHERE r2.scenario_id=s.id) ORDER BY s.created_at,s.id LIMIT :limit OFFSET :offset",
                          {"limit": limit, "offset": offset})
        return {"items": items, "limit": limit, "offset": offset}

    def list_revisions(self, scenario_id, limit=20, offset=0):
        with self.transaction() as c:
            if c.one("SELECT id FROM scenarios WHERE id=:id", {"id": scenario_id}) is None:
                raise ServiceError(404, "scenario_not_found", "Scenario was not found.")
            items = c.all("SELECT * FROM scenario_revisions WHERE scenario_id=:id ORDER BY revision_no LIMIT :limit OFFSET :offset",
                          {"id": scenario_id, "limit": limit, "offset": offset})
        for item in items:
            item["parameters"] = decode(item["parameters"])
        return {"items": items, "limit": limit, "offset": offset}

    def submit_run(self, revision_id, snapshot, code_version, key, request_hash, user_id):
        values = {"user": user_id, "endpoint": "/runs", "key": key, "hash": request_hash,
                  "id": str(uuid4()), "revision": revision_id, "snapshot": canonical_json(snapshot),
                  "snapshot_hash": content_hash(snapshot), "version": code_version, "now": utc_now()}
        try:
            with self.transaction() as c:
                original = c.one("SELECT * FROM idempotency_keys WHERE user_id=:user AND endpoint=:endpoint AND key=:key", values)
                if original is not None:
                    return self._replay(original, request_hash)
                c.execute("INSERT INTO simulation_runs(id,scenario_revision_id,frozen_inputs,snapshot_hash,code_version,status,submitted_by,created_at) "
                          f"VALUES(:id,:revision,{self.json_parameter('snapshot')},:snapshot_hash,:version,'queued',:user,:now)", values)
                c.execute("INSERT INTO jobs(id,run_id,status,available_at,created_at) VALUES(:job,:id,'queued',:now,:now)",
                          {**values, "job": str(uuid4())})
                c.execute("INSERT INTO idempotency_keys(user_id,endpoint,key,request_hash,run_id) VALUES(:user,:endpoint,:key,:hash,:id)", values)
        except Exception as error:
            # A racing submission rolls back its run and job before replaying the winner.
            is_integrity = isinstance(error, sqlite3.IntegrityError)
            if self.postgres:
                from sqlalchemy.exc import IntegrityError
                is_integrity = isinstance(error, IntegrityError)
            if not is_integrity:
                raise
            with self.transaction() as c:
                original = c.one("SELECT * FROM idempotency_keys WHERE user_id=:user AND endpoint=:endpoint AND key=:key", values)
            if original is None:
                raise
            return self._replay(original, request_hash)
        return values["id"]

    @staticmethod
    def _replay(original, request_hash):
        if original["request_hash"] != request_hash:
            raise ServiceError(409, "idempotency_conflict", "Idempotency key was used with a different request.")
        return original["run_id"]

    def get_run(self, run_id):
        with self.transaction() as c:
            run = c.one("SELECT r.*,j.cancel_requested FROM simulation_runs r JOIN jobs j ON j.run_id=r.id WHERE r.id=:id", {"id": run_id})
        if run is None:
            raise ServiceError(404, "run_not_found", "Run was not found.")
        run["frozen_inputs"] = decode(run["frozen_inputs"])
        return run

    def get_results(self, run_id):
        run = self.get_run(run_id)
        if run["status"] != "succeeded":
            raise ServiceError(409, "results_not_available", "Results require a succeeded run.")
        with self.transaction() as c:
            stored = c.one("SELECT payload FROM run_results WHERE run_id=:id", {"id": run_id})
        if stored is None:
            raise ServiceError(409, "results_not_available", "Results have not been published.")
        return decode(stored["payload"])

    def claim_job(self, lease_seconds=60, max_attempts=3):
        now = utc_now()
        until = (datetime.fromisoformat(now) + timedelta(seconds=lease_seconds)).isoformat()
        with self.transaction() as c:
            while True:
                lock = " FOR UPDATE SKIP LOCKED" if self.postgres else ""
                job = c.one("SELECT * FROM jobs WHERE (status='queued' AND available_at<=:now) OR (status='running' AND lease_until<=:now) ORDER BY created_at,id LIMIT 1" + lock,
                            {"now": now})
                if job is None:
                    return None
                if job["cancel_requested"]:
                    self._finish(c, job["run_id"], "cancelled")
                    continue
                if job["attempt_no"] >= max_attempts:
                    c.execute("UPDATE jobs SET status='failed',lease_token=NULL,lease_until=NULL WHERE id=:id", job)
                    c.execute("UPDATE simulation_runs SET status='failed',ended_at=:now,error_code='worker_attempts_exhausted',error_message='Worker attempts were exhausted.' WHERE id=:run_id",
                              {**job, "now": now})
                    continue
                token = secrets.token_hex(24)
                c.execute("UPDATE jobs SET status='running',attempt_no=attempt_no+1,lease_token=:token,lease_until=:until WHERE id=:id",
                          {"id": job["id"], "token": token, "until": until})
                c.execute("UPDATE simulation_runs SET status='running',started_at=COALESCE(started_at,:now) WHERE id=:id",
                          {"id": job["run_id"], "now": now})
                run = c.one("SELECT * FROM simulation_runs WHERE id=:id", {"id": job["run_id"]})
                return {"run_id": job["run_id"], "lease_token": token,
                        "frozen_inputs": decode(run["frozen_inputs"]), "attempt_no": job["attempt_no"] + 1}

    def renew_lease(self, run_id, token, lease_seconds=60):
        now = utc_now()
        with self.transaction() as c:
            result = c.execute("UPDATE jobs SET lease_until=:until WHERE run_id=:id AND status='running' AND lease_token=:token AND lease_until>:now AND cancel_requested=0",
                               {"id": run_id, "token": token, "now": now,
                                "until": (datetime.fromisoformat(now) + timedelta(seconds=lease_seconds)).isoformat()})
        return result.rowcount == 1

    def publish_results(self, run_id, token, payload):
        with self.transaction() as c:
            job = self._owned_job(c, run_id, token)
            if job is None:
                return False
            if job["cancel_requested"]:
                self._finish(c, run_id, "cancelled")
                return False
            run = c.one("SELECT snapshot_hash,code_version FROM simulation_runs WHERE id=:id", {"id": run_id})
            output = {**payload, "run_id": run_id, **run}
            c.execute(f"INSERT INTO run_results(run_id,payload) VALUES(:id,{self.json_parameter('payload')})",
                      {"id": run_id, "payload": canonical_json(output)})
            self._finish(c, run_id, "succeeded")
        return True

    def _owned_job(self, c, run_id, token):
        lock = " FOR UPDATE" if self.postgres else ""
        return c.one("SELECT * FROM jobs WHERE run_id=:id AND status='running' AND lease_token=:token AND lease_until>:now" + lock,
                     {"id": run_id, "token": token, "now": utc_now()})

    @staticmethod
    def _finish(c, run_id, status, code=None, message=None):
        c.execute("UPDATE jobs SET status=:status,lease_token=NULL,lease_until=NULL WHERE run_id=:id",
                  {"id": run_id, "status": status})
        c.execute("UPDATE simulation_runs SET status=:status,ended_at=:now,error_code=:code,error_message=:message WHERE id=:id",
                  {"id": run_id, "status": status, "now": utc_now(), "code": code, "message": message})

    def fail_job(self, run_id, token):
        with self.transaction() as c:
            job = self._owned_job(c, run_id, token)
            if job is not None:
                if job["cancel_requested"]:
                    self._finish(c, run_id, "cancelled")
                else:
                    self._finish(c, run_id, "failed", "calculation_failed", "Simulation calculation failed.")

    def cancel_run(self, run_id, user_id):
        with self.transaction() as c:
            lock = " FOR UPDATE" if self.postgres else ""
            # Lock jobs first, matching claim/publish order to avoid deadlocks.
            job = c.one("SELECT * FROM jobs WHERE run_id=:id" + lock, {"id": run_id})
            run = c.one("SELECT * FROM simulation_runs WHERE id=:id", {"id": run_id})
            if run is None:
                raise ServiceError(404, "run_not_found", "Run was not found.")
            if run["submitted_by"] != user_id:
                raise ServiceError(403, "run_ownership_required", "Only the submitting analyst may cancel this run.")
            if run["status"] not in ("queued", "running"):
                raise ServiceError(409, "run_already_terminal", "A terminal run cannot be cancelled.")
            c.execute("UPDATE jobs SET cancel_requested=1 WHERE run_id=:id", {"id": run_id})
            if job["status"] == "queued":
                self._finish(c, run_id, "cancelled")

    def create_dataset(self, raw, report, source_ref, evidence_status, user_id):
        values = {"id": str(uuid4()), "raw": raw, "report": canonical_json(report),
                  "hash": hashlib.sha256(raw).hexdigest(), "source": source_ref,
                  "evidence": evidence_status, "user": user_id, "now": utc_now()}
        with self.transaction() as c:
            c.execute("INSERT INTO dataset_versions(id,source_ref,evidence_status,content_hash,original_csv,quality_report,schema_version,created_by,created_at) "
                      f"VALUES(:id,:source,:evidence,:hash,:raw,{self.json_parameter('report')},'plant-csv-v1',:user,:now)", values)
        return {"id": values["id"], "content_hash": values["hash"], "quality_report": report,
                "source_ref": source_ref, "evidence_status": evidence_status}

    def get_dataset(self, dataset_id):
        with self.transaction() as c:
            result = c.one("SELECT id,source_ref,evidence_status,content_hash,quality_report,schema_version FROM dataset_versions WHERE id=:id",
                           {"id": dataset_id})
        if result is None:
            raise ServiceError(404, "dataset_not_found", "Dataset version was not found.")
        result["quality_report"] = decode(result["quality_report"])
        return result

    RUN_SUMMARY = ("SELECT r.*, s.name AS scenario_name, s.id AS scenario_id, rev.revision_no, s.kind, j.cancel_requested "
                   "FROM simulation_runs r "
                   "JOIN scenario_revisions rev ON rev.id = r.scenario_revision_id "
                   "JOIN scenarios s ON s.id = rev.scenario_id "
                   "JOIN jobs j ON j.run_id = r.id ")

    def get_run_summary(self, run_id):
        """One run with its scenario name, kind and revision number."""
        with self.transaction() as c:
            run = c.one(self.RUN_SUMMARY + "WHERE r.id = :id", {"id": run_id})
        if run is None:
            raise ServiceError(404, "run_not_found", "Run was not found.")
        run["frozen_inputs"] = decode(run["frozen_inputs"])
        run["cancel_requested"] = bool(run["cancel_requested"])
        return run

    def list_runs(self, limit=20, offset=0, scenario_revision_id=None):
        with self.transaction() as c:
            sql = self.RUN_SUMMARY
            params = {"limit": limit, "offset": offset}
            if scenario_revision_id:
                sql += "WHERE r.scenario_revision_id = :rev_id "
                params["rev_id"] = scenario_revision_id
            sql += "ORDER BY r.created_at DESC LIMIT :limit OFFSET :offset"
            items = c.all(sql, params)
            for item in items:
                item["frozen_inputs"] = decode(item["frozen_inputs"])
                item["cancel_requested"] = bool(item["cancel_requested"])
        return {"items": items, "limit": limit, "offset": offset}

    PUBLICATION_SELECT = (
        "SELECT p.id, p.run_id, p.slug, p.title, p.summary, p.status, p.submitted_by, p.submitted_at, "
        "p.reviewed_by, p.reviewed_at, p.decision_reason, p.published_at, p.withdrawn_by, p.withdrawn_at, "
        "p.withdrawal_reason, p.view_count, su.display_name AS submitted_by_name, "
        "ru.display_name AS reviewed_by_name, wu.display_name AS withdrawn_by_name{snapshot} "
        "FROM publications p JOIN users su ON su.id = p.submitted_by "
        "LEFT JOIN users ru ON ru.id = p.reviewed_by LEFT JOIN users wu ON wu.id = p.withdrawn_by "
    )
    TRANSITIONS = {
        "approve": ("pending_review", "published", "publication.approved"),
        "reject": ("pending_review", "rejected", "publication.rejected"),
        "withdraw": ("published", "withdrawn", "publication.withdrawn"),
    }

    def _publication_query(self, snapshot=False):
        return self.PUBLICATION_SELECT.format(snapshot=", p.snapshot_data" if snapshot else "")

    @staticmethod
    def _decode_publication(pub):
        if pub is not None and "snapshot_data" in pub:
            pub["snapshot_data"] = decode(pub["snapshot_data"])
        return pub

    def _audit(self, c, actor_id, action, entity_type, entity_id, summary):
        c.execute("INSERT INTO audit_events(id, actor_id, action, entity_type, entity_id, created_at, change_summary) "
                  f"VALUES(:id, :actor, :action, :type, :entity, :now, {self.json_parameter('summary')})",
                  {"id": str(uuid4()), "actor": actor_id, "action": action, "type": entity_type,
                   "entity": str(entity_id), "now": utc_now(), "summary": canonical_json(summary)})

    def create_publication(self, run_id, slug, title, summary, snapshot_data, user_id):
        """Submit an immutable redacted snapshot for review; it is not public yet."""
        pub_id = str(uuid4())
        values = {"id": pub_id, "run_id": run_id, "slug": slug, "title": title, "summary": summary,
                  "snapshot_data": canonical_json(snapshot_data), "user": user_id, "now": utc_now()}
        with self.transaction() as c:
            pending = c.one("SELECT id FROM publications WHERE run_id = :run_id AND status = 'pending_review'",
                            {"run_id": run_id})
            if pending is not None:
                raise ServiceError(409, "publication_already_pending",
                                   "This run already has a publication awaiting review.")
            c.execute(
                "INSERT INTO publications(id, run_id, slug, title, summary, snapshot_data, status, submitted_by, submitted_at, view_count) "
                f"VALUES(:id, :run_id, :slug, :title, :summary, {self.json_parameter('snapshot_data')}, 'pending_review', :user, :now, 0)",
                values,
            )
            self._audit(c, user_id, "publication.submitted", "publication", pub_id,
                        {"status": {"from": None, "to": "pending_review"}, "slug": slug, "run_id": run_id})
            return self._decode_publication(c.one(self._publication_query(True) + "WHERE p.id = :id", {"id": pub_id}))

    def slug_exists(self, slug):
        with self.transaction() as c:
            return c.one("SELECT id FROM publications WHERE slug = :slug", {"slug": slug}) is not None

    def get_publication(self, pub_id):
        with self.transaction() as c:
            pub = c.one(self._publication_query(True) + "WHERE p.id = :id", {"id": pub_id})
        if pub is None:
            raise ServiceError(404, "publication_not_found", "Publication was not found.")
        return self._decode_publication(pub)

    def list_publications(self, limit=20, offset=0, status=None, run_id=None):
        """Private listing across every status (review queue, history)."""
        clauses, params = [], {"limit": limit, "offset": offset}
        if status:
            clauses.append("p.status = :status")
            params["status"] = status
        if run_id:
            clauses.append("p.run_id = :run_id")
            params["run_id"] = run_id
        where = ("WHERE " + " AND ".join(clauses) + " ") if clauses else ""
        with self.transaction() as c:
            items = c.all(self._publication_query() + where +
                          "ORDER BY p.submitted_at DESC, p.id LIMIT :limit OFFSET :offset", params)
        return {"items": items, "limit": limit, "offset": offset}

    def list_public_publications(self, limit=20, offset=0, include_snapshot=False):
        with self.transaction() as c:
            items = c.all(self._publication_query(include_snapshot) + "WHERE p.status = 'published' "
                          "ORDER BY p.published_at DESC, p.id LIMIT :limit OFFSET :offset",
                          {"limit": limit, "offset": offset})
        return {"items": [self._decode_publication(item) for item in items], "limit": limit, "offset": offset}

    def get_public_publication(self, slug, increment_view=True):
        """Only published rows are readable; withdrawn rows return a tombstone."""
        with self.transaction() as c:
            pub = c.one(self._publication_query(True) + "WHERE p.slug = :slug", {"slug": slug})
            if pub is None or pub["status"] in ("pending_review", "rejected"):
                raise ServiceError(404, "publication_not_found", "Publication was not found.")
            if pub["status"] == "withdrawn":
                raise ServiceError(410, "publication_withdrawn", "This publication has been withdrawn.",
                                   details={"slug": pub["slug"], "title": pub["title"],
                                            "published_at": pub["published_at"],
                                            "withdrawn_at": pub["withdrawn_at"],
                                            "withdrawal_reason": pub["withdrawal_reason"]})
            if increment_view:
                c.execute("UPDATE publications SET view_count = view_count + 1 WHERE id = :id AND status = 'published'",
                          {"id": pub["id"]})
                pub["view_count"] += 1
        return self._decode_publication(pub)

    def transition_publication(self, pub_id, action, actor_id, reason=None):
        source, target, audit_action = self.TRANSITIONS[action]
        with self.transaction() as c:
            lock = " FOR UPDATE" if self.postgres else ""
            pub = c.one("SELECT id, status, submitted_by FROM publications WHERE id = :id" + lock, {"id": pub_id})
            if pub is None:
                raise ServiceError(404, "publication_not_found", "Publication was not found.")
            if pub["status"] != source:
                raise ServiceError(409, "invalid_publication_state",
                                   f"Only a {source.replace('_', ' ')} publication can become {target}.")
            if action in ("approve", "reject") and pub["submitted_by"] == actor_id:
                raise ServiceError(403, "self_review_forbidden",
                                   "A publication must be reviewed by someone other than its submitter.")
            values = {"id": pub_id, "actor": actor_id, "now": utc_now(), "reason": reason, "source": source}
            if action == "approve":
                c.execute("UPDATE publications SET status='published', reviewed_by=:actor, reviewed_at=:now, "
                          "decision_reason=:reason, published_at=:now WHERE id=:id AND status=:source", values)
            elif action == "reject":
                c.execute("UPDATE publications SET status='rejected', reviewed_by=:actor, reviewed_at=:now, "
                          "decision_reason=:reason WHERE id=:id AND status=:source", values)
            else:
                c.execute("UPDATE publications SET status='withdrawn', withdrawn_by=:actor, withdrawn_at=:now, "
                          "withdrawal_reason=:reason WHERE id=:id AND status=:source", values)
            self._audit(c, actor_id, audit_action, "publication", pub_id,
                        {"status": {"from": source, "to": target}, "reason": reason})
            return self._decode_publication(c.one(self._publication_query(True) + "WHERE p.id = :id", {"id": pub_id}))

    def list_audit_events(self, entity_type, entity_id):
        with self.transaction() as c:
            items = c.all("SELECT a.id, a.actor_id, u.display_name AS actor_name, a.action, a.entity_type, a.entity_id, "
                          "a.created_at, a.change_summary FROM audit_events a JOIN users u ON u.id = a.actor_id "
                          "WHERE a.entity_type = :type AND a.entity_id = :entity ORDER BY a.created_at, a.id",
                          {"type": entity_type, "entity": str(entity_id)})
        for item in items:
            item["change_summary"] = decode(item["change_summary"])
        return items

    def list_datasets(self, limit=20, offset=0):
        with self.transaction() as c:
            items = c.all("SELECT d.id, d.source_ref, d.evidence_status, d.content_hash, d.quality_report, "
                          "d.schema_version, d.created_by, d.created_at, u.display_name AS created_by_name "
                          "FROM dataset_versions d LEFT JOIN users u ON u.id = d.created_by "
                          "ORDER BY d.created_at DESC, d.id LIMIT :limit OFFSET :offset",
                          {"limit": limit, "offset": offset})
        for item in items:
            item["quality_report"] = decode(item["quality_report"])
        return {"items": items, "limit": limit, "offset": offset}

    def create_report(self, report_type, title, params, run_ids, input_hashes, user_id):
        values = {"id": str(uuid4()), "type": report_type, "title": title, "params": canonical_json(params),
                  "runs": canonical_json(run_ids), "hashes": canonical_json(input_hashes),
                  "user": user_id, "now": utc_now()}
        with self.transaction() as c:
            c.execute("INSERT INTO reports(id, report_type, title, params, run_ids, input_hashes, created_by, created_at) "
                      f"VALUES(:id, :type, :title, {self.json_parameter('params')}, {self.json_parameter('runs')}, "
                      f"{self.json_parameter('hashes')}, :user, :now)", values)
        return self.get_report(values["id"])

    @staticmethod
    def _decode_report(report):
        for key in ("params", "run_ids", "input_hashes"):
            report[key] = decode(report[key])
        return report

    def get_report(self, report_id):
        with self.transaction() as c:
            report = c.one("SELECT r.*, u.display_name AS created_by_name FROM reports r "
                           "LEFT JOIN users u ON u.id = r.created_by WHERE r.id = :id", {"id": report_id})
        if report is None:
            raise ServiceError(404, "report_not_found", "Report was not found.")
        return self._decode_report(report)

    def list_reports(self, limit=20, offset=0):
        with self.transaction() as c:
            items = c.all("SELECT r.*, u.display_name AS created_by_name FROM reports r "
                          "LEFT JOIN users u ON u.id = r.created_by "
                          "ORDER BY r.created_at DESC, r.id LIMIT :limit OFFSET :offset",
                          {"limit": limit, "offset": offset})
        return {"items": [self._decode_report(item) for item in items], "limit": limit, "offset": offset}

    def list_insight_reviews(self, user_id):
        with self.transaction() as c:
            return c.all("SELECT insight_key, status, note, updated_at FROM insight_reviews "
                         "WHERE user_id = :user ORDER BY updated_at DESC", {"user": user_id})

    def save_insight_review(self, user_id, insight_key, status, note):
        values = {"user": user_id, "key": insight_key, "status": status, "note": note, "now": utc_now()}
        with self.transaction() as c:
            c.execute("INSERT INTO insight_reviews(user_id, insight_key, status, note, updated_at) "
                      "VALUES(:user, :key, :status, :note, :now) ON CONFLICT(user_id, insight_key) DO UPDATE SET "
                      "status = excluded.status, note = excluded.note, updated_at = excluded.updated_at", values)
        return {"insight_key": insight_key, "status": status, "note": note, "updated_at": values["now"]}

    def delete_insight_review(self, user_id, insight_key):
        with self.transaction() as c:
            c.execute("DELETE FROM insight_reviews WHERE user_id = :user AND insight_key = :key",
                      {"user": user_id, "key": insight_key})

    def save_ai_explanation(self, run_id, focus, narrative, key_drivers, grounded_evidence):
        exp_id = str(uuid4())
        now = utc_now()
        values = {
            "id": exp_id,
            "run_id": run_id,
            "focus": focus,
            "narrative": narrative,
            "key_drivers": canonical_json(key_drivers),
            "grounded_evidence": canonical_json(grounded_evidence),
            "now": now,
        }
        with self.transaction() as c:
            c.execute(
                f"INSERT INTO ai_explanations(id, run_id, focus, narrative, key_drivers, grounded_evidence, generated_at) "
                f"VALUES(:id, :run_id, :focus, :narrative, {self.json_parameter('key_drivers')}, {self.json_parameter('grounded_evidence')}, :now) "
                f"ON CONFLICT(run_id, focus) DO UPDATE SET narrative = excluded.narrative, "
                f"key_drivers = excluded.key_drivers, grounded_evidence = excluded.grounded_evidence, generated_at = excluded.generated_at",
                values,
            )
        return {
            "id": exp_id,
            "run_id": run_id,
            "focus": focus,
            "narrative": narrative,
            "key_drivers": key_drivers,
            "grounded_evidence": grounded_evidence,
            "generated_at": now,
        }

    def get_ai_explanation(self, run_id, focus="general"):
        with self.transaction() as c:
            res = c.one("SELECT * FROM ai_explanations WHERE run_id = :run_id AND focus = :focus", {"run_id": run_id, "focus": focus})
            if res:
                res["key_drivers"] = decode(res["key_drivers"])
                res["grounded_evidence"] = decode(res["grounded_evidence"])
            return res
