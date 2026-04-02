import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import "./ProfilePage.css";

function ProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [scanTypeCounts, setScanTypeCounts] = useState({
    single: 0,
    camera: 0,
    zipFile: 0,
  });
  const [resetOpen, setResetOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const refresh = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await axios.get(`${API_BASE_URL}/profile`, { withCredentials: true });
      setProfile(response.data);

      const byScanType = response.data?.byScanType;
      if (byScanType && typeof byScanType === "object") {
        setScanTypeCounts({
          single: byScanType.single || 0,
          camera: byScanType.camera || 0,
          zipFile: byScanType.zipFile || 0,
        });
      } else {
        const scansResp = await axios.get(`${API_BASE_URL}/scan-history`, { withCredentials: true });
        const items = scansResp.data?.items || [];
        const counts = { single: 0, camera: 0, zipFile: 0 };
        for (const item of items) {
          const src = String(item?.source || "").toLowerCase();
          if (src === "camera") counts.camera += 1;
          else if (src === "zipfile" || src === "bulk") counts.zipFile += 1;
          else counts.single += 1;
        }
        setScanTypeCounts(counts);
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || "Please log in.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const logout = async () => {
    try {
      await axios.post(`${API_BASE_URL}/logout`, {}, { withCredentials: true });
    } finally {
      navigate("/login");
    }
  };

  const submitReset = async () => {
    setResetError("");
    setResetSuccess("");
    if (!currentPassword || !newPassword) {
      setResetError("Please fill both fields.");
      return;
    }
    setResetLoading(true);
    try {
      await axios.post(
        `${API_BASE_URL}/password-reset`,
        { currentPassword, newPassword },
        { withCredentials: true }
      );
      setResetSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => setResetOpen(false), 2000);
    } catch (err) {
      setResetError(err?.response?.data?.detail || "Update failed.");
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) return <div className="profile-loading">Loading Dashboard...</div>;

  return (
    <div className="profile-container">
      {/* Top Header */}
      <header className="profile-header">
        <button className="back-btn" onClick={() => navigate("/")}>← Home</button>
        <div className="header-actions">
          <span className="user-badge">@{profile?.username}</span>
          <button className="logout-btn" onClick={logout}>Log out</button>
        </div>
      </header>

      {errorMsg ? (
        <div className="profile-error-card">
          <p>{errorMsg}</p>
          <button onClick={() => navigate("/login")}>Go to Login</button>
        </div>
      ) : (
        <main className="profile-content">
          <h1>My Eco Dashboard</h1>
          
          {/* Main Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card impact">
              <span className="stat-label">Total Impact</span>
              <span className="stat-value">{profile.totalScans}</span>
              <span className="stat-sub">Items Classified</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Camera</span>
              <span className="stat-value">{scanTypeCounts.camera}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Single Upload</span>
              <span className="stat-value">{scanTypeCounts.single}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Bulk (ZIP)</span>
              <span className="stat-value">{scanTypeCounts.zipFile}</span>
            </div>
          </div>

          <div className="dashboard-layout">
            {/* Left: Category Breakdown */}
            <section className="category-section">
              <h3>Waste Distribution</h3>
              {Object.keys(profile.byCategory || {}).length === 0 ? (
                <p className="empty-msg">No data available yet. Start scanning!</p>
              ) : (
                <div className="category-list">
                  {Object.entries(profile.byCategory).map(([category, total]) => (
                    <div key={category} className="category-row">
                      <span className="cat-name">{category}</span>
                      <div className="cat-bar-bg">
                        <div 
                          className="cat-bar-fill" 
                          style={{ width: `${(total / profile.totalScans) * 100}%` }}
                        ></div>
                      </div>
                      <span className="cat-total">{total}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Right: Security & Settings */}
            <section className="settings-section">
              <h3>Account Settings</h3>
              <div className="settings-card">
                <button 
                  className={`toggle-reset-btn ${resetOpen ? 'active' : ''}`}
                  onClick={() => setResetOpen(!resetOpen)}
                >
                  {resetOpen ? "Cancel Reset" : "Change Password"}
                </button>

                {resetOpen && (
                  <div className="password-form">
                    <div className="input-group">
                      <label>Current Password</label>
                      <input 
                        type="password" 
                        value={currentPassword} 
                        onChange={(e) => setCurrentPassword(e.target.value)} 
                      />
                    </div>
                    <div className="input-group">
                      <label>New Password</label>
                      <input 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                      />
                    </div>
                    {resetError && <p className="form-error">{resetError}</p>}
                    {resetSuccess && <p className="form-success">{resetSuccess}</p>}
                    <button 
                      className="save-btn" 
                      onClick={submitReset} 
                      disabled={resetLoading}
                    >
                      {resetLoading ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                )}
                <button className="nav-classify-btn" onClick={() => navigate("/classify")}>
                  Start New Classification
                </button>
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  );
}

export default ProfilePage;