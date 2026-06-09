const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.post("/ocr", async (req, res) => {
  try {
    const { image, language = "ind+eng" } = req.body;
    if (!image) {
      res.status(400).json({ error: "Missing 'image' (base64)" });
      return;
    }

    const buffer = Buffer.from(image, "base64");
    if (buffer.length < 100) {
      res.status(400).json({ error: "Image too small" });
      return;
    }

    const { createWorker } = require("tesseract.js");
    const worker = await createWorker(language);
    const { data } = await worker.recognize(buffer);
    await worker.terminate();

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
