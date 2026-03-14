
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const targetLanguage = 'Malayalam';
const text = JSON.stringify({ short_summary: "In the Arctic, animal parents face incredible challenges to survive and raise their young." });

async function test() {
    const prompt = `Translate the JSON values into ${targetLanguage}. Keep original keys and structure.
    Rules:
    1. Output ONLY valid JSON. 
    2. Never translate keys.
    3. Maintain factual accuracy.

    JSON: ${text}`;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: 'Return ONLY RAW JSON. No markdown. No prose. Translate values to Malayalam. Maintain JSON keys exactly.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0,
                max_tokens: 4000
            })
        });

        const data = await response.json();
        console.log('--- RAW RESPONSE FROM GROQ ---');
        console.log(JSON.stringify(data, null, 2));
        if (data.choices) {
            console.log('--- CHOICE CONTENT ---');
            console.log(data.choices[0].message.content);
        }
    } catch (err) {
        console.error('FAILED TO FETCH:', err);
    }
}

test();
