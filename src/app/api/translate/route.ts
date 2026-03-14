import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { translateText } from "@/lib/geminiTranslate"
import crypto from 'crypto'

const generateHash = (text: string, lang: string) => {
    return crypto.createHash('sha256').update(text + lang).digest('hex');
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // Auth check
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { text, targetLanguage = 'Malayalam' } = await request.json()

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 })
        }

        // 1. Safety Trim (Reduce token usage)
        const safetyTrim = (str: string) => str.length > 3000 ? str.substring(0, 2997) + '...' : str;
        let processedText = safetyTrim(text);

        // 2. Check Cache first (Save API costs)
        const cacheHash = generateHash(processedText, targetLanguage);
        const { data: cached } = await supabase
            .from('translations')
            .select('translated_text')
            .eq('hash', cacheHash)
            .single();

        if (cached) {
            console.log('[TRANSLATE] Cache hit');
            const cachedVal = cached.translated_text;
            try {
                // If it's stored JSON, parse it for the UI
                const parsed = JSON.parse(cachedVal);
                return NextResponse.json({ 
                    translatedText: cachedVal,
                    translatedData: parsed 
                });
            } catch {
                return NextResponse.json({ translatedText: cachedVal });
            }
        }

        // 3. Call Gemini Translation Service
        console.log(`[TRANSLATE] Calling Google Gemini for ${targetLanguage}...`);
        const result = await translateText(processedText, targetLanguage);

        if (!result) {
            throw new Error(`Gemini failed to return a translation for ${targetLanguage}`);
        }

        // 4. Clean result (Remove markdown code blocks if any)
        let cleanedResult = result.trim();
        if (cleanedResult.startsWith('```json')) cleanedResult = cleanedResult.replace(/^```json/, '');
        if (cleanedResult.startsWith('```')) cleanedResult = cleanedResult.replace(/^```/, '');
        if (cleanedResult.endsWith('```')) cleanedResult = cleanedResult.replace(/```$/, '');
        cleanedResult = cleanedResult.trim();

        // 5. Save to Cache
        await supabase.from('translations').insert({
            hash: cacheHash,
            original_text: processedText,
            target_language: targetLanguage,
            translated_text: cleanedResult,
            user_id: user.id
        });

        // 6. Return response
        // We provide both translatedText (per requirement) and translatedData (for UI compatibility)
        let translatedData = null;
        try {
            translatedData = JSON.parse(cleanedResult);
        } catch (e) {
            // If not JSON, just return as text
            translatedData = cleanedResult;
        }

        return NextResponse.json({ 
            translatedText: cleanedResult,
            translatedData: translatedData
        });

    } catch (error: any) {
        console.error('Translation Route Error:', error)
        
        // Specific error for API limits
        if (error.status === 429 || error.message?.includes('429')) {
            return NextResponse.json({ 
                error: 'API Rate limit reached', 
                code: 'RATE_LIMIT' 
            }, { status: 429 });
        }

        return NextResponse.json({ 
            error: error.message || 'Translation failed',
            details: error.toString(),
            code: error.status === 404 ? 'MODEL_NOT_FOUND' : 'UNKNOWN_ERROR'
        }, { status: error.status || 500 });
    }
}
