from fastapi import FastAPI, File, UploadFile , HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
import tensorflow as tf
import json
import io

from fastapi.responses import FileResponse
import tempfile
import zipfile
import shutil
import os
import uuid

# ---------- FastAPI app ----------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Load model & labels ----------
MODEL_PATH = "model/waste_classifier.keras"
LABEL_PATH = "model/class_labels.json"

model = tf.keras.models.load_model(MODEL_PATH)

with open(LABEL_PATH, "r") as f:
    class_labels = json.load(f)

# ---------- Image preprocessing ----------
IMG_SIZE = (224, 224)

def preprocess_image(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize(IMG_SIZE)
    image = np.array(image)
    image = tf.keras.applications.resnet50.preprocess_input(image)
    image = np.expand_dims(image, axis=0)
    return image

# ---------- Prediction endpoint ----------
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()
    processed_image = preprocess_image(image_bytes)

    predictions = model.predict(processed_image)
    confidence = float(np.max(predictions))
    predicted_index = int(np.argmax(predictions))

    return {
        "category": class_labels[str(predicted_index)],
        "wasteId": predicted_index,
        "confidence": round(confidence, 3)
    }

#---------------------zip file upload-------------

MAX_FILES = 500
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


async def process_batch(images_batch, paths_batch, output_dir):

    batch_array = np.stack(images_batch, axis=0)
    predictions = model.predict(batch_array)

    for i, prediction in enumerate(predictions):
        predicted_index = int(np.argmax(prediction))
        label = class_labels[str(predicted_index)]

        destination_folder = os.path.join(output_dir, label)
        os.makedirs(destination_folder, exist_ok=True)

        original_name = os.path.basename(paths_batch[i])
        unique_name = f"{uuid.uuid4().hex[:6]}_{original_name}"

        shutil.copy2(paths_batch[i], os.path.join(destination_folder, unique_name))


@app.post("/bulk_predict")
async def bulk_predict(zipfile_upload: UploadFile = File(...)):

    if not zipfile_upload.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Please upload a ZIP file")

    with tempfile.TemporaryDirectory() as temp_input, tempfile.TemporaryDirectory() as temp_output:

        # Save uploaded zip
        zip_path = os.path.join(temp_input, "input.zip")
        with open(zip_path, "wb") as f:
            f.write(await zipfile_upload.read())

        # Extract zip
        try:
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(temp_input)
        except:
            raise HTTPException(status_code=400, detail="Invalid ZIP file")

        # Collect image paths
        image_paths = []
        for root, _, files in os.walk(temp_input):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in ALLOWED_EXT:
                    image_paths.append(os.path.join(root, file))

        if len(image_paths) == 0:
            raise HTTPException(status_code=400, detail="No valid images found")

        if len(image_paths) > MAX_FILES:
            raise HTTPException(status_code=400, detail=f"Too many images (max {MAX_FILES})")

        # Create output class folders
        for label in class_labels.values():
            os.makedirs(os.path.join(temp_output, label), exist_ok=True)

        # Process images in batches
        batch_size = 16
        images_batch = []
        paths_batch = []

        for img_path in image_paths:
            try:
                img = Image.open(img_path).convert("RGB").resize((224, 224))
                img_array = np.array(img)
                img_array = tf.keras.applications.resnet50.preprocess_input(img_array)
                images_batch.append(img_array)
                paths_batch.append(img_path)

                if len(images_batch) == batch_size:
                    await process_batch(images_batch, paths_batch, temp_output)
                    images_batch = []
                    paths_batch = []

            except:
                continue

        # Process remaining
        if images_batch:
            await process_batch(images_batch, paths_batch, temp_output)

        # Create zip file that persists
        temp_zip_file = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
        temp_zip_path = temp_zip_file.name
        temp_zip_file.close()

        shutil.make_archive(temp_zip_path.replace(".zip", ""), "zip", temp_output)

        return FileResponse(
            temp_zip_path,
            filename="classified_images.zip",
            media_type="application/zip"
        )


