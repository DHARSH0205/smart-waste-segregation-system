from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from PIL import Image
import numpy as np
import tensorflow as tf
import json
import io
import tempfile
import zipfile
import shutil
import os
import uuid
import threading
import gdown
from pydantic import BaseModel
from chat import generate_chat_reply

# --------------------- Paths / Config ---------------------
MODEL_PATH = os.getenv("MODEL_PATH", "model/waste_classifier_dynamic.tflite")
LABEL_PATH = os.getenv("LABEL_PATH", "model/class_labels.json")
MODEL_URL = os.getenv("MODEL_URL", "").strip()  # optional direct download URL

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

# --------------------- FastAPI app ---------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------- Login model ---------------------
class LoginData(BaseModel):
    email: str
    password: str


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    model: str


@app.post("/login")
def login(data: LoginData):
    if data.email == "admin@gmail.com" and data.password == "1234":
        return {"message": "Login successful"}
    return {"message": "Invalid credentials"}


@app.get("/")
def home():
    return {"message": "Backend is running"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        return generate_chat_reply(request.message)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat generation failed: {exc}") from exc


# --------------------- Model globals ---------------------
interpreter = None
input_details = None
output_details = None
class_labels = None

model_load_lock = threading.Lock()
interpreter_lock = threading.Lock()

# --------------------- Image preprocessing ---------------------
IMG_SIZE = (224, 224)


def download_model_if_needed():
    """
    Downloads the model only if it does not exist.
    Requires MODEL_URL to be set if you want auto-download.
    """
    if os.path.exists(MODEL_PATH):
        return

    if not MODEL_URL:
        raise RuntimeError(
            f"Model file not found at '{MODEL_PATH}' and MODEL_URL is empty."
        )

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    print("Downloading model...")
    gdown.download(MODEL_URL, MODEL_PATH, quiet=False)
    print("Model downloaded successfully.")


def ensure_model_loaded():
    """
    Lazy-loads the TFLite model and labels on the first request.
    Safe for Render: the app starts even if the model is not loaded yet.
    """
    global interpreter, input_details, output_details, class_labels

    if interpreter is not None and input_details is not None and output_details is not None and class_labels is not None:
        return

    with model_load_lock:
        if interpreter is not None and input_details is not None and output_details is not None and class_labels is not None:
            return

        try:
            if not os.path.exists(MODEL_PATH):
                download_model_if_needed()

            if not os.path.exists(LABEL_PATH):
                raise FileNotFoundError(f"Label file not found at '{LABEL_PATH}'")

            print("Loading TFLite model...")
            local_interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
            local_interpreter.allocate_tensors()

            local_input_details = local_interpreter.get_input_details()
            local_output_details = local_interpreter.get_output_details()

            with open(LABEL_PATH, "r") as f:
                local_class_labels = json.load(f)

            interpreter = local_interpreter
            input_details = local_input_details
            output_details = local_output_details
            class_labels = local_class_labels

            print("Model loaded successfully.")

        except Exception as e:
            print("Model loading failed:", e)
            raise HTTPException(status_code=500, detail=f"Model loading failed: {e}")


def preprocess_image(image_bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize(IMG_SIZE)
    image = np.array(image)
    image = tf.keras.applications.resnet50.preprocess_input(image)
    image = np.expand_dims(image, axis=0).astype(np.float32)
    return image


def tflite_predict(single_image_batch):
    """
    single_image_batch shape: (1, 224, 224, 3)
    """
    ensure_model_loaded()

    with interpreter_lock:
        interpreter.set_tensor(input_details[0]["index"], single_image_batch)
        interpreter.invoke()
        predictions = interpreter.get_tensor(output_details[0]["index"])

    return predictions


# --------------------- Prediction endpoint ---------------------
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    ensure_model_loaded()

    image_bytes = await file.read()
    processed_image = preprocess_image(image_bytes)

    predictions = tflite_predict(processed_image)
    confidence = float(np.max(predictions))
    predicted_index = int(np.argmax(predictions))

    return {
        "category": class_labels[str(predicted_index)],
        "wasteId": predicted_index,
        "confidence": round(confidence, 3)
    }


# --------------------- ZIP batch classification ---------------------
MAX_FILES = 500
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


async def process_batch(images_batch, paths_batch, output_dir):
    for i, img_array in enumerate(images_batch):
        img_array = np.expand_dims(img_array, axis=0).astype(np.float32)

        predictions = tflite_predict(img_array)
        predicted_index = int(np.argmax(predictions[0]))
        label = class_labels[str(predicted_index)]

        destination_folder = os.path.join(output_dir, label)
        os.makedirs(destination_folder, exist_ok=True)

        original_name = os.path.basename(paths_batch[i])
        unique_name = f"{uuid.uuid4().hex[:6]}_{original_name}"

        shutil.copy2(paths_batch[i], os.path.join(destination_folder, unique_name))


@app.post("/bulk_predict")
async def bulk_predict(zipfile_upload: UploadFile = File(...)):
    ensure_model_loaded()

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
        except Exception:
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
                img = Image.open(img_path).convert("RGB").resize(IMG_SIZE)
                img_array = np.array(img)
                img_array = tf.keras.applications.resnet50.preprocess_input(img_array)
                images_batch.append(img_array)
                paths_batch.append(img_path)

                if len(images_batch) == batch_size:
                    await process_batch(images_batch, paths_batch, temp_output)
                    images_batch = []
                    paths_batch = []

            except Exception:
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


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)