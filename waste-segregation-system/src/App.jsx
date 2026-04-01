import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import LandingPage from "./pages/LandingPage";
import ClassifyPage from "./pages/ClassifyPage";
import SingleClassifyPage from "./pages/SingleClassifyPage";
import CameraClassifyPage from "./pages/CameraClassifyPage";
import BulkClassifyPage from "./pages/BulkClassifyPage";
import WasteDetailPage from "./pages/WasteDetailPage";
import ChatBot from "./components/ChatBot";

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<LandingPage onOpenChat={() => setIsChatOpen(true)} />}
        />
        <Route path="/classify" element={<ClassifyPage />} />
        <Route path="/classify/single" element={<SingleClassifyPage />} />
        <Route path="/classify/camera" element={<CameraClassifyPage />} />
        <Route path="/classify/bulk" element={<BulkClassifyPage />} />
        <Route path="/waste/:id" element={<WasteDetailPage />} />
      </Routes>

      <button
        type="button"
        className="chatbot-fab"
        onClick={() => setIsChatOpen(true)}
        aria-label="Open chatbot"
      >
        Chat
      </button>

      <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </Router>
  );
}

export default App;
