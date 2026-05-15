import os
import anthropic

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# Keyed by (agent_id, session_id) so each agent has isolated sessions
_sessions: dict[tuple[str, str], list[dict]] = {}


def chat(message: str, agent_id: str, session_id: str, system_prompt: str, docs: list = None) -> str:
    system = system_prompt
    if docs:
        sections = "\n\n".join(f"### {d['title']}\n{d['content']}" for d in docs)
        system = f"{system}\n\n---\nReference Documents (use these when relevant):\n\n{sections}"

    key = (agent_id, session_id)
    history = _sessions.setdefault(key, [])
    history.append({"role": "user", "content": message})

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=system,
        messages=history,
    )

    reply = response.content[0].text
    history.append({"role": "assistant", "content": reply})
    return reply


def reset_session(agent_id: str, session_id: str) -> None:
    _sessions.pop((agent_id, session_id), None)


def get_history(agent_id: str, session_id: str) -> list[dict]:
    return _sessions.get((agent_id, session_id), [])
