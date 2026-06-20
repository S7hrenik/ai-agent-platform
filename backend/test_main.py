import os

# Must be set before importing main/agent — agent.py reads it at module load.
# The value is never used in tests because agent.chat is always mocked.
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key-not-used-in-ci")

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

import database


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    """Each test gets a fresh SQLite file — no shared state."""
    db_file = str(tmp_path / "test.db")
    monkeypatch.setattr(database, "DB_PATH", db_file)
    database.init_db()


@pytest.fixture(autouse=True)
def mock_vector_store():
    """Prevent ChromaDB from initializing — no embedding model needed in CI."""
    with patch("vector_store.add_doc"), \
         patch("vector_store.delete_doc"), \
         patch("vector_store.delete_agent_docs"), \
         patch("vector_store.query_docs", return_value=[]), \
         patch("vector_store.status", return_value={"status": "ok", "doc_count": 0, "path": ":memory:"}):
        yield


@pytest.fixture()
def client():
    from main import app
    return TestClient(app)


@pytest.fixture()
def agent(client):
    """Create and return a test agent."""
    r = client.post("/agents", json={
        "name": "TestBot",
        "description": "A test agent",
        "system_prompt": "You are a test assistant."
    })
    assert r.status_code == 201
    return r.json()


# ── Health ──────────────────────────────────────────────────────────────────

def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["chromadb"]["status"] == "ok"


# ── Agent CRUD ───────────────────────────────────────────────────────────────

def test_create_agent(client):
    r = client.post("/agents", json={
        "name": "MyAgent",
        "description": "Does stuff",
        "system_prompt": "Be helpful."
    })
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "MyAgent"
    assert data["system_prompt"] == "Be helpful."
    assert "id" in data


def test_list_agents_empty(client):
    r = client.get("/agents")
    assert r.status_code == 200
    assert r.json() == []


def test_list_agents(client, agent):
    r = client.get("/agents")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["name"] == "TestBot"


def test_get_agent(client, agent):
    r = client.get(f"/agents/{agent['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == agent["id"]


def test_get_agent_not_found(client):
    r = client.get("/agents/nonexistent-id")
    assert r.status_code == 404


def test_update_agent(client, agent):
    r = client.put(f"/agents/{agent['id']}", json={
        "name": "Renamed",
        "description": "Updated",
        "system_prompt": "New prompt."
    })
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed"
    assert r.json()["system_prompt"] == "New prompt."


def test_update_agent_not_found(client):
    r = client.put("/agents/nonexistent-id", json={
        "name": "X", "description": "", "system_prompt": "Be helpful and concise."
    })
    assert r.status_code == 404


def test_delete_agent(client, agent):
    r = client.delete(f"/agents/{agent['id']}")
    assert r.status_code == 204
    # confirm gone
    r = client.get(f"/agents/{agent['id']}")
    assert r.status_code == 404


def test_delete_agent_not_found(client):
    r = client.delete("/agents/nonexistent-id")
    assert r.status_code == 404


# ── Docs ─────────────────────────────────────────────────────────────────────

def test_list_docs_empty(client, agent):
    r = client.get(f"/agents/{agent['id']}/docs")
    assert r.status_code == 200
    assert r.json() == []


def test_add_and_list_docs(client, agent):
    r = client.post(f"/agents/{agent['id']}/docs", json={
        "title": "Style Guide",
        "content": "Always respond formally."
    })
    assert r.status_code == 201
    doc = r.json()
    assert doc["title"] == "Style Guide"
    assert doc["agent_id"] == agent["id"]

    r = client.get(f"/agents/{agent['id']}/docs")
    assert len(r.json()) == 1


def test_delete_doc(client, agent):
    r = client.post(f"/agents/{agent['id']}/docs", json={
        "title": "T", "content": "C"
    })
    doc_id = r.json()["id"]

    r = client.delete(f"/agents/{agent['id']}/docs/{doc_id}")
    assert r.status_code == 204

    r = client.get(f"/agents/{agent['id']}/docs")
    assert r.json() == []


def test_docs_cascade_on_agent_delete(client, agent):
    client.post(f"/agents/{agent['id']}/docs", json={"title": "T", "content": "C"})
    client.delete(f"/agents/{agent['id']}")
    # agent is gone — docs should be gone too (CASCADE)
    r = client.get(f"/agents/{agent['id']}/docs")
    assert r.status_code == 404


def test_docs_wrong_agent(client):
    r = client.get("/agents/nonexistent-id/docs")
    assert r.status_code == 404


# ── Chat (mocked — no real API calls in CI) ──────────────────────────────────

def test_chat(client, agent):
    with patch("agent.chat", return_value="Hello from mock!") as mock_chat:
        r = client.post(f"/agents/{agent['id']}/chat", json={
            "message": "Hi",
            "session_id": "test-session"
        })
    assert r.status_code == 200
    data = r.json()
    assert data["reply"] == "Hello from mock!"
    assert data["session_id"] == "test-session"
    mock_chat.assert_called_once()


def test_chat_generates_session_id(client, agent):
    with patch("agent.chat", return_value="Hi!"):
        r = client.post(f"/agents/{agent['id']}/chat", json={"message": "Hey"})
    assert r.status_code == 200
    assert "session_id" in r.json()


def test_chat_agent_not_found(client):
    r = client.post("/agents/nonexistent-id/chat", json={"message": "Hi"})
    assert r.status_code == 404
