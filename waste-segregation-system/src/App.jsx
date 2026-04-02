import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import LandingPage from "./pages/LandingPage";
import ClassifyPage from "./pages/ClassifyPage";
import SingleClassifyPage from "./pages/SingleClassifyPage";
import CameraClassifyPage from "./pages/CameraClassifyPage";
import BulkClassifyPage from "./pages/BulkClassifyPage";
import WasteDetailPage from "./pages/WasteDetailPage";
import ChatBot from "./components/ChatBot";
import RequireAuth from "./components/RequireAuth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import About from "./pages/About";

// function AppRoutes({ isChatOpen, setIsChatOpen }) {
//   const location = useLocation();

//   useEffect(() => {
//     // Close chatbot when navigating to a different screen for a smoother UX.
//     if (isChatOpen) setIsChatOpen(false);
//   }, [location.pathname, isChatOpen, setIsChatOpen]);

//   return (
//     <Routes>
//       <Route
//         path="/"
//         element={
//           <RequireAuth>
//             <LandingPage onOpenChat={() => setIsChatOpen(true)} />
//           </RequireAuth>
//         }
//       />
//       <Route path="/classify" element={<ClassifyPage />} />
//       <Route path="/classify/single" element={<SingleClassifyPage />} />
//       <Route path="/classify/camera" element={<CameraClassifyPage />} />
//       <Route path="/classify/bulk" element={<BulkClassifyPage />} />
//       <Route path="/waste/:id" element={<WasteDetailPage />} />
//       <Route path="/login" element={<LoginPage />} />
//       <Route path="/register" element={<RegisterPage />} />
//       <Route path="/profile" element={<ProfilePage />} />
//     </Routes>
//   );
// }


function AppRoutes({ isChatOpen, setIsChatOpen }) {
  const location = useLocation();

  useEffect(() => {
    // We ONLY want to close the chat when the user actually navigates
    setIsChatOpen(false);
  }, [location.pathname]); // Removed isChatOpen from here

  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireAuth>
            <LandingPage onOpenChat={() => setIsChatOpen(true)} />
          </RequireAuth>
        }
      />
      <Route path="/classify" element={<ClassifyPage />} />
      <Route path="/classify/single" element={<SingleClassifyPage />} />
      <Route path="/classify/camera" element={<CameraClassifyPage />} />
      <Route path="/classify/bulk" element={<BulkClassifyPage />} />
      <Route path="/waste/:id" element={<WasteDetailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
}

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <Router>
      <AppRoutes isChatOpen={isChatOpen} setIsChatOpen={setIsChatOpen} />

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
