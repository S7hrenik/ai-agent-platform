import os
os.environ.setdefault("ANTHROPIC_API_KEY", "x")

import vector_store

col = vector_store._get_collection()
print("Collection :", col.name)
print("Total docs :", col.count())
print("Chroma path:", vector_store.CHROMA_PATH)
print()

all_data = col.get(include=["documents", "metadatas"])
if not all_data["ids"]:
    print("(collection is empty)")
else:
    for i, doc_id in enumerate(all_data["ids"]):
        meta = all_data["metadatas"][i]
        content = all_data["documents"][i]
        snippet = (content[:120] + "...") if len(content) > 120 else content
        print(f"[{i+1}] id       : {doc_id}")
        print(f"     agent_id : {meta['agent_id']}")
        print(f"     title    : {meta['title']}")
        print(f"     content  : {snippet}")
        print()
