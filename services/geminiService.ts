
import { GoogleGenAI } from '@google/genai';

// Safely retrieve API key or use empty string to prevent crash in browser
// 'process' is not available in Vite/Browser by default
const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : '';

// Inicializa a instância da GoogleGenAI
const ai = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY' });

/**
 * Retorna a instância pré-configurada da GoogleGenAI.
 * @returns A instância da GoogleGenAI.
 */
export const getGeminiClient = () => ai;
