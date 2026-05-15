import os
import sqlite3
import uuid
from contextlib import contextmanager

DB_PATH = os.getenv("DB_PATH", "agents.db")


def init_db():
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS agents (
                id            TEXT PRIMARY KEY,
                name          TEXT NOT NULL,
                description   TEXT NOT NULL DEFAULT '',
                system_prompt TEXT NOT NULL,
                created_at    TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS docs (
                id         TEXT PRIMARY KEY,
                agent_id   TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                title      TEXT NOT NULL,
                content    TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)


@contextmanager
def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ── Agents ──

def create_agent(name: str, description: str, system_prompt: str) -> dict:
    agent_id = str(uuid.uuid4())
    with _connect() as conn:
        conn.execute(
            "INSERT INTO agents (id, name, description, system_prompt) VALUES (?, ?, ?, ?)",
            (agent_id, name, description, system_prompt),
        )
    return get_agent(agent_id)


def list_agents() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM agents ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def get_agent(agent_id: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM agents WHERE id = ?", (agent_id,)
        ).fetchone()
    return dict(row) if row else None


def update_agent(agent_id: str, name: str, description: str, system_prompt: str) -> dict | None:
    with _connect() as conn:
        conn.execute(
            "UPDATE agents SET name=?, description=?, system_prompt=? WHERE id=?",
            (name, description, system_prompt, agent_id),
        )
    return get_agent(agent_id)


def delete_agent(agent_id: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM agents WHERE id = ?", (agent_id,))


# ── Docs ──

def add_doc(agent_id: str, title: str, content: str) -> dict:
    doc_id = str(uuid.uuid4())
    with _connect() as conn:
        conn.execute(
            "INSERT INTO docs (id, agent_id, title, content) VALUES (?, ?, ?, ?)",
            (doc_id, agent_id, title, content),
        )
    return get_doc(doc_id)


def list_docs(agent_id: str) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM docs WHERE agent_id = ? ORDER BY created_at ASC",
            (agent_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_doc(doc_id: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM docs WHERE id = ?", (doc_id,)
        ).fetchone()
    return dict(row) if row else None


def delete_doc(doc_id: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM docs WHERE id = ?", (doc_id,))
