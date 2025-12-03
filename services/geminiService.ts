import { GoogleGenAI } from '@google/genai';

// Inicializa a instância da GoogleGenAI uma única vez
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Retorna a instância pré-configurada da GoogleGenAI.
 * @returns A instância da GoogleGenAI.
 */
export const getGeminiClient = () => ai;
