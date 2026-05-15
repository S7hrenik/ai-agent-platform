import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listAgents, deleteAgent } from "../api";

export default function AgentList() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setAgents(await listAgents());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm("Delete this agent?")) return;
    await deleteAgent(id);
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>AI Agent Platform</h1>
        <button className="btn-primary" onClick={() => navigate("/agents/new")}>
          + New Agent
        </button>
      </div>

      {loading && <p className="muted">Loading agents...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && agents.length === 0 && (
        <div className="empty-state">
          <p>No agents yet.</p>
          <p className="muted">Create one to get started.</p>
        </div>
      )}

      <div className="agent-grid">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="agent-card"
            onClick={() => navigate(`/agents/${agent.id}/chat`)}
          >
            <div className="agent-card-body">
              <h2>{agent.name}</h2>
              {agent.description && <p className="muted">{agent.description}</p>}
              <p className="system-prompt-preview">{agent.system_prompt}</p>
            </div>
            <div className="agent-card-actions">
              <button
                className="btn-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/agents/${agent.id}/edit`);
                }}
              >
                Edit
              </button>
              <button
                className="btn-danger"
                onClick={(e) => handleDelete(e, agent.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
