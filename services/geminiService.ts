import { GoogleGenAI, Type } from "@google/genai";
import { TicketExtractionResult } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize Gemini Client
// Note: In a production app, never expose API keys on the client side.
const ai = new GoogleGenAI({ apiKey });

export const extractTicketData = async (base64Image: string): Promise<TicketExtractionResult> => {
  if (!apiKey) {
    console.warn("API Key is missing. Returning nulls.");
    return { date: null, amount: null };
  }

  try {
    const model = 'gemini-2.5-flash';
    
    // Construct the prompt
    const prompt = `Analiza la imagen adjunta, que es un comprobante de pago, ticket o recibo bancario.
    Extrae la fecha de la transacción y el monto total pagado.
    Si la fecha es ambigua, prefiere el formato más reciente.
    Responde estrictamente en formato JSON.`;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming JPEG for simplicity, though could be PNG
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "La fecha en formato YYYY-MM-DD" },
            amount: { type: Type.NUMBER, description: "El monto total numérico" }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");

    const result = JSON.parse(text) as TicketExtractionResult;
    return result;

  } catch (error) {
    console.error("Error extracting ticket data with Gemini:", error);
    return { date: null, amount: null };
  }
};
