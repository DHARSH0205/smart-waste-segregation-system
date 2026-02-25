import gdown
import os

MODEL_URL = "https://drive.google.com/uc?id=1DGlXTebXgpvJ-VnloPSIkZJNNoQ1CqP9"
MODEL_PATH = "model/waste_classifier.keras"

if not os.path.exists(MODEL_PATH):
    print("Downloading model...")
    gdown.download(MODEL_URL, MODEL_PATH, quiet=False)
    print("Model downloaded.")
else:
    print("Model already exists.")