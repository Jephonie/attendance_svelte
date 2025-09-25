const express = require("express");
const cors = require("cors");
//hello world
const app = express();
const PORT = 3000;

const fs = require("fs");
const path = require("path");

app.use(cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Temporary in-memory storage (resets when server restarts)
let registrations = [];

app.post("/register", (req, res) => {
  const { firstName, middleInitial, surname, subjectCode, section, images } = req.body;

  // Check duplicate
  const exists = registrations.find(
    (r) =>
      r.firstName.toLowerCase() === firstName.toLowerCase() &&
      r.surname.toLowerCase() === surname.toLowerCase()
  );

  if (exists) {
    return res
      .status(400)
      .json({ message: `❌ ${firstName} ${surname} is already registered` });
  }

  // Save new record (no images here, just metadata)
  const studentId = `${firstName}_${surname}_${Date.now()}`;
  registrations.push({ studentId, firstName, middleInitial, surname, subjectCode, section });

  // Save images if provided
  if (images && images.pic1 && images.pic2 && images.pic3) {
    const folder = path.join(__dirname, "faces");
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

    fs.writeFileSync(path.join(folder, `${studentId}_1.png`), images.pic1.replace(/^data:image\/png;base64,/, ""), "base64");
    fs.writeFileSync(path.join(folder, `${studentId}_2.png`), images.pic2.replace(/^data:image\/png;base64,/, ""), "base64");
    fs.writeFileSync(path.join(folder, `${studentId}_3.png`), images.pic3.replace(/^data:image\/png;base64,/, ""), "base64");

    console.log(`📸 Saved 3 face images for ${studentId}`);
  }

  res.json({ message: `✔ Registered ${firstName} ${surname} with 3 face captures` });
});

app.post("/login-recognize", (req, res) => {
  const { image } = req.body;

  // TODO: Run face-api or your recognition logic here
  // Example dummy logic:
  const isRecognized = Math.random() > 0.5; // replace with real check

  if (isRecognized) {
    res.json({ message: "✅ Welcome back, Registered Student!" });
  } else {
    res.json({ message: "❌ Stranger detected" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
