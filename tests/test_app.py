import os
import pytest

# This test file targets the deployed Render app and is optional for local unit runs.
# It will be skipped unless REQUESTS_REMOTE_TESTS env var is set to '1'.
if os.environ.get("SKIP_REMOTE_TESTS", "1") != "0":
    pytest.skip("Skipping remote tests by default (set SKIP_REMOTE_TESTS=0 to enable)", allow_module_level=True)

import requests

BASE_URL = "https://play2study-xu84.onrender.com"

def test_home():
    r = requests.get(f"{BASE_URL}/")
    assert r.status_code == 200
    assert r.json() == {"message": "Play2Study работает!"}

def test_leaderboard():
    r = requests.get(f"{BASE_URL}/leaderboard")
    # Проверяем, что маршрут отвечает
    assert r.status_code == 200
    # Ответ должен быть списком
    assert isinstance(r.json(), list)

def test_https_enabled():
    r = requests.get(f"{BASE_URL}/", verify=True)
    assert r.status_code == 200

def test_env_vars():
    # Проверяем, что переменные окружения доступны
    assert "DATABASE_URL" in os.environ
    assert os.environ["DATABASE_URL"].startswith("postgres")
