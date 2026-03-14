import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from 'groq-sdk';

// Initialize AI Engines
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const geminiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(geminiKey || 'dummy_key');

export async function translateText(text: string, targetLanguage: string) {
  const maxRetries = 3;
  let delay = 2000;

  // --- PRIMARY ENGINE: GROQ ---
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[GROQ] Attempting translation for ${targetLanguage} (Attempt ${attempt}/${maxRetries})`);
      
      const completion = await groq.chat.completions.create({
          messages: [
              {
                  role: "system",
                  content: `You are a professional software translation engine. You must translate the given input text natively to ${targetLanguage}.
                  
CRITICAL RULES:
1. Return ONLY the translation. NO conversational filler.
2. If the input is a JSON object string, TRANSLATE ONLY THE STRING VALUES. You MUST completely preserve the exact JSON syntax, brackets, structure, and property KEYS. 
3. If the input is raw text, output raw text.`
              },
              {
                  role: "user",
                  content: text
              }
          ],
          model: "llama-3.1-8b-instant",
          temperature: 0.1,
      });

      const translated = completion.choices[0]?.message?.content;
      if (translated) {
          console.log(`[GROQ] Translation successful`);
          return translated;
      }
      throw new Error("Empty response from Groq");

    } catch (err: any) {
      const isRateLimit = err.status === 429 || err.message?.includes('429');
      
      if (isRateLimit && attempt < maxRetries) {
        console.warn(`[GROQ] Rate limit hit. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }

      console.error("[GROQ] Translation Failed:", err.message);
      
      // --- FALLBACK ENGINE: GEMINI ---
      if (geminiKey && geminiKey !== 'dummy_key') {
          console.warn("[TRANSLATE] Groq exhausted. Engaging Gemini Fallback...");
          try {
              const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
              const prompt = `You are a specialized JSON translation engine.
              Translate the values in the following JSON object (or raw text) to ${targetLanguage}.
              
              CRITICAL RULES:
              1. Return ONLY the valid RAW JSON object or raw text. 
              2. DO NOT include any markdown code blocks (e.g., \`\`\`json).
              3. Keep all keys exactly as they are.
              
              Input:
              ${text}`;

              const result = await model.generateContent(prompt);
              const response = await result.response;
              const translatedGemini = response.text();
              
              if (translatedGemini) {
                  console.log("[GEMINI FALLBACK] Translation successful");
                  return translatedGemini;
              }
          } catch (geminiErr: any) {
              console.error("[GEMINI FALLBACK] Failed:", geminiErr.message);
              // If Gemini also hit a rate limit, throw a combined error
              if (geminiErr.status === 429 || geminiErr.message?.includes('429')) {
                  throw new Error(`Critical: Both Groq and Gemini hit rate limits. (Groq: ${err.message}, Gemini: ${geminiErr.message})`);
              }
              // Otherwise throw the Gemini error as it's the latest point of failure
              throw geminiErr;
          }
      }
      
      // If we reach here, either geminiKey was missing or it didn't return output
      throw err;
    }
  }
}
