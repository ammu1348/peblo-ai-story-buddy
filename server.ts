import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy Gemini API client initializer
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set. Please configure it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Static Default Story and Quiz Endpoint
app.get("/api/story/default", (req, res) => {
  res.json({
    story: "Once upon a time, a clever little robot named Pip lost his shiny blue gear in the Whispering Woods...",
    quiz: {
      question: "What colour was Pip the Robot's lost gear?",
      options: ["Red", "Green", "Blue", "Yellow"],
      answer: "Blue"
    }
  });
});

// 2. Dynamic AI-Powered Story & Quiz Generator
// Generates a kid-friendly story based on a custom prompt/theme
app.post("/api/story/generate", async (req, res) => {
  try {
    const { theme } = req.body;
    const userTheme = theme || "a helpful robot";
    const ai = getGeminiClient();

    const prompt = `You are a kid-safe educational story companion for Peblo (an edutainment startup). 
Generate a short, delightful adventure story snippet for children aged 5-8 (2 or 3 sentences max, simple English vocabulary) based on the theme: "${userTheme}".
Follow the story up with an interactive multiple-choice quiz question based on a fun fact or plot point in your story.

You MUST respond with a JSON object strictly matching this schema:
{
  "story": "Once upon a time...", 
  "quiz": {
    "question": "What did Pip do?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option B"
  }
}

The "options" array length should be between 3 and 5. The "answer" MUST match exactly one of the choices in the "options" array.
Return ONLY raw stringified JSON. Do NOT wrap your output in markdown codeblocks (no \`\`\`json blocks).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            story: {
              type: Type.STRING,
              description: "The short narrated story text, 2 to 3 sentences, very kid-friendly."
            },
            quiz: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "The quiz question based on the story." },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "3 to 5 multiple choice answers."
                },
                answer: { type: Type.STRING, description: "The correct answer which must exist verbatim in the options." }
              },
              required: ["question", "options", "answer"]
            }
          },
          required: ["story", "quiz"]
        }
      }
    });

    const responseText = response.text || "";
    const parsedData = JSON.parse(responseText.trim());
    res.json(parsedData);
  } catch (err: any) {
    console.error("Gemini Generation Error:", err);
    res.status(500).json({
      error: "Could not generate AI story right now.",
      message: err.message || "An unexpected error occurred"
    });
  }
});

// 3. Premium Server-side Text-To-Speech Narration Endpoint (Optional Bonus fallback)
// Generates audio file as base64 from a text payload
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text payload is required for Text-To-Speech narration." });
      return;
    }
    
    const selectedVoice = voice || "Kore"; // Kore is a nice, friendly, youthful voice
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say cheerfully and warmly, as if reading a story to a child: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice }
          }
        }
      }
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.[0];
    if (audioPart && audioPart.inlineData && audioPart.inlineData.data) {
      res.json({
        audio: audioPart.inlineData.data,
        mimeType: audioPart.inlineData.mimeType || "audio/wav"
      });
    } else {
      throw new Error("No audio payload was returned by the TTS model.");
    }
  } catch (err: any) {
    console.error("Gemini TTS Error:", err);
    res.status(500).json({
      error: "Could not narrate story with Premium AI voice.",
      message: err.message || "TTS Service unavailable"
    });
  }
});

// 4. Vite Dev Server and Static Assets Routing Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
