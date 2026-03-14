import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY not found in .env.local");
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // There isn't a direct listModels in the high-level SDK easily accessible for debugging without raw fetch usually
    // but we can try to hit a known simple one or use a more specific model name.
    console.log("Testing model availability...");
    
    // Most reliable names for v1beta as per docs
    const testModels = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
      "gemini-2.0-flash-exp",
      "gemini-2.0-flash",
      "models/gemini-1.5-flash",
      "models/gemini-1.5-pro"
    ];

    for (const m of testModels) {
      try {
        const model = genAI.getGenerativeModel({ model: m });
        // Just try a very small request
        const result = await model.generateContent("hi");
        console.log(`✅ Model ${m} is AVAILABLE`);
        break; // Stop at first success
      } catch (err: any) {
        console.log(`❌ Model ${m} FAILED: ${err.message}`);
      }
    }
  } catch (error) {
    console.error("List failed:", error);
  }
}

listModels();
