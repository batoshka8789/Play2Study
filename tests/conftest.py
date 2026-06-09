import os
import tempfile
import shutil
import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def tmp_db_dir():
    d = tempfile.mkdtemp(prefix="test_play2study_")
    yield d
    try:
        shutil.rmtree(d)
    except Exception:
        pass


@pytest.fixture(scope="module")
def test_db_path(tmp_db_dir):
    return os.path.join(tmp_db_dir, "play2study_test.db")


@pytest.fixture(scope="module")
def client(test_db_path):
    # Ensure clean slate: remove db if present
    try:
        if os.path.exists(test_db_path):
            os.remove(test_db_path)
    except Exception:
        pass

    # Ensure app uses the test DB file
    os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path}"

    # Import app after env is set
    import sys
    # If main was imported by another test module, remove it so it re-reads DATABASE_URL
    if "main" in sys.modules:
        del sys.modules["main"]
    import main
    from main import app

    # Ensure tables are created in the test DB (in case create_all ran earlier with a different DB)
    try:
        main.Base.metadata.create_all(bind=main.engine)
        # Ensure compatibility: if users.role missing in older test DBs, add it
        try:
            conn = main.engine.connect()
            dialect = main.engine.dialect.name
            if dialect == 'sqlite':
                res = conn.execute("PRAGMA table_info('users')").fetchall()
                cols = [r[1] for r in res]
                if 'role' not in cols:
                    conn.execute("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user' NOT NULL")
            else:
                res = conn.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users'")
                cols = [r[0] for r in res]
                if 'role' not in cols:
                    conn.execute("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'user' NOT NULL")
        except Exception:
            pass
    except Exception:
        pass

    client = TestClient(app)
    yield client
