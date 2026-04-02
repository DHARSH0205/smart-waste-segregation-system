import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config/api";
import "./ClassifyModePage.css";

function CameraClassifyPage() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraResult, setCameraResult] = useState(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraOn(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch {
      alert("Camera not available");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  };

  const captureAndPredict = async () => {
    setCameraLoading(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("file", blob, "camera_capture.jpg");
      formData.append("source", "camera");
      try {
        const response = await axios.post(`${API_BASE_URL}/predict`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          withCredentials: true,
        });
        setCameraResult(response.data);
      } catch {
        alert("Prediction failed");
      } finally {
        setCameraLoading(false);
      }
    }, "image/jpeg");
  };

  return (
    <div className="classify-mode-page">
      <div className="mode-card">
        <div className="page-topbar">
          <button className="mode-back-btn" type="button" onClick={() => navigate("/")}>
            Back
          </button>
          <button className="ghost-cta" type="button" onClick={() => navigate("/profile")}>
            Profile
          </button>
        </div>
        <img
          className="mode-placeholder"
          src="https://placehold.co/720x250/e3f2fd/1565c0?text=Camera+Classification"
          alt="Camera mode placeholder"
        />
        <h1>Camera Classification</h1>
        <p>Capture an image from your camera and classify instantly.</p>

        {!cameraOn ? (
          <button className="predict-btn" onClick={startCamera}>
            Open Camera
          </button>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline className="camera-video" />
            <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
            <div className="camera-actions">
              <button className="predict-btn" onClick={captureAndPredict} disabled={cameraLoading}>
                {cameraLoading ? "Predicting..." : "Capture & Predict"}
              </button>
              <button className="more-details-btn danger" onClick={stopCamera}>
                Close Camera
              </button>
            </div>
          </>
        )}

        {cameraResult && (
          <div className="result-box">
            <h3>Predicted: {cameraResult.category}</h3>
            <p>
              <strong>Confidence:</strong> {cameraResult.confidence}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CameraClassifyPage;
