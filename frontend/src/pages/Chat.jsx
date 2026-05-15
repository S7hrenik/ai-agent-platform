import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Avatar from "../components/Avatar";
import Dino from "../components/Dino";
import { getAgent, sendMessage, clearSession, listDocs, addDoc, deleteDoc } from "../api";

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [agent, setAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [docs, setDocs] = useState([]);
  const [showDocs, setShowDocs] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", content: "" });
  const [savingDoc, setSavingDoc] = useState(false);

  const bottomRef = useRef(null);

  useEffect(() => {
    getAgent(id).then(setAgent).catch(() => navigate("/"));
    listDocs(id).then(setDocs).catch(() => {});
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const data = await sendMessage(id, text, sessionId);
      setSessionId(data.session_id);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "error", content: "Failed to reach the server." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  }

  async function handleNewChat() {
    if (sessionId) await clearSession(id, sessionId);
    setMessages([]);
    setSessionId(null);
  }

  async function handleAddDoc(e) {
    e.preventDefault();
    if (!newDoc.title.trim() || !newDoc.content.trim()) return;
    setSavingDoc(true);
    try {
      const doc = await addDoc(id, newDoc);
      setDocs((prev) => [...prev, doc]);
      setNewDoc({ title: "", content: "" });
      setAddingDoc(false);
    } catch {
    } finally {
      setSavingDoc(false);
    }
  }

  async function handleDeleteDoc(docId) {
    await deleteDoc(id, docId);
    setDocs((prev) => prev.filter((d) => d.id !== docId));
  }

  if (!agent) return (
    <div className="chat-page">
      <div className="skeleton-chat-header">
        <div className="skeleton skeleton-avatar" style={{ width: 34, height: 34 }} />
        <div>
          <div className="skeleton skeleton-chat-title" />
          <div className="skeleton skeleton-chat-sub" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <Avatar name={agent.name} size={34} />
        <div className="chat-agent-info">
          <span className="chat-agent-name">{agent.name}</span>
          {agent.description && (
            <span className="chat-agent-desc">{agent.description}</span>
          )}
        </div>
        <button
          className={`docs-toggle-btn ${docs.length > 0 ? "has-docs" : ""}`}
          onClick={() => setShowDocs(true)}
        >
          📄 Docs {docs.length > 0 && <span className="docs-badge">{docs.length}</span>}
        </button>
        {messages.length > 0 && (
          <button className="btn-ghost" onClick={handleNewChat}>
            New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        <div className="messages-inner">
          {messages.length === 0 && (
            <div className="chat-empty">
              <div className="chat-empty-avatar">
                <Avatar name={agent.name} size={56} />
              </div>
              <Dino size={52} running={false} />
              <p>Chat with {agent.name}</p>
              <span>Send a message to start the conversation</span>
              {docs.length > 0 && (
                <span className="docs-context-note">
                  📄 {docs.length} document{docs.length > 1 ? "s" : ""} loaded as context
                </span>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`msg ${msg.role}`}>
              {msg.role === "assistant" && <Avatar name={agent.name} size={28} />}
              {msg.role === "user" && <div className="msg-spacer" />}
              <span className="bubble">{msg.content}</span>
            </div>
          ))}

          {loading && (
            <div className="dino-thinking">
              <Dino size={40} running={true} />
              <span className="dino-thinking-label">thinking…</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="chat-input-wrap">
        <form className="chat-input-bar" onSubmit={handleSend}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent.name}...`}
            disabled={loading}
            autoFocus
          />
          <button type="submit" className="send-btn" disabled={loading || !input.trim()}>
            ↑
          </button>
        </form>
      </div>

      {/* Docs drawer */}
      {showDocs && (
        <div className="docs-overlay" onClick={() => { setShowDocs(false); setAddingDoc(false); }}>
          <div className="docs-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="docs-drawer-header">
              <span>Skill Documents</span>
              <button className="docs-close" onClick={() => { setShowDocs(false); setAddingDoc(false); }}>✕</button>
            </div>

            <div className="docs-drawer-body">
              {docs.length === 0 && !addingDoc && (
                <div className="docs-empty">
                  <p>No documents yet.</p>
                  <span>Add docs to give this agent reference material — they'll be injected as context on every message.</span>
                </div>
              )}

              {docs.map((doc) => (
                <div key={doc.id} className="doc-item">
                  <div className="doc-item-info">
                    <span className="doc-title">📄 {doc.title}</span>
                    <span className="doc-preview">{doc.content.slice(0, 80)}{doc.content.length > 80 ? "…" : ""}</span>
                  </div>
                  <button
                    className="doc-delete"
                    onClick={() => handleDeleteDoc(doc.id)}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {addingDoc ? (
                <form className="doc-add-form" onSubmit={handleAddDoc}>
                  <input
                    placeholder="Document title"
                    value={newDoc.title}
                    onChange={(e) => setNewDoc((p) => ({ ...p, title: e.target.value }))}
                    required
                    autoFocus
                  />
                  <textarea
                    placeholder="Paste document content here..."
                    value={newDoc.content}
                    onChange={(e) => setNewDoc((p) => ({ ...p, content: e.target.value }))}
                    rows={8}
                    required
                  />
                  <div className="doc-add-actions">
                    <button type="button" className="btn-secondary" onClick={() => setAddingDoc(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary" disabled={savingDoc}>
                      {savingDoc ? "Saving..." : "Add Document"}
                    </button>
                  </div>
                </form>
              ) : (
                <button className="doc-add-btn" onClick={() => setAddingDoc(true)}>
                  + Add Document
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
