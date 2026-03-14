import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function translateText(text: string, targetLanguage: string) {
  // Ordered by verified availability via diagnostic check. Using full model paths for maximum compatibility.
  const models = [
    "models/gemini-2.5-flash",
    "models/gemini-2.0-flash", 
    "models/gemini-1.5-flash", 
    "models/gemini-2.5-pro",
    "models/gemini-1.5-pro"
  ];
  
  let lastError = null;

  for (const modelName of models) {
    try {
      console.log(`[GEMINI] Attempting translation with model: ${modelName} for ${targetLanguage}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      // If text is very long, it might fail. But summarizer handles chunking.
      const prompt = `Translate the following English text to ${targetLanguage}. 
      Only return the translated ${targetLanguage} text.
      
      IMPORTANT: If the input is a JSON string, translate the values but preserve the JSON structure and keys exactly.

      Text:
      ${text}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const translated = response.text();
      
      if (translated) return translated;
      
      throw new Error("Empty response from Gemini");
    } catch (err: any) {
      console.error(`[GEMINI] Model ${modelName} failed:`, err.message);
      lastError = err;
      
      const errLower = err.message?.toLowerCase() || "";
      // Robust check for 404/Not Found/Unsupported
      if (errLower.includes('404') || 
          errLower.includes('not found') || 
          errLower.includes('not supported') ||
          errLower.includes('invalid model')) {
        continue;
      }
      // For other errors (like 429), we might want to throw immediately to avoid spamming variants
      throw err;
    }
  }

  throw lastError || new Error("All Gemini models failed to translate");
}
