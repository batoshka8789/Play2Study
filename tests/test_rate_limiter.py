import os
import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

@pytest.mark.skipif(os.environ.get('REDIS_URL') is None, reason="No Redis configured")
def test_rate_limiter_429(monkeypatch):
    # This test requires a running Redis instance pointed by REDIS_URL
    # It attempts to send more than RATE_LIMIT requests and expects 429
    import redis
    r = redis.from_url(os.environ['REDIS_URL'], decode_responses=True)
    # flush keys for the test IP
    ip = 'testclient'
    key = f"rate:{ip}:{int(0 // 60)}"
    r.delete(key)

    # monkeypatch client IP
    def _client_ip(scope):
        scope['client'] = ('testclient', 12345)
        return scope

    # Make RATE_LIMIT+1 requests
    from main import RATE_LIMIT
    for i in range(RATE_LIMIT + 1):
        res = client.post('/auth', json={'username': 'u', 'password': 'p', 'register': False})
        if i < RATE_LIMIT:
            # either 200/400 depending on auth, but not 429
            assert res.status_code != 429
        else:
            assert res.status_code == 429
