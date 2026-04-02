import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import "./AuthPages.css";

function LoginPage() {
  const navigate = useNavigate();
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
        `${API_BASE_URL}/login`,
        { email, password },
        { withCredentials: true }
      );
      navigate("/");
    } catch (err) {
      const detail = err?.response?.data?.detail || "Login failed. Please try again.";
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

        <h1>Login</h1>
        <p>Welcome back. Let EcoBuddy help you dispose the right way.</p>

        <form className="auth-form" onSubmit={onSubmit}>
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
              autoComplete="current-password"
            />
          </div>

          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        <div className="auth-links">
          <span>New here?</span>
          <button className="auth-link" type="button" onClick={() => navigate("/register")}>
            Create account
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
