import sqlite3
import pytest


def test_duplicate_registration(client, test_db_path):
    payload = {"username": "dupuser", "password": "DupPass1!", "email": "dup@example.com", "register": True}
    r = client.post("/auth", json=payload)
    assert r.status_code == 200

    # Try registering same username/email again
    r2 = client.post("/auth", json=payload)
    assert r2.status_code == 400


def test_invalid_verify_code(client):
    payload = {"username": "invuser", "password": "InvPass1!", "email": "inv@example.com", "register": True}
    r = client.post("/auth", json=payload)
    assert r.status_code == 200

    # Use wrong code
    r2 = client.post("/verify", params={"email": "inv@example.com", "code": "000000"})
    assert r2.status_code == 400


def test_forgot_and_reset_password(client, test_db_path):
    payload = {"username": "resetuser", "password": "ResetPass1!", "email": "reset@example.com", "register": True}
    r = client.post("/auth", json=payload)
    assert r.status_code == 200
    # fetch code from DB
    conn = sqlite3.connect(test_db_path)
    cur = conn.cursor()
    cur.execute("SELECT verification_code FROM users WHERE username = ?", ("resetuser",))
    code = cur.fetchone()[0]
    conn.close()

    # verify first
    r = client.post("/verify", params={"email": "reset@example.com", "code": code})
    assert r.status_code == 200

    # request forgot-password (generates new code)
    r = client.post("/forgot-password", params={"email": "reset@example.com"})
    assert r.status_code == 200

    # get new code
    conn = sqlite3.connect(test_db_path)
    cur = conn.cursor()
    cur.execute("SELECT verification_code FROM users WHERE username = ?", ("resetuser",))
    new_code = cur.fetchone()[0]
    conn.close()

    # reset password
    r = client.post("/reset-password", params={"email": "reset@example.com", "code": new_code, "new_password": "NewPass123"})
    assert r.status_code == 200

    # login with new password
    r = client.post("/auth", json={"username": "resetuser", "password": "NewPass123", "register": False})
    assert r.status_code == 200