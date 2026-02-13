import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import ClassifyPage from "./pages/ClassifyPage";
import WasteDetailPage from "./pages/WasteDetailPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/classify" element={<ClassifyPage />} />
        <Route path="/waste/:id" element={<WasteDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;
