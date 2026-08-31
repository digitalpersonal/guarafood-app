import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB per file limit
  });

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
  app.post("/api/menu/import", upload.array("menuFiles", 50), async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    try {
      const parts: any[] = files.map(file => ({
        inlineData: {
          mimeType: file.mimetype,
          data: file.buffer.toString("base64"),
        },
      }));
      
      parts.push({
        text: "Extraia os itens do cardápio destes arquivos (fotos ou páginas). Eles compõem um cardápio unificado. Retorne um array JSON com todos os itens, cada item deve ter: categoria, nome, descricao, preco (number).",
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: parts,
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

      let responseText = response.text || "[]";
      responseText = responseText.replace(/^```json/m, '').replace(/```$/m, '').trim();
      const menuItems = JSON.parse(responseText);
      res.json(menuItems);
    } catch (error: any) {
      console.error("Error processing menu:", error);
      res.status(500).json({ error: error.message || "Falha interna ao processar imagens." });
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
