#!/usr/bin/env python3
"""Simple sqlite DB backup script.

Usage: set DATABASE_URL or pass path; run from cron to create timestamped backups.
"""
import os
import shutil
from datetime import datetime


def get_db_path():
    url = os.environ.get("DATABASE_URL", "sqlite:///./play2study.db")
    if url.startswith("sqlite:///"):
        return url.replace("sqlite://", "")
    return url


def main():
    db_path = get_db_path()
    if not os.path.exists(db_path):
        print("DB not found:", db_path)
        return 1
    backup_dir = os.environ.get("DB_BACKUP_DIR", "/tmp/play2study_backups")
    os.makedirs(backup_dir, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    dest = os.path.join(backup_dir, f"play2study_{ts}.db")
    shutil.copy2(db_path, dest)
    print("Backed up", db_path, "->", dest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
