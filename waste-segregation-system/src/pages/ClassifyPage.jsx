import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRef } from "react";

import axios from "axios";
import "./ClassifyPage.css";

function ClassifyPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);

    const [zipFile, setZipFile] = useState(null);
    const [bulkLoading, setBulkLoading] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [cameraOn, setCameraOn] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [cameraResult, setCameraResult] = useState(null);

    const [activeTab, setActiveTab] = useState("single");

    const handleZipChange = (e) => {
        setZipFile(e.target.files[0]);
    };


    const uploadZip = async () => {
        if (!zipFile) {
            alert("Please select a ZIP file");
            return;
        }

        setBulkLoading(true);

        const formData = new FormData();
        formData.append("zipfile_upload", zipFile);

        try {
            const response = await axios.post(
                "http://127.0.0.1:9999/bulk_predict",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                    responseType: "blob", // IMPORTANT
                }
            );

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "classified_images.zip");
            document.body.appendChild(link);
            link.click();
            link.remove();

        } catch (error) {
            alert("Bulk classification failed");
        } finally {
            setBulkLoading(false);
        }
    };


    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
            });

            setCameraOn(true); // Move this BEFORE attaching stream

            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);

        } catch (error) {
            console.error(error);
            alert("Camera not available");
        }
    };



    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setCameraOn(false);
        setCameraResult(null);
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

            try {
                const response = await axios.post(
                    "http://127.0.0.1:9999/predict",
                    formData,
                    {
                        headers: {
                            "Content-Type": "multipart/form-data",
                        },
                    }
                );

                setCameraResult(response.data);

            } catch (error) {
                alert("Prediction failed");
            } finally {
                setCameraLoading(false);
            }
        }, "image/jpeg");
    };


    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImage(file);
        setPreview(URL.createObjectURL(file));
        setResult(null);
    };

    const handlePredict = async () => {
        setLoading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append("file", image);

            const response = await axios.post(
                "http://127.0.0.1:9999/predict",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            setResult(response.data);
        } catch (error) {
            alert("Prediction failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="classify-page">
            <div className="tabs-container">
                <button
                    className={`tab-btn ${activeTab === "single" ? "active" : ""}`}
                    onClick={() => setActiveTab("single")}
                >
                    Single Image
                </button>

                <button
                    className={`tab-btn ${activeTab === "camera" ? "active" : ""}`}
                    onClick={() => setActiveTab("camera")}
                >
                    Camera
                </button>

                <button
                    className={`tab-btn ${activeTab === "bulk" ? "active" : ""}`}
                    onClick={() => setActiveTab("bulk")}
                >
                    Bulk ZIP
                </button>
            </div>

{activeTab === "single" && (
  <div className="mode-card">            
            <div className="classify-card">
                <h1>Waste Classification</h1>
                <p>Upload an image of the waste item to classify it.</p>

                <label className="upload-box">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        hidden
                    />
                    <span>Click to upload waste image</span>
                </label>

                {preview && (
                    <img
                        src={preview}
                        alt="Preview"
                        className="preview-image"
                    />
                )}

                <button
                    onClick={handlePredict}
                    disabled={!image || loading}
                    className="predict-btn"
                >
                    {loading ? "Predicting..." : "Predict Waste Type"}
                </button>

                {loading && <div className="spinner"></div>}



                {result && (
                    <div className="result-box">
                        <h3>Predicted Category: {result.category}</h3>
                        <p>
                            <strong>Method of Disposal:</strong> {result.disposal}
                        </p>

                        <button
                            className="more-details-btn"
                            onClick={() => navigate(`/waste/${result.wasteId}`)}
                        >
                            More Details →
                        </button>

                    </div>
                )}

            </div>

            </div>
)}

{activeTab === "bulk" && (
  <div className="mode-card">             

            <div className="bulk-section">
                <h2>Bulk Classification (ZIP Upload)</h2>

                <input
                    type="file"
                    accept=".zip"
                    onChange={handleZipChange}
                />

                <button
                    className="predict-btn"
                    onClick={uploadZip}
                    disabled={bulkLoading}
                >
                    {bulkLoading ? "Processing..." : "Upload & Classify"}
                </button>
            </div>


            </div>
)}

{activeTab === "camera" && (
  <div className="mode-card">
            <div className="camera-section">
                <h2>Camera Mode</h2>

                {!cameraOn ? (
                    <button className="predict-btn" onClick={startCamera}>
                        Open Camera
                    </button>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            style={{ width: "100%", maxWidth: "400px", borderRadius: "12px" }}
                        ></video>


                        <canvas ref={canvasRef} style={{ display: "none" }}></canvas>

                        <div style={{ marginTop: "15px" }}>
                            <button
                                className="predict-btn"
                                onClick={captureAndPredict}
                                disabled={cameraLoading}
                            >
                                {cameraLoading ? "Predicting..." : "Capture & Predict"}
                            </button>

                            <button
                                className="predict-btn"
                                style={{ marginLeft: "10px", backgroundColor: "#e74c3c" }}
                                onClick={stopCamera}
                            >
                                Close Camera
                            </button>
                        </div>
                    </>
                )}

                {cameraResult && (
                    <div className="result-box">
                        <h3>Predicted: {cameraResult.category}</h3>
                        <p>Confidence: {cameraResult.confidence}</p>
                    </div>
                )}
            </div>

            </div>
)}

        </div>
    );

}

export default ClassifyPage;
