import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config/api";

function RequireAuth({ children }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    axios
      .get(`${API_BASE_URL}/profile`, { withCredentials: true })
      .then(() => {
        if (active) setLoading(false);
      })
      .catch(() => {
        if (active) navigate("/login");
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  if (loading) return null;
  return children;
}

export default RequireAuth;

