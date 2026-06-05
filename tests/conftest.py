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
    except Exception:
        pass

    client = TestClient(app)
    yield client
