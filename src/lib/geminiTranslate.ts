import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from 'groq-sdk';

// Initialize Gemini safely
const geminiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(geminiKey || 'dummy_key');

// Initialize Groq as fallback
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function translateText(text: string, targetLanguage: string) {
  let lastError = null;

  // Try Gemini First (If Key Exists)
  if (geminiKey && geminiKey !== 'dummy_key') {
    const models = [
      "models/gemini-2.0-flash", 
      "models/gemini-1.5-flash", 
      "models/gemini-1.5-flash-8b",
    ];
    
    for (const modelName of models) {
      try {
        console.log(`[GEMINI] Attempting translation with model: ${modelName} for ${targetLanguage}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        const prompt = `You are a specialized JSON translation engine.
        Translate the values in the following JSON object to ${targetLanguage}.
        
        CRITICAL RULES:
        1. Return ONLY the valid RAW JSON object. 
        2. DO NOT include any markdown code blocks (e.g., \`\`\`json).
        3. Do not include any conversational text.
        4. Keep all keys exactly as they are.
        5. Do not add any new keys.
        6. Translate the text naturally but accurately.
        
        Input to translate:
        ${text}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const translated = response.text();
        
        if (translated) return translated;
        
        throw new Error("Empty response from Gemini");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error(`[GEMINI] Model ${modelName} failed:`, err.message);
        lastError = err;
        
        const errLower = err.message?.toLowerCase() || "";
        
        // Break completely if key is leaked or forbidden
        if (errLower.includes('403') || errLower.includes('leaked') || errLower.includes('forbidden') || errLower.includes('api key not valid')) {
            console.warn("[GEMINI] API Key reported as restricted or leaked. Switching to Groq fallback...");
            break;
        }

        // Robust check for 404/Not Found/Unsupported -> continue to next model
        if (errLower.includes('404') || errLower.includes('not found') || errLower.includes('not supported') || errLower.includes('invalid model')) {
          continue;
        }
        
        // Break for API rate bounds or overload and fallback immediately rather than spamming
        break;
      }
    }
  } else {
    console.warn("[GEMINI] No valid API key found. Skipping Gemini models.");
  }

  // FALLBACK TO GROQ
  console.log(`[GROQ FALLBACK] Attempting translation with Groq Llama-3.3 for ${targetLanguage}`);
  try {
      const completion = await groq.chat.completions.create({
          messages: [
              {
                  role: "system",
                  content: `You are a professional software translation engine. You must translate the given input text natively to ${targetLanguage}.
                  
CRITICAL RULES:
1. Return ONLY the translation. NO conversational filler (e.g., "Here is the translation...").
2. If the input is a JSON object string, TRANSLATE ONLY THE STRING VALUES. You MUST completely preserve the exact JSON syntax, brackets, structure, and property KEYS. 
3. If the input is raw text, output raw text.`
              },
              {
                  role: "user",
                  content: text
              }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.1,
      });

      const translated = completion.choices[0]?.message?.content;
      if (translated) {
          console.log(`[GROQ FALLBACK] Translation successful`);
          return translated;
      }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (groqErr: any) {
      console.error("[GROQ FALLBACK] Failed:", groqErr.message);
      // If Groq fails too, log the Gemini error but throw the ACTUAL Groq error
      // so the user sees why the fallback failed.
      console.error("[GEMINI] Original Error:", lastError?.message);
      throw groqErr;
  }

  throw lastError || new Error("All translation engines failed");
}
