import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

// In-memory storage for uploaded files using multer
const upload = multer({ dest: 'uploads/' });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/import-menu", upload.array("files"), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const uploadedParts: any[] = [];
      const failedFiles: string[] = [];
      
      for (const file of files) {
        try {
          // Upload the file to the Gemini API
          const uploadedFile = await ai.files.upload({
            file: file.path,
            mimeType: file.mimetype,
          });
          
          uploadedParts.push({ file, uploadedFile });
        } catch (e) {
          failedFiles.push(file.originalname);
        }
      }

      const activeParts = [];
      // Wait for all files to be ACTIVE if necessary (especially for PDFs or large files)
      for (const part of uploadedParts) {
        try {
          let fileInfo = await ai.files.get({ name: part.uploadedFile.name });
          while (fileInfo.state === 'PROCESSING') {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            fileInfo = await ai.files.get({ name: part.uploadedFile.name });
          }
          if (fileInfo.state === 'FAILED') {
            failedFiles.push(part.file.originalname);
          } else {
            activeParts.push(part.uploadedFile);
          }
        } catch(e) {
            failedFiles.push(part.file.originalname);
        }
      }

      if (activeParts.length === 0) {
          return res.status(400).json({ error: "Nenhum arquivo pôde ser processado." });
      }

      // Process in batches to handle many files safely and maintain stability
      const BATCH_SIZE = 5;
      const allExtractedData: any[] = [];

      for (let i = 0; i < activeParts.length; i += BATCH_SIZE) {
        const batch = activeParts.slice(i, i + BATCH_SIZE);
        const batchPrompt = `
          You are an intelligent system that extracts menu information from images and PDFs.
          (Note: the Gemini API natively processes PDFs page-by-page, while images are processed as individual files).
          I am giving you a batch of ${batch.length} file(s) that represent parts of a restaurant menu.
          Extract the categories and items.
          
          Rules:
          1. Extract categories (e.g., Hamburgers, Pizzas, Drinks).
          2. Extract items for each category with their name, description (if any), and price.
          3. Return the response ONLY as a JSON array of categories. Each category object should have:
             - name (string)
             - items (array of objects):
               - name (string)
               - description (string or empty string)
               - price (number)
          
          DO NOT return markdown, DO NOT return anything outside the JSON array.
        `;

        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: [...batch, batchPrompt],
            config: { responseMimeType: "application/json" }
          });
          
          const text = response.text;
          if (text) {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
              allExtractedData.push(...parsed);
            }
          }
        } catch (e) {
          console.error(`Error processing batch ${i/BATCH_SIZE + 1}:`, e);
          // Continue with the next batch, don't fail the whole import
        }
      }

      // Final Consolidation Pass: Merge categories, remove duplicates
      let menuData = [];
      if (allExtractedData.length > 0) {
        const consolidationPrompt = `
          You are a data consolidation expert for restaurant menus.
          I am providing you with a JSON array containing extracted menu categories and items from different batches of files.
          Your task is to merge this data into a single, cohesive menu, eliminating duplicates.
          
          Rules:
          1. Merge categories with the same or very similar names (e.g., "Hambúrgueres" and "Hamburgueres", "Bebidas" and "Bebidas Geladas").
          2. Remove duplicate products. If the same item appears multiple times with the same name and similar price, keep only one. Pay attention to slight typos (e.g., "X-Bacon" vs "X Bacon").
          3. Consolidate into a single JSON array of categories. Each category object should have:
             - name (string)
             - items (array of objects):
               - name (string)
               - description (string or empty string)
               - price (number)
               
          DO NOT return markdown, DO NOT return anything outside the JSON array.
          
          Data to consolidate:
          ${JSON.stringify(allExtractedData)}
        `;

        try {
          const consolidationResponse = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: [consolidationPrompt],
            config: { responseMimeType: "application/json" }
          });
          
          const consolidatedText = consolidationResponse.text;
          if (consolidatedText) {
            menuData = JSON.parse(consolidatedText);
          }
        } catch (e) {
          console.error("Error during consolidation phase:", e);
          menuData = allExtractedData; // Fallback to raw extracted data if consolidation fails
        }
      }

      // Cleanup local files
      for (const file of files) {
        fs.unlinkSync(file.path);
      }

      res.json({ categories: menuData, failedFiles });
    } catch (error: any) {
      console.error("Error processing menu files:", error);
      res.status(500).json({ error: "An error occurred while processing the files." });
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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
