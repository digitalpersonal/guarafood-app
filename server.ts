import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const upload = multer({ storage: multer.memoryStorage() });

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  app.use(express.json());

  // API route for menu import
  app.post("/api/menu/import", upload.single("menuFile"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const base64Data = req.file.buffer.toString("base64");
      
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: req.file.mimetype,
                data: base64Data,
              },
            },
            {
              text: "Extraia os itens do cardápio deste arquivo. Retorne um array JSON com os itens, cada item deve ter: categoria, nome, descricao, preco (number).",
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                categoria: { type: Type.STRING },
                nome: { type: Type.STRING },
                descricao: { type: Type.STRING },
                preco: { type: Type.NUMBER },
              },
              required: ["categoria", "nome", "preco"],
            },
          },
        },
      });

      const menuItems = JSON.parse(response.text || "[]");
      res.json(menuItems);
    } catch (error) {
      console.error("Error processing menu:", error);
      res.status(500).json({ error: "Failed to process menu" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
