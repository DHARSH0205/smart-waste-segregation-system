import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import "./AuthPages.css";

function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      await axios.post(
        `${API_BASE_URL}/register`,
        { username, email, password },
        { withCredentials: true }
      );
      navigate("/login");
    } catch (err) {
      const detail = err?.response?.data?.detail || "Registration failed. Please try again.";
      setErrorMsg(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="page-topbar">
          <button className="mode-back-btn" type="button" onClick={() => navigate("/")}>
            Back
          </button>
          <button className="ghost-cta" type="button" onClick={() => navigate("/profile")}>
            Profile
          </button>
        </div>

        <h1>Create account</h1>
        <p>Save your scan history and chat memory (temporary) with EcoBuddy.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="auth-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Register"}
          </button>
        </form>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        <div className="auth-links">
          <span>Already have an account?</span>
          <button className="auth-link" type="button" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
