const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const faceapi = require("face-api.js");
const canvas = require("canvas");

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Memory store
let registrations = [];

// Load models
const MODEL_PATH = path.resolve("C:/Users/sanch/backend/models");
Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH),
  faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH),
  faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_PATH),
]).then(() => {
  console.log("✅ FaceAPI models loaded from", MODEL_PATH);
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
  });
})
.catch(err => {
  console.error("❌ Model load error:", err);
});

function bufferFromBase64(base64) {
  return Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), "base64");
}

function imageFromBase64(base64) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = bufferFromBase64(base64);
  });
}

// 🔹 Orientation checker
app.post("/check-face", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.json({ orientation: "none" });

    const img = await imageFromBase64(image); // await now

    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks();

    if (!detection) return res.json({ orientation: "none" });

    const { landmarks } = detection;
    const nose = landmarks.getNose()[3];
    const leftEye = landmarks.getLeftEye()[0];
    const rightEye = landmarks.getRightEye()[3];

    const eyeDiff = rightEye.x - leftEye.x;
    const noseOffset = nose.x - (leftEye.x + eyeDiff / 2);

    let orientation = "front";
    if (noseOffset > 15) orientation = "left";
    if (noseOffset < -15) orientation = "right";

    res.json({ orientation });
  } catch (err) {
    console.error(err);
    res.json({ orientation: "none" });
  }
});

// 🔹 Registration
app.post("/register", async (req, res) => {
  const { studentId, firstName, middleInitial, surname, images } = req.body;

  let descriptors = [];

  for (let i of ["pic1", "pic2", "pic3"]) {
    const img = imageFromBase64(images[i]);
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (detection) descriptors.push(detection.descriptor);
  }

  registrations.push({ studentId, firstName, middleInitial, surname, descriptors });

  res.json({ message: `✔ Registered ${firstName} ${surname}` });
});

// 🔹 Login recognition
app.post("/login-recognize", async (req, res) => {
  const { image } = req.body;
  const img = imageFromBase64(image);

  const detection = await faceapi
    .detectSingleFace(img)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return res.json({ message: "❌ No face detected" });

  const queryDesc = detection.descriptor;
  let bestMatch = null;
  let bestDist = 1.0;

  for (let r of registrations) {
    for (let desc of r.descriptors) {
      const dist = faceapi.euclideanDistance(queryDesc, desc);
      if (dist < bestDist) {
        bestDist = dist;
        bestMatch = r;
      }
    }
  }

  if (bestMatch && bestDist < 0.6) {
    return res.json({ message: `✅ Welcome back, ${bestMatch.firstName} ${bestMatch.surname}` });
  }

  res.json({ message: "❌ Stranger detected" });
});
