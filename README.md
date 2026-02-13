# ♻️ Smart Waste Segregation System for Urban Communities

An AI-powered web application that classifies waste images into predefined categories and provides proper disposal guidance.  
The system supports **single image upload, real-time camera capture, and bulk ZIP classification** using a deep learning model.

---

## 🚀 Features

- 📷 Single Image Upload Classification
- 📸 Real-Time Camera Capture & Prediction
- 📦 Bulk ZIP Image Classification (Auto Folder Sorting)
- 🧠 Deep Learning Model (ResNet50 Transfer Learning)
- ⚡ FastAPI Backend for Real-Time Inference
- 💻 Modern React Frontend

---

## 🧠 AI Model Details

- Framework: TensorFlow 2.x (Keras)
- Architecture: ResNet50 (Transfer Learning)
- Number of Classes: 7
  - Plastic
  - Paper
  - Metal
  - Glass
  - Organic
  - E-Waste
  - Cloth
- Validation Accuracy: ~94%

## 🛠 Tech Stack

### Frontend
- React.js
- Axios
- CSS
- Recharts (for visualization - upcoming)

### Backend
- FastAPI
- Python
- TensorFlow / Keras
- Pillow
- NumPy
- Uvicorn

# Folder Structure
waste-segregation-system/
│
├── frontend/ 
│ ├── src/
│ ├── package.json
│
├── backend/ 
│ ├── main.py
│ ├── model/
│ │ ├── waste_classifier.keras
│ │ ├── class_labels.json
│ ├── bulk_storage/
│ ├── .env
│
├── .gitignore
├── README.md
