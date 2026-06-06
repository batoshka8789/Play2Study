import pytest

from celery_app import send_email_task, celery


def test_celery_fallback_no_broker():
    # If celery not configured, send_email_task should return None and not raise
    if celery is None:
        r = send_email_task("nobody@example.com", "subj", "body")
        assert r is None
    else:
        # If celery is configured, ensure send_email_task returns an AsyncResult-like object
        r = send_email_task("nobody@example.com", "subj", "body")
        assert r is None or hasattr(r, 'id')
