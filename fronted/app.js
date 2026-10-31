
const API_URL = "/api/upload";

const video = document.getElementById("video");
const canvas = document.getElementById("result");
const ctx = canvas.getContext("2d");

const modeSelect = document.getElementById("mode");
const cameraBtn = document.getElementById("cameraBtn");
const captureBtn = document.getElementById("captureBtn");
const resetBtn = document.getElementById("resetBtn");
const downloadBtn = document.getElementById("downloadBtn");
const uploadBtn = document.getElementById("uploadBtn");

let stream = null;
let photos = [];
let maxPhotos = 1;
let uploaded = false;
let uploading = false;

function status(message) {
  document.getElementById("status").textContent = message;
}

function updateCounter() {
  document.getElementById("counter").textContent =
    `Foto: ${photos.length} / ${maxPhotos}`;
}

async function startCamera() {
  try {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }

    status("Menghubungkan kamera...");
    cameraBtn.disabled = true;
    captureBtn.disabled = true;

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 960 }
      },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    document.getElementById("cameraPlaceholder").hidden = true;

    cameraBtn.disabled = false;
    captureBtn.disabled = false;

    status("Kamera aktif: " +
      stream.getVideoTracks()[0].label);

  } catch (error) {
    cameraBtn.disabled = false;
    captureBtn.disabled = true;

    status("Kamera gagal: " +
      error.name + " - " + error.message);

    console.error(error);
  }
}

function capturePhoto() {
  if (!stream || photos.length >= maxPhotos) return;

  const temp = document.createElement("canvas");
  temp.width = video.videoWidth;
  temp.height = video.videoHeight;

  const tempCtx = temp.getContext("2d");

  tempCtx.translate(temp.width, 0);
  tempCtx.scale(-1, 1);
  tempCtx.drawImage(video, 0, 0);

  photos.push(temp);
  updateCounter();

  if (photos.length === maxPhotos) {
    composePhotos();

    captureBtn.disabled = true;
    downloadBtn.disabled = false;
    uploadBtn.disabled = false;

    status("Foto selesai. Siap di-download atau di-upload.");
  } else {
    status("Foto berhasil. Ambil foto berikutnya.");
  }
}

function composePhotos() {
  const w = 600;
  const h = 450;
  const gap = 15;
  const pad = 25;

  canvas.width = w + pad * 2;
  canvas.height =
    h * maxPhotos + gap * (maxPhotos - 1) + pad * 2;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  photos.forEach((photo, index) => {
    ctx.drawImage(
      photo,
      pad,
      pad + index * (h + gap),
      w,
      h
    );
  });

  canvas.style.display = "block";
}

function resetPhotos() {
  if (uploading) return;

  photos = [];
  uploaded = false;

  canvas.style.display = "none";

  document.getElementById("qrPanel").hidden = true;
  document.getElementById("qrcode").innerHTML = "";

  downloadBtn.disabled = true;
  uploadBtn.disabled = true;
  uploadBtn.textContent = "Upload ke Google Drive";
  captureBtn.disabled = !stream;

  updateCounter();
  status("Siap mengambil foto.");
}

function downloadPhoto() {
  if (!photos.length || photos.length !== maxPhotos) return;

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "photobooth.png";
  link.click();
}

async function uploadPhoto() {
  if (uploading || uploaded || photos.length !== maxPhotos) return;

  uploading = true;
  uploadBtn.disabled = true;
  uploadBtn.textContent = "Sedang mengupload...";

  status("Mengirim foto ke Google Drive...");

  try {
    const image = canvas.toDataURL("image/jpeg", 0.85);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: image,
        mode: String(maxPhotos)
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Upload gagal.");
    }

    uploaded = true;

    document.getElementById("fileName").textContent =
      result.fileName;

    document.getElementById("driveLink").href =
      result.fileUrl;

    document.getElementById("qrPanel").hidden = false;

    const qr = document.getElementById("qrcode");
    qr.innerHTML = "";

    if (typeof QRCode !== "undefined") {
      new QRCode(qr, {
        text: result.fileUrl,
        width: 220,
        height: 220,
        correctLevel: QRCode.CorrectLevel.M
      });
    }

    uploadBtn.textContent = "Berhasil diupload";
    status("Upload berhasil. QR Code siap discan.");

  } catch (error) {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Coba Upload Lagi";
    status("Upload gagal: " + error.message);
    console.error(error);

  } finally {
    uploading = false;
  }
}

// EVENT
cameraBtn.addEventListener("click", startCamera);
captureBtn.addEventListener("click", capturePhoto);
resetBtn.addEventListener("click", resetPhotos);
downloadBtn.addEventListener("click", downloadPhoto);
uploadBtn.addEventListener("click", uploadPhoto);

modeSelect.addEventListener("change", () => {
  maxPhotos = Number(modeSelect.value);
  resetPhotos();
});

window.addEventListener("beforeunload", () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
});

updateCounter();
