const express = require("express");
const cors = require("cors");
const { createWorker } = require("tesseract.js");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    console.log("[OCR] Creating Tesseract worker (ind+eng)...");
    workerPromise = createWorker("ind+eng");
    const w = await workerPromise;
    console.log("[OCR] Worker ready");
  }
  return workerPromise;
}

// Pre-warm on startup
getWorker().catch(err => console.error("[OCR] Warm-up error:", err.message));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.post("/ocr", async (req, res) => {
  try {
    const { image, language } = req.body;
    if (!image) {
      res.status(400).json({ error: "Missing 'image' (base64)" });
      return;
    }

    const buffer = Buffer.from(image, "base64");
    if (buffer.length < 100) {
      res.status(400).json({ error: "Image too small" });
      return;
    }

    const worker = await getWorker();

    // If a different language requested, create a one-off worker
    const useWorker = language && language !== "ind+eng"
      ? await createWorker(language)
      : worker;

    const { data } = await useWorker.recognize(buffer);

    if (useWorker !== worker) {
      await useWorker.terminate();
    }

    res.json({
      text: data.text || "",
      confidence: data.confidence || 0,
      words: data.words?.length || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, () => {
  console.log(`[OCR Service] running on port ${PORT}`);
});
