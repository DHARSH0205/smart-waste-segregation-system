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
      setErrorMsg(err?.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <h1>Get Started</h1>
        <p>Join EcoBuddy to track your scans and improve city sustainability.</p>

        <form className="auth-form" onSubmit={onSubmit}>
          <div className="auth-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Choose a nickname"
            />
          </div>

          <div className="auth-field">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Create a strong password"
            />
          </div>

          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {errorMsg && <div className="auth-error">{errorMsg}</div>}

        <div className="auth-links">
          <span>Already part of the system?</span>
          <button className="auth-link" onClick={() => navigate("/login")}>
            Login to your account
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;