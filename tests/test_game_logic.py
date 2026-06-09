import sqlite3
import pytest
from fastapi.testclient import TestClient


def register_and_login(client: TestClient, test_db_path: str, username: str, email: str, password: str):
    # register
    payload = {"username": username, "password": password, "email": email, "register": True}
    r = client.post("/auth", json=payload)
    assert r.status_code == 200

    # fetch verification code
    conn = sqlite3.connect(test_db_path)
    cur = conn.cursor()
    cur.execute("SELECT id, verification_code FROM users WHERE username = ?", (username,))
    row = cur.fetchone()
    assert row is not None
    user_id, code = row
    conn.close()

    # verify
    r = client.post("/verify", params={"email": email, "code": code})
    assert r.status_code == 200

    # login
    r = client.post("/auth", json={"username": username, "password": password, "register": False})
    assert r.status_code == 200
    token = r.json().get("access_token")
    assert token
    headers = {"Authorization": f"Bearer {token}"}
    return user_id, headers


def insert_task(test_db_path: str, user_id: int, points: int):
    conn = sqlite3.connect(test_db_path)
    cur = conn.cursor()
    cur.execute("INSERT INTO tasks (user_id, title, description, difficulty, points, task_type, completed) VALUES (?, ?, ?, ?, ?, ?, 0)",
                (user_id, f"task_{points}", "desc", "MEDIUM", points, "main"))
    task_id = cur.lastrowid
    conn.commit()
    conn.close()
    return task_id


def get_stats(client: TestClient, headers: dict):
    r = client.get("/stats", headers=headers)
    assert r.status_code == 200
    return r.json()


def complete_task(client: TestClient, headers: dict, task_id: int):
    r = client.post("/complete_task", json={"task_id": task_id}, headers=headers)
    assert r.status_code == 200
    return r.json()


def test_level_up_boundary(client, test_db_path):
    user_id, headers = register_and_login(client, test_db_path, "lvluser", "lvl@example.com", "Pwd12345!")

    # set points to 99 for level 1 so that +1 triggers level up
    conn = sqlite3.connect(test_db_path)
    cur = conn.cursor()
    cur.execute("UPDATE user_stats SET points = 99 WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

    task_id = insert_task(test_db_path, user_id, 1)
    complete_task(client, headers, task_id)

    stats = get_stats(client, headers)
    # points should be updated and level should increase from 1 to 2
    assert stats["level"] == 2


def test_gems_awarding_accuracy(client, test_db_path):
    user_id, headers = register_and_login(client, test_db_path, "gemuser", "gem@example.com", "Pwd12345!")

    baseline = get_stats(client, headers)["gems"]
    cases = [ (5, 1), (10, 1), (20, 2), (99, 9) ]
    total = baseline
    for points, expected_gems in cases:
        task_id = insert_task(test_db_path, user_id, points)
        complete_task(client, headers, task_id)
        total += expected_gems
        stats = get_stats(client, headers)
        assert stats["gems"] == total


@pytest.mark.skip(reason="Streak logic not implemented yet; add tests after implementing last_completion tracking")
def test_streak_logic_placeholder(client, test_db_path):
    """Placeholder for streak logic: to be implemented when streak tracking is added."""
    pass
