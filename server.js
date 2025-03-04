require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 8080;

const allowedOrigins = ['http://localhost:3000', 'https://gemini-chat-image.netlify.app'];

// CORS konfigürasyonu
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.includes(origin)) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 204,
}));

// Express’in yerleşik body parser middleware'lerini kullanıyoruz
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// API Key kontrolü ve global instance oluşturma
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("API Key is undefined. Please check your .env file.");
  process.exit(1);
}
console.log("Using API Key:", apiKey);
const genAI = new GoogleGenerativeAI(apiKey);

// Üretim yapılandırmaları
const generationConfig = {
  stopSequences: [],
  maxOutputTokens: 2048,
  temperature: 0.2,
  topP: 0.95,
  topK: 1,
};

const generationConfig2 = {
  stopSequences: [],
  maxOutputTokens: 2048,
  temperature: 0.9,
  topP: 1,
  topK: 16,
};

// Yardımcı fonksiyon: İçerik üretimi
async function generateContent(modelName, config, prompt, extraParts = []) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: config,
  });
  const input = extraParts.length > 0 ? [prompt, ...extraParts] : prompt;
  const result = await model.generateContent(input);
  return result.response.text();
}

// Metin üretim endpoint'i
app.post("/api/generateContent", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Invalid or missing 'prompt' in the request body." });
    }
    const text = await generateContent("gemini-2.0-flash", generationConfig, prompt);
    res.json({ text });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Resim üretim endpoint'i
app.post("/api/generateImage", async (req, res) => {
  try {
    const { prompt, imageParts } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Invalid or missing 'prompt' in the request body." });
    }
    if (!imageParts) {
      return res.status(400).json({ error: "Missing 'imageParts' in the request body." });
    }
    // imageParts dizisi değilse diziye çeviriyoruz
    const parts = Array.isArray(imageParts) ? imageParts : [imageParts];
    const text = await generateContent("gemini-2.0-flash", generationConfig2, prompt, parts);
    res.json({ text });
  } catch (error) {
    console.error("Error generating image content:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
