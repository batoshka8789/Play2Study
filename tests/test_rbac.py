import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_admin_protected_endpoint_forbidden():
    # Without auth, should be 401 or 403
    r = client.delete('/admin/users/1')
    assert r.status_code in (401, 403)

# Note: deeper RBAC tests require token generation and a user with role=admin; those are integration tests.
