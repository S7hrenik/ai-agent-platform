"""
Smoke test for ChromaDB integration — run directly, no pytest, no mocking.

    cd backend
    python smoke_chroma.py

Creates a temp Chroma dir, exercises add/query/delete, prints results, cleans up.
"""

import os
import tempfile
import shutil

# Point to a fresh temp dir before vector_store is imported.
tmp_dir = tempfile.mkdtemp(prefix="smoke_chroma_")
os.environ["CHROMA_PATH"] = tmp_dir

import vector_store  # noqa: E402 — must come after env var is set

AGENT = "smoke-agent-1"

DOCS = [
    ("d1", "Python Functions",   "def keyword defines functions in Python. Use return to send back a value."),
    ("d2", "SQL Joins",          "JOIN combines rows from two tables. INNER JOIN returns only matching rows."),
    ("d3", "Docker Networking",  "Docker containers communicate via bridge networks. Use --network flag to connect them."),
    ("d4", "Git Branching",      "Create a branch with git checkout -b. Merge with git merge or rebase."),
    ("d5", "HTTP Status Codes",  "200 OK means success. 404 means not found. 500 is a server error."),
]

print(f"\nChroma path : {tmp_dir}")
print("-" * 60)

# ── 1. Status on empty collection ─────────────────────────────────────────────
s = vector_store.status()
print(f"[status]  doc_count={s['doc_count']}  (expect 0)")
assert s["doc_count"] == 0

# ── 2. Add docs ───────────────────────────────────────────────────────────────
for doc_id, title, content in DOCS:
    vector_store.add_doc(doc_id, AGENT, title, content)
print(f"[add]     inserted {len(DOCS)} docs")

s = vector_store.status()
print(f"[status]  doc_count={s['doc_count']}  (expect {len(DOCS)})")
assert s["doc_count"] == len(DOCS)

# ── 3. Semantic queries ───────────────────────────────────────────────────────
queries = [
    ("How do I write a reusable function?",         "Python Functions"),
    ("What is the difference between JOIN types?",  "SQL Joins"),
    ("How do containers talk to each other?",       "Docker Networking"),
]

print()
all_passed = True
for question, expected_top in queries:
    results = vector_store.query_docs(AGENT, question, n_results=2)
    top = results[0]["title"] if results else "—"
    ok = top == expected_top
    all_passed = all_passed and ok
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] Q: \"{question}\"")
    print(f"       top match : {top}  (expected: {expected_top})")
    for r in results:
        print(f"         • {r['title']}")

# ── 4. Delete a single doc ────────────────────────────────────────────────────
print()
vector_store.delete_doc("d1")
s = vector_store.status()
print(f"[delete]  removed d1 -> doc_count={s['doc_count']}  (expect {len(DOCS) - 1})")
assert s["doc_count"] == len(DOCS) - 1

results = vector_store.query_docs(AGENT, "How do I write a reusable function?", n_results=3)
titles = [r["title"] for r in results]
assert "Python Functions" not in titles, "Deleted doc should not appear in results"
print(f"[verify]  Python Functions absent from results — correct")

# ── 5. Delete all docs for agent ──────────────────────────────────────────────
vector_store.delete_agent_docs(AGENT)
s = vector_store.status()
print(f"[purge]   delete_agent_docs -> doc_count={s['doc_count']}  (expect 0)")
assert s["doc_count"] == 0

results = vector_store.query_docs(AGENT, "anything", n_results=3)
assert results == [], "Empty collection should return []"
print(f"[verify]  query on empty collection returns []")

# ── 6. Cleanup ────────────────────────────────────────────────────────────────
shutil.rmtree(tmp_dir, ignore_errors=True)
print()
if all_passed:
    print("ChromaDB smoke test PASSED — add, query, delete all working.")
else:
    print("ChromaDB smoke test finished with FAILED semantic matches (see above).")
    raise SystemExit(1)
