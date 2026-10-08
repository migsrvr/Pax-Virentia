"""Run separately with PYTHONPATH=backend python3 -m app.jobs.worker.

API submission does not calculate or schedule request-local background tasks.
Claims, leases and fenced publication support at-least-once execution.
"""

import logging
import signal
import threading

from app.services.simulations import calculate_snapshot


logger = logging.getLogger(__name__)


class RunWorker:
    def __init__(self, repository):
        self.repository = repository

    def run_once(self):
        claim = self.repository.claim_job()
        if claim is None:
            return False
        finished = threading.Event()

        def heartbeat():
            while not finished.wait(20):
                try:
                    if not self.repository.renew_lease(claim["run_id"], claim["lease_token"]):
                        return
                except Exception:
                    # Lease expiry fences writes if the connection cannot recover.
                    logger.warning("Lease renewal failed for run %s", claim["run_id"])
                    return

        thread = threading.Thread(target=heartbeat, daemon=True)
        thread.start()
        try:
            try:
                result = calculate_snapshot(claim["frozen_inputs"])
            except Exception:
                logger.error("Calculation failed for run %s", claim["run_id"])
                self.repository.fail_job(claim["run_id"], claim["lease_token"])
            else:
                self.repository.publish_results(claim["run_id"], claim["lease_token"], result)
        finally:
            finished.set()
            thread.join(timeout=2)
        return True


def main():
    from app.config import settings
    from app.repositories.simulation import SimulationRepository
    logging.basicConfig(level=logging.INFO)
    repository = SimulationRepository(settings.DATABASE_URL)
    worker = RunWorker(repository)
    stopped = threading.Event()
    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, lambda *_: stopped.set())
    try:
        while not stopped.is_set():
            try:
                if worker.run_once():
                    continue
            except Exception:
                logger.warning("Worker infrastructure operation failed; leases remain retryable.")
            stopped.wait(2)
    finally:
        repository.close()


if __name__ == "__main__":
    main()
