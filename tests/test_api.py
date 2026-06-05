import os
import sqlite3
import pytest



def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["message"].startswith("Play2Study")


def test_register_and_verify_and_login_flow(client, test_db_path):
    # Register
    payload = {"username": "testuser", "password": "TestPass123", "email": "test@example.com", "register": True}
    r = client.post("/auth", json=payload)
    assert r.status_code == 200
    assert r.json()["status"] == "needs_verification"

    # Query the database directly for the verification code
    conn = sqlite3.connect(test_db_path)
    cur = conn.cursor()
    cur.execute("SELECT verification_code FROM users WHERE username = ?", ("testuser",))
    row = cur.fetchone()
    assert row is not None
    code = row[0]
    conn.close()

    # Verify email
    r = client.post("/verify", params={"email": "test@example.com", "code": code})
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

    # Login
    r = client.post("/auth", json={"username": "testuser", "password": "TestPass123", "register": False})
    assert r.status_code == 200
    token = r.json().get("access_token")
    assert token

    # Use token to fetch stats
    headers = {"Authorization": f"Bearer {token}"}
    r = client.get("/stats", headers=headers)
    assert r.status_code == 200
    assert "level" in r.json()


def test_task_flow_and_buy(client, test_db_path):
    # Register another user
    payload = {"username": "taskuser", "password": "TaskPass123", "email": "task@example.com", "register": True}
    r = client.post("/auth", json=payload)
    assert r.status_code == 200

    # Get verification code
    conn = sqlite3.connect(test_db_path)
    cur = conn.cursor()
    cur.execute("SELECT verification_code FROM users WHERE username = ?", ("taskuser",))
    code = cur.fetchone()[0]
    conn.close()

    # Verify
    r = client.post("/verify", params={"email": "task@example.com", "code": code})
    assert r.status_code == 200

    # Login
    r = client.post("/auth", json={"username": "taskuser", "password": "TaskPass123", "register": False})
    token = r.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}

    # Get tasks (should include seeded tasks)
    r = client.get("/tasks", headers=headers)
    assert r.status_code == 200
    tasks = r.json()
    assert isinstance(tasks, list)
    assert len(tasks) >= 1
    task_id = tasks[0]["id"]

    # Complete a task
    r = client.post("/complete_task", json={"task_id": task_id}, headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

    # Buy item (attempt to buy xp_potion)
    r = client.post("/buy_item", json={"item_id": "xp_potion", "cost": 1}, headers=headers)
    # Either success or insufficient gems depending on initial gems; ensure 200/400 are handled
    assert r.status_code in (200, 400)

    # Stats reflect changes
    r = client.get("/stats", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "gems" in data and "points" in data