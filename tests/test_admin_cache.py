from fastapi.testclient import TestClient
from main import app, get_current_user, User
from cache import get_cache


def fake_admin_user():
    u = User()
    u.id = 1
    u.username = 'admin'
    u.role = 'admin'
    return u


def test_admin_cache_get_and_delete():
    client = TestClient(app)
    # override dependency to return admin user
    app.dependency_overrides[get_current_user] = lambda: fake_admin_user()

    try:
        cache = get_cache()
        cache.set('foo', {'x': 1}, ex=60)

        r = client.get('/admin/cache', params={'key': 'foo'})
        assert r.status_code == 200
        assert r.json().get('key') == 'foo'

        r = client.delete('/admin/cache', params={'key': 'foo'})
        assert r.status_code == 200
        assert r.json().get('status') == 'deleted'
    finally:
        app.dependency_overrides.clear()
