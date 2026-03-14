import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyA87ITtYlaGZUQxlF1Bnzxbhan_1loOoV8";
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  const modelName = "gemini-2.5-flash";
  try {
    console.log(`Testing model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello, respond in one word.");
    const response = await result.response;
    console.log(`SUCCESS: ${response.text()}`);
  } catch (err: any) {
    console.error(`FAILED ${modelName}: ${err.message}`);
    
    const altName = "models/gemini-2.5-flash";
    try {
        console.log(`Testing alt name: ${altName}`);
        const model = genAI.getGenerativeModel({ model: altName });
        const result = await model.generateContent("Hello, respond in one word.");
        const response = await result.response;
        console.log(`SUCCESS with alt: ${response.text()}`);
    } catch (err2: any) {
        console.error(`FAILED ${altName}: ${err2.message}`);
    }
  }
}

test();
