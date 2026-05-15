from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
import uuid
import agent
import database

app = FastAPI(title="AI Agent Platform", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    database.init_db()


# ── Pydantic models ──

class AgentCreate(BaseModel):
    name: str
    description: str = ""
    system_prompt: str

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        if len(v) > 100:
            raise ValueError("Name must be 100 characters or fewer")
        return v

    @field_validator("description")
    @classmethod
    def description_valid(cls, v: str) -> str:
        v = v.strip()
        if len(v) > 500:
            raise ValueError("Description must be 500 characters or fewer")
        return v

    @field_validator("system_prompt")
    @classmethod
    def system_prompt_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("System prompt cannot be empty")
        if len(v) < 10:
            raise ValueError("System prompt must be at least 10 characters")
        if len(v) > 10000:
            raise ValueError("System prompt must be 10,000 characters or fewer")
        return v


class AgentUpdate(AgentCreate):
    pass


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    session_id: str


class DocCreate(BaseModel):
    title: str
    content: str

    @field_validator("title")
    @classmethod
    def title_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Title cannot be empty")
        if len(v) > 200:
            raise ValueError("Title must be 200 characters or fewer")
        return v

    @field_validator("content")
    @classmethod
    def content_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Content cannot be empty")
        if len(v) > 50000:
            raise ValueError("Content must be 50,000 characters or fewer")
        return v


# ── Health ──

@app.get("/health")
def health():
    return {"status": "ok"}


# ── Agent CRUD ──

@app.post("/agents", status_code=201)
def create_agent(body: AgentCreate):
    return database.create_agent(body.name, body.description, body.system_prompt)


@app.get("/agents")
def list_agents():
    return database.list_agents()


@app.get("/agents/{agent_id}")
def get_agent(agent_id: str):
    a = database.get_agent(agent_id)
    if not a:
        raise HTTPException(status_code=404, detail="Agent not found")
    return a


@app.put("/agents/{agent_id}")
def update_agent(agent_id: str, body: AgentUpdate):
    a = database.get_agent(agent_id)
    if not a:
        raise HTTPException(status_code=404, detail="Agent not found")
    return database.update_agent(agent_id, body.name, body.description, body.system_prompt)


@app.delete("/agents/{agent_id}", status_code=204)
def delete_agent(agent_id: str):
    a = database.get_agent(agent_id)
    if not a:
        raise HTTPException(status_code=404, detail="Agent not found")
    database.delete_agent(agent_id)


# ── Docs ──

@app.get("/agents/{agent_id}/docs")
def list_docs(agent_id: str):
    if not database.get_agent(agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")
    return database.list_docs(agent_id)


@app.post("/agents/{agent_id}/docs", status_code=201)
def add_doc(agent_id: str, body: DocCreate):
    if not database.get_agent(agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")
    return database.add_doc(agent_id, body.title, body.content)


@app.delete("/agents/{agent_id}/docs/{doc_id}", status_code=204)
def delete_doc(agent_id: str, doc_id: str):
    doc = database.get_doc(doc_id)
    if not doc or doc["agent_id"] != agent_id:
        raise HTTPException(status_code=404, detail="Document not found")
    database.delete_doc(doc_id)


# ── Chat ──

@app.post("/agents/{agent_id}/chat", response_model=ChatResponse)
def chat(agent_id: str, req: ChatRequest):
    a = database.get_agent(agent_id)
    if not a:
        raise HTTPException(status_code=404, detail="Agent not found")
    docs = database.list_docs(agent_id)
    session_id = req.session_id or str(uuid.uuid4())
    try:
        reply = agent.chat(req.message, agent_id, session_id, a["system_prompt"], docs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return ChatResponse(reply=reply, session_id=session_id)


@app.get("/agents/{agent_id}/history/{session_id}")
def history(agent_id: str, session_id: str):
    return {
        "session_id": session_id,
        "messages": agent.get_history(agent_id, session_id),
    }


@app.delete("/agents/{agent_id}/session/{session_id}")
def reset_session(agent_id: str, session_id: str):
    agent.reset_session(agent_id, session_id)
    return {"status": "cleared"}
