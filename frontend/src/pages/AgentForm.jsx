import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAgent, createAgent, updateAgent } from "../api";

const DEFAULTS = { name: "", description: "", system_prompt: "" };
const PROMPT_MAX = 10000;
const PROMPT_WARN = 8000;

function fieldError(field, value) {
  if (field === "name") {
    if (!value.trim()) return "Name is required";
    if (value.trim().length > 100) return "Name must be 100 characters or fewer";
  }
  if (field === "description") {
    if (value.trim().length > 500) return "Description must be 500 characters or fewer";
  }
  if (field === "system_prompt") {
    if (!value.trim()) return "System prompt is required";
    if (value.trim().length < 10) return "System prompt must be at least 10 characters";
    if (value.trim().length > PROMPT_MAX) return `System prompt must be ${PROMPT_MAX.toLocaleString()} characters or fewer`;
  }
  return null;
}

export default function AgentForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(DEFAULTS);
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEdit) {
      getAgent(id)
        .then((a) =>
          setForm({ name: a.name, description: a.description, system_prompt: a.system_prompt })
        )
        .catch((e) => setError(e.message));
    }
  }, [id]);

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const blur = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }));

  const errors = {
    name: fieldError("name", form.name),
    description: fieldError("description", form.description),
    system_prompt: fieldError("system_prompt", form.system_prompt),
  };

  const isValid = !errors.name && !errors.description && !errors.system_prompt;
  const promptLen = form.system_prompt.length;
  const promptCountClass = promptLen > PROMPT_MAX ? "over" : promptLen > PROMPT_WARN ? "warn" : "";

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ name: true, description: true, system_prompt: true });
    if (!isValid) return;
    setSaving(true);
    setError(null);
    try {
      const agent = isEdit
        ? await updateAgent(id, form)
        : await createAgent(form);
      navigate(`/agents/${agent.id}/chat`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="form-page">
      <div className="form-nav">
        <button className="btn-ghost" onClick={() => navigate("/")}>
          ← Back
        </button>
      </div>

      <div className="form-card">
        <div className="form-card-top" />
        <div className="form-card-body">
          <div className="form-title">{isEdit ? "Edit Agent" : "New Agent"}</div>

          <form onSubmit={handleSubmit} style={{ display: "contents" }}>
            <div className="field">
              <label>
                Name <span className="required">*</span>
              </label>
              <input
                value={form.name}
                onChange={set("name")}
                onBlur={blur("name")}
                placeholder="e.g. Socratic Tutor, Code Reviewer, Devil's Advocate"
                className={touched.name && errors.name ? "invalid" : ""}
              />
              {touched.name && errors.name && (
                <span className="field-error">⚠ {errors.name}</span>
              )}
            </div>

            <div className="field">
              <label>Description</label>
              <input
                value={form.description}
                onChange={set("description")}
                onBlur={blur("description")}
                placeholder="One line about what this agent does (optional)"
                className={touched.description && errors.description ? "invalid" : ""}
              />
              {touched.description && errors.description && (
                <span className="field-error">⚠ {errors.description}</span>
              )}
            </div>

            <div className="field">
              <label>
                System Prompt <span className="required">*</span>
              </label>
              <textarea
                value={form.system_prompt}
                onChange={set("system_prompt")}
                onBlur={blur("system_prompt")}
                placeholder="You are a..."
                rows={7}
                className={touched.system_prompt && errors.system_prompt ? "invalid" : ""}
              />
              <div className="field-footer">
                {touched.system_prompt && errors.system_prompt ? (
                  <span className="field-error">⚠ {errors.system_prompt}</span>
                ) : (
                  <span className="field-hint">
                    This is the agent's identity — define its personality, expertise, and behavior.
                  </span>
                )}
                <span className={`char-count ${promptCountClass}`}>
                  {promptLen.toLocaleString()} / {PROMPT_MAX.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="prompt-tips">
              <div className="prompt-tips-title">💡 Tips for a great system prompt</div>
              <ul>
                <li>Be specific about role and expertise ("You are a senior Python engineer")</li>
                <li>Set the tone ("Be concise and direct" / "Be encouraging and patient")</li>
                <li>Add constraints ("Always respond in bullet points" / "Ask clarifying questions first")</li>
                <li>Give it personality ("You're skeptical by default — push back on weak arguments")</li>
              </ul>
            </div>

            {error && <div className="error-banner">{error}</div>}

            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => navigate("/")}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Agent"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
