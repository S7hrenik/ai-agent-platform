import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();
  return (
    <div className="welcome">
      <div className="welcome-glow" />
      <div className="welcome-content">
        <div className="welcome-badge">✦ AI Agent Platform</div>
        <h1 className="welcome-title">
          Build agents that<br />
          <span className="gradient-text">think differently</span>
        </h1>
        <p className="welcome-sub">
          Give each agent a unique personality, expertise, and purpose.
          Every agent has a different voice — and they all remember your conversation.
        </p>
        <div className="welcome-pills">
          <span className="pill">⚡ Claude Haiku</span>
          <span className="pill">🎭 Custom personas</span>
          <span className="pill">💬 Isolated sessions</span>
        </div>
        <button className="btn-primary" onClick={() => navigate("/agents/new")}>
          Create your first agent →
        </button>
      </div>
    </div>
  );
}
