import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import "./ClassifyModePage.css";

function SingleClassifyPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
  };

  const handlePredict = async () => {
    if (!image) return;
    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", image);
      const response = await axios.post(`${API_BASE_URL}/predict`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(response.data);
    } catch {
      alert("Prediction failed. Please try again.");
    } finally {
      setLoading(false);
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
          src="https://placehold.co/720x250/e8f5e9/2e7d32?text=Single+Image+Classification"
          alt="Single image mode placeholder"
        />
        <h1>Single Image Classification</h1>
        <p>Upload one image and run waste prediction.</p>

        <label className="upload-box">
          <input type="file" accept="image/*" onChange={handleImageChange} hidden />
          <span>Click to upload waste image</span>
        </label>

        {preview && <img src={preview} alt="Preview" className="preview-image" />}

        <button onClick={handlePredict} disabled={!image || loading} className="predict-btn">
          {loading ? "Predicting..." : "Predict Waste Type"}
        </button>

        {loading && <div className="spinner"></div>}

        {result && (
          <div className="result-box">
            <h3>Predicted Category: {result.category}</h3>
            <p>
              <strong>Confidence:</strong> {result.confidence}
            </p>
            <button className="more-details-btn" onClick={() => navigate(`/waste/${result.wasteId}`)}>
              More Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SingleClassifyPage;
