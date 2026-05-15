import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Welcome from "./pages/Welcome";
import AgentForm from "./pages/AgentForm";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main-panel">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/agents/new" element={<AgentForm />} />
          <Route path="/agents/:id/edit" element={<AgentForm />} />
          <Route path="/agents/:id/chat" element={<Chat />} />
        </Routes>
      </main>
    </div>
  );
}
