
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const getSmartRecommendations = async (categories: string[], time: string, retries = 2): Promise<string | null> => {
  if (!process.env.API_KEY) {
    console.warn("Gemini: API_KEY não configurada.");
    return null;
  }

  try {
    const prompt = `Atue como um especialista em gastronomia local para o app GuaraFood. 
    Agora são ${time}. As categorias disponíveis são: ${categories.join(", ")}.
    Sugira de forma muito breve (um parágrafo) algo que combine com este horário em Guaranésia/MG. 
    Seja amigável e use emojis.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || null;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    // Se for erro de RPC ou rede, tenta novamente após um delay
    if (retries > 0 && (error.message?.includes('Rpc failed') || error.message?.includes('xhr error') || error.message?.includes('500'))) {
        await sleep(1500);
        return getSmartRecommendations(categories, time, retries - 1);
    }
    
    return null;
  }
};
