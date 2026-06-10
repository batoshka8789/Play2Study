import os
import pytest


def test_backup_script_exists():
    assert os.path.exists("scripts/backup_db.py")


@pytest.mark.skipif(os.environ.get("CELERY_BROKER_URL") is None and os.environ.get("REDIS_URL") is None,
                    reason="No broker configured for Celery; skipping background task integration test")
def test_send_email_task_dispatch():
    # Best-effort test: call send_email_task and ensure it returns without raising
    from celery_app import send_email_task
    r = send_email_task("nobody@example.com", "subj", "body")
    # If Celery is configured it should return an AsyncResult; otherwise None
    assert (r is None) or hasattr(r, 'id')
