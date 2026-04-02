from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Response, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Optional
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
from db import (
    init_db,
    create_user,
    get_user_by_email,
    verify_user_password,
    create_session,
    get_user_id_from_session,
    destroy_session,
    get_profile_stats,
    get_recent_scans,
    record_scan,
    record_scans_many,
    chat_get_or_create_session,
    chat_touch_session,
    chat_get_recent_messages,
    chat_add_message,
    chat_clear_session,
    SCAN_HISTORY_LIMIT_PER_PROFILE,
    update_password_for_user,
)

# --------------------- Paths / Config ---------------------
MODEL_PATH = os.getenv("MODEL_PATH", "model/waste_classifier_dynamic.tflite")
LABEL_PATH = os.getenv("LABEL_PATH", "model/class_labels.json")
MODEL_URL = os.getenv("MODEL_URL", "").strip()  # optional direct download URL

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5174").split(",")
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


class RegisterData(BaseModel):
    username: str
    email: str
    password: str


class PasswordResetData(BaseModel):
    currentPassword: str
    newPassword: str


SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "session_id")
SESSION_COOKIE_MAX_AGE_DAYS = int(os.getenv("SESSION_COOKIE_MAX_AGE_DAYS", "7"))
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "none").lower()
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "true").lower() in ("1", "true", "yes")


@app.on_event("startup")
def on_startup():
    init_db()

    # Ensure an admin user exists for backwards compatibility.
    admin_email = os.getenv("ADMIN_EMAIL", "admin@gmail.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "1234")
    admin_username = os.getenv("ADMIN_USERNAME", "admin")

    try:
        existing = get_user_by_email(admin_email)
        if not existing:
            create_user(admin_username, admin_email, admin_password)
    except Exception:
        # Don't prevent server boot if admin bootstrap fails.
        pass


@app.post("/register")
def register(data: RegisterData, response: Response):
    try:
        user_id = create_user(data.username, data.email, data.password)
        session_id = create_session(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        # Likely unique constraint failure on email.
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        samesite=SESSION_COOKIE_SAMESITE,
        secure=SESSION_COOKIE_SECURE,
        max_age=SESSION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
    )
    return {"message": "Registration successful"}


@app.post("/login")
def login(data: LoginData, response: Response):
    user_row = get_user_by_email(data.email)
    if not verify_user_password(user_row, data.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    session_id = create_session(int(user_row["id"]))
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        samesite=SESSION_COOKIE_SAMESITE,
        secure=SESSION_COOKIE_SECURE,
        max_age=SESSION_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60,
    )
    return {"message": "Login successful"}


@app.post("/logout")
def logout(request: Request, response: Response):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    user_id = get_user_id_from_session(session_id)
    destroy_session(session_id)
    if user_id:
        chat_clear_session(user_id)
    response.delete_cookie(key=SESSION_COOKIE_NAME)
    return {"message": "Logged out"}


@app.post("/password-reset")
def password_reset(data: PasswordResetData, request: Request):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    user_id = get_user_id_from_session(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        update_password_for_user(user_id, data.currentPassword, data.newPassword)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"message": "Password updated successfully"}


@app.get("/profile")
def profile(request: Request):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    user_id = get_user_id_from_session(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    stats = get_profile_stats(user_id)
    if not stats:
        raise HTTPException(status_code=404, detail="User not found")
    return stats


@app.get("/scan-history")
def scan_history(request: Request):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    user_id = get_user_id_from_session(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"items": get_recent_scans(user_id, limit=SCAN_HISTORY_LIMIT_PER_PROFILE)}


@app.get("/")
def home():
    return {"message": "Backend is running"}


@app.post("/chat", response_model=ChatResponse)
async def chat(chat_request: ChatRequest, request: Request):
    try:
        user_id = get_user_id_from_session(request.cookies.get(SESSION_COOKIE_NAME))

        if not user_id:
            # Anonymous chat: no persistence.
            return generate_chat_reply(chat_request.message, history=None)

        session_id = chat_get_or_create_session(user_id)
        history = chat_get_recent_messages(session_id, limit=20)

        # Store user message then generate reply.
        chat_add_message(session_id, "user", chat_request.message)
        reply_payload = generate_chat_reply(chat_request.message, history=history)
        reply_text = reply_payload["reply"]

        chat_add_message(session_id, "bot", reply_text)
        chat_touch_session(session_id)
        return reply_payload
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat generation failed: {exc}") from exc


@app.post("/chat/clear")
def chat_clear(request: Request):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    user_id = get_user_id_from_session(session_id)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    chat_clear_session(user_id)
    return {"message": "Chat cleared"}


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
                # download_model_if_needed()
                pass

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
async def predict(
    request: Request,
    source: str = Form("single"),
    file: UploadFile = File(...),
):
    ensure_model_loaded()

    image_bytes = await file.read()
    processed_image = preprocess_image(image_bytes)

    predictions = tflite_predict(processed_image)
    confidence = float(np.max(predictions))
    predicted_index = int(np.argmax(predictions))
    predicted_category = class_labels[str(predicted_index)]

    user_id = get_user_id_from_session(request.cookies.get(SESSION_COOKIE_NAME))
    if user_id:
        source_norm = (source or "").strip()
        source_norm_lower = source_norm.lower()
        if source_norm_lower in ("camera", "single"):
            source_label = source_norm_lower
        elif source_norm_lower in ("zip", "zipfile", "zip_file", "bulk", "bulkzip"):
            source_label = "zipFile"
        else:
            # Backwards compatible default
            source_label = "single"
        record_scan(
            user_id,
            predicted_category,
            predicted_index,
            confidence,
            source=source_label,
        )

    return {
        "category": predicted_category,
        "wasteId": predicted_index,
        "confidence": round(confidence, 3)
    }


# --------------------- ZIP batch classification ---------------------
MAX_FILES = 500
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


async def process_batch(images_batch, paths_batch, output_dir, user_id: Optional[int]):
    scans_to_insert = []  # Reduce db writes: one batch insert per batch-size chunk.
    for i, img_array in enumerate(images_batch):
        img_array = np.expand_dims(img_array, axis=0).astype(np.float32)

        predictions = tflite_predict(img_array)
        predicted_confidence = float(np.max(predictions[0]))
        predicted_index = int(np.argmax(predictions[0]))
        label = class_labels[str(predicted_index)]

        destination_folder = os.path.join(output_dir, label)
        os.makedirs(destination_folder, exist_ok=True)

        original_name = os.path.basename(paths_batch[i])
        unique_name = f"{uuid.uuid4().hex[:6]}_{original_name}"

        shutil.copy2(paths_batch[i], os.path.join(destination_folder, unique_name))

        if user_id:
            scans_to_insert.append(
                (user_id, label, predicted_index, predicted_confidence, "zipFile")
            )

    if user_id and scans_to_insert:
        record_scans_many(scans_to_insert)


@app.post("/bulk_predict")
async def bulk_predict(request: Request, zipfile_upload: UploadFile = File(...)):
    ensure_model_loaded()
    user_id = get_user_id_from_session(request.cookies.get(SESSION_COOKIE_NAME))

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
                    await process_batch(images_batch, paths_batch, temp_output, user_id)
                    images_batch = []
                    paths_batch = []

            except Exception:
                continue

        # Process remaining
        if images_batch:
            await process_batch(images_batch, paths_batch, temp_output, user_id)

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