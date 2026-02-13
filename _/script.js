const imageInput = document.getElementById("imageInput");
const preview = document.getElementById("preview");
const predictBtn = document.getElementById("predictBtn");
const result = document.getElementById("result");

let selectedImage = null;

imageInput.addEventListener("change", function () {
    const file = imageInput.files[0];

    if (!file) return;

    selectedImage = file;
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";

    result.textContent = "";
    predictBtn.disabled = false;
});

predictBtn.addEventListener("click", function () {
    // MOCK AI RESULT (backend will replace this)
    result.textContent = "Plastic Waste 🟦 — Dispose in Blue Bin";
});
