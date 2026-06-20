import os
import chromadb

CHROMA_PATH = os.getenv("CHROMA_PATH", "chroma_data")

# Lazy — client is created on first use so tests can patch before initialization.
_client: chromadb.PersistentClient | None = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=CHROMA_PATH)
        _collection = _client.get_or_create_collection(
            name="docs",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def add_doc(doc_id: str, agent_id: str, title: str, content: str) -> None:
    _get_collection().upsert(
        ids=[doc_id],
        documents=[content],
        metadatas=[{"agent_id": agent_id, "title": title}],
    )


def delete_doc(doc_id: str) -> None:
    try:
        _get_collection().delete(ids=[doc_id])
    except Exception:
        pass


def delete_agent_docs(agent_id: str) -> None:
    col = _get_collection()
    existing = col.get(where={"agent_id": agent_id})
    if existing["ids"]:
        col.delete(ids=existing["ids"])


def status() -> dict:
    col = _get_collection()
    return {"status": "ok", "doc_count": col.count(), "path": CHROMA_PATH}


def query_docs(agent_id: str, query: str, n_results: int = 3) -> list[dict]:
    col = _get_collection()
    if col.count() == 0:
        return []
    existing = col.get(where={"agent_id": agent_id})
    if not existing["ids"]:
        return []
    results = col.query(
        query_texts=[query],
        n_results=min(n_results, len(existing["ids"])),
        where={"agent_id": agent_id},
    )
    return [
        {
            "id": results["ids"][0][i],
            "title": results["metadatas"][0][i]["title"],
            "content": results["documents"][0][i],
        }
        for i in range(len(results["ids"][0]))
    ]
