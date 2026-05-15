const BASE = "/api";

// ── Agents ──

export async function listAgents() {
  const res = await fetch(`${BASE}/agents`);
  if (!res.ok) throw new Error("Failed to load agents");
  return res.json();
}

export async function getAgent(id) {
  const res = await fetch(`${BASE}/agents/${id}`);
  if (!res.ok) throw new Error("Agent not found");
  return res.json();
}

export async function createAgent(data) {
  const res = await fetch(`${BASE}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create agent");
  return res.json();
}

export async function updateAgent(id, data) {
  const res = await fetch(`${BASE}/agents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update agent");
  return res.json();
}

export async function deleteAgent(id) {
  const res = await fetch(`${BASE}/agents/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete agent");
}

// ── Docs ──

export async function listDocs(agentId) {
  const res = await fetch(`${BASE}/agents/${agentId}/docs`);
  if (!res.ok) throw new Error("Failed to load docs");
  return res.json();
}

export async function addDoc(agentId, data) {
  const res = await fetch(`${BASE}/agents/${agentId}/docs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add doc");
  return res.json();
}

export async function deleteDoc(agentId, docId) {
  const res = await fetch(`${BASE}/agents/${agentId}/docs/${docId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete doc");
}

// ── Chat ──

export async function sendMessage(agentId, message, sessionId) {
  const res = await fetch(`${BASE}/agents/${agentId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

export async function clearSession(agentId, sessionId) {
  await fetch(`${BASE}/agents/${agentId}/session/${sessionId}`, {
    method: "DELETE",
  });
}
