import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Avatar from "./Avatar";
import { listAgents, deleteAgent } from "../api";
import { useTheme } from "../hooks/useTheme";

export default function Sidebar() {
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const { theme, toggle } = useTheme();
  const match = location.pathname.match(/\/agents\/([^/]+)/);
  const activeId = match?.[1];

  useEffect(() => {
    listAgents()
      .then(setAgents)
      .catch(() => {})
      .finally(() => setLoadingAgents(false));
  }, [location.pathname]);

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm("Delete this agent?")) return;
    await deleteAgent(id);
    setAgents((prev) => prev.filter((a) => a.id !== id));
    if (activeId === id) navigate("/");
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="brand-mark">✦</span>
        <span className="brand-text">Agent Platform</span>
      </div>

      <div className="agents-label">Agents</div>

      <nav className="agents-nav">
        {loadingAgents && [0, 1, 2].map((i) => (
          <div key={i} className="skeleton-agent-row">
            <div className="skeleton skeleton-avatar" />
            <div className={`skeleton skeleton-text ${i === 1 ? "short" : ""}`} />
          </div>
        ))}
        {!loadingAgents && agents.length === 0 && (
          <span className="agents-empty">No agents yet</span>
        )}
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`agent-row ${activeId === agent.id ? "active" : ""}`}
            onClick={() => navigate(`/agents/${agent.id}/chat`)}
          >
            <Avatar name={agent.name} size={28} />
            <span className="agent-row-name">{agent.name}</span>
            <div className="agent-row-btns">
              <button
                title="Edit"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/agents/${agent.id}/edit`);
                }}
              >
                ✏
              </button>
              <button
                className="danger"
                title="Delete"
                onClick={(e) => handleDelete(e, agent.id)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="new-agent-btn" onClick={() => navigate("/agents/new")}>
          <span className="new-agent-plus">+</span>
          New Agent
        </button>
        <button className="theme-toggle" onClick={toggle}>
          {theme === "dark" ? "☀" : "🌙"}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
      </div>
    </aside>
  );
}
