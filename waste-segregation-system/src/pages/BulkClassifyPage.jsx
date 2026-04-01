import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import "./ClassifyModePage.css";

function BulkClassifyPage() {
  const navigate = useNavigate();
  const [zipFile, setZipFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const uploadZip = async () => {
    if (!zipFile) {
      alert("Please select a ZIP file");
      return;
    }

    setBulkLoading(true);
    const formData = new FormData();
    formData.append("zipfile_upload", zipFile);

    try {
      const response = await axios.post(`${API_BASE_URL}/bulk_predict`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "classified_images.zip");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Bulk classification failed");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="classify-mode-page">
      <div className="mode-card">
        <button className="mode-back-btn" onClick={() => navigate("/classify")}>
          Back
        </button>
        <img
          className="mode-placeholder"
          src="https://placehold.co/720x250/f1f8e9/558b2f?text=Bulk+ZIP+Classification"
          alt="Bulk mode placeholder"
        />
        <h1>Bulk ZIP Classification</h1>
        <p>Upload a ZIP with multiple images and download categorized output.</p>

        <input type="file" accept=".zip" onChange={(event) => setZipFile(event.target.files[0])} />
        <button className="predict-btn" onClick={uploadZip} disabled={bulkLoading}>
          {bulkLoading ? "Processing..." : "Upload & Classify"}
        </button>
      </div>
    </div>
  );
}

export default BulkClassifyPage;
