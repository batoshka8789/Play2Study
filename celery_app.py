import os
from datetime import timedelta

BROKER_URL = os.environ.get("CELERY_BROKER_URL", os.environ.get("REDIS_URL", "redis://localhost:6379/0"))
BACKEND_URL = os.environ.get("CELERY_RESULT_BACKEND", BROKER_URL)

try:
    from celery import Celery
    celery = Celery("play2study", broker=BROKER_URL, backend=BACKEND_URL)
    celery.conf.task_annotations = {"*": {"rate_limit": "10/s"}}
except Exception:
    celery = None


def send_email_task(to_email: str, subject: str, body: str):
    """Dispatch into celery if available, otherwise perform best-effort no-op."""
    if celery is None:
        # fallback: do nothing (tests shouldn't rely on actual emails)
        print("Celery not configured: skipping send_email_task")
        return None
    @celery.task(name="play2study.send_email")
    def _send(email, subject_, body_):
        try:
            from main import send_email_async
            import asyncio
            asyncio.get_event_loop().run_until_complete(send_email_async(email, subject_, body_))
        except Exception as e:
            print("Error in celery email task:", e)

    return _send.delay(to_email, subject, body)
