import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'
import { YoutubeTranscript } from 'youtube-transcript'
// @ts-expect-error No type definitions available for this module
import { getSubtitles } from 'youtube-captions-scraper'
import { fetchTranscript as manualFetch } from '@/lib/youtube'

// Neural Build ID: 1773398900000-V7.0
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

import { execSync } from 'child_process'
import path from 'path'

async function getTranscript(videoId: string): Promise<string> {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let transcriptData: any[] = []

    try {
        console.log('[CHAT] Attempting Primary Engine...');
        transcriptData = await YoutubeTranscript.fetchTranscript(videoId)
        if (transcriptData?.length) console.log('[CHAT] Primary Engine Success!');
    } catch {
        console.warn('[CHAT] Primary Engine Failed');
    }

    if (!transcriptData || transcriptData.length === 0) {
        try {
            console.log('[CHAT] Attempting Secondary Engine...');
            transcriptData = await getSubtitles({ videoID: videoId, lang: 'en' })
            if (transcriptData?.length) {
                console.log('[CHAT] Secondary Engine Success!');
            }
        } catch {
            console.error('[CHAT] Secondary Engine Failed');
        }
    }

    if (!transcriptData || transcriptData.length === 0) {
        console.log('[CHAT] Engaging Manual Neural Override protocol...');
        try {
            const manual = await manualFetch(videoId)
            if (manual && manual.length > 0) {
                transcriptData = manual
                console.log('[CHAT] Manual Override SUCCESS.');
            }
        } catch {
            console.error('[CHAT] Manual Override Failed');
        }
    }

    if (!transcriptData || transcriptData.length === 0) {
        console.log('[CHAT] Engaging Multi-language Fallback...');
        for (const lang of ['en', 'hi', 'es']) {
            try {
                transcriptData = await YoutubeTranscript.fetchTranscript(videoId, { lang })
                if (transcriptData && transcriptData.length > 0) {
                    break
                }
            } catch {
                continue
            }
        }
    }

    // --- yt-dlp Python Scraper Fallback ---
    if (!transcriptData || transcriptData.length === 0) {
        console.log('[CHAT] Engaging yt-dlp Python Scraper Engine...');
        try {
            const scraperPath = path.join(process.cwd(), 'src/app/api/summarize/yt_dlp_scraper.py')
            const resultJson = execSync(`python "${scraperPath}" "${videoUrl}"`, { encoding: 'utf8' })
            const result = JSON.parse(resultJson)
            
            if (result && !result.error && result.segments?.length) {
                transcriptData = result.segments
                console.log('[CHAT] yt-dlp Engine Success!');
            }
        } catch (e: unknown) {
            console.error('[CHAT] yt-dlp Engine Failed:', e instanceof Error ? e.message : String(e));
        }
    }

    if (!transcriptData || transcriptData.length === 0) {
        return ''
    }

    return transcriptData.map((t) => t.text).join(' ')
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { message, videoId, history = [] } = await request.json()

        if (!message || !videoId) {
            return NextResponse.json({ error: 'Message and videoId are required' }, { status: 400 })
        }

        const transcript = await getTranscript(videoId)

        if (!transcript) {
            return NextResponse.json({ error: 'Could not retrieve video intelligence for chat.' }, { status: 422 })
        }

        const systemPrompt = `You are a helpful AI assistant specialized in analyzing YouTube videos. 
        You have access to the full transcript of the video the user is asking about.
        Answer questions specifically based on the provided transcript.
        If the answer is not in the transcript, say so politely.
        Keep responses concise and professional.
        
        VIDEO TRANSCRIPT:
        ${transcript.slice(0, 20000)}` 

        const messages = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: message }
        ]

        let aiResponse = null;
        let lastError = null;

        // Try Groq first
        try {
            const completion = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                messages: messages as any,
                temperature: 0.5,
                max_tokens: 1000,
            })
            aiResponse = completion.choices[0].message.content
        } catch (error: unknown) {
            lastError = error;
            const errorStr = JSON.stringify(error, Object.getOwnPropertyNames(error || {}));
            const isRateLimit = (error as {status?: number}).status === 429 || errorStr.includes('rate_limit') || errorStr.includes('quota');
            
            if (isRateLimit) {
                console.warn('[CHAT] Groq limit reached. Attempting Gemini SDK fallback...');
                
                // 1. Try Gemini SDK Direct
                if (process.env.GEMINI_API_KEY) {
                    try {
                        const { GoogleGenerativeAI } = await import("@google/generative-ai");
                        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
                        
                        const models = ["models/gemini-2.5-flash", "models/gemini-2.0-flash", "models/gemini-1.5-flash"];
                        let geminiText = null;

                        for (const mName of models) {
                            try {
                                console.log(`[CHAT-GEMINI] Attempting fallback with: ${mName}`);
                                const model = genAI.getGenerativeModel({ model: mName });
                                const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
                                const result = await model.generateContent(prompt);
                                geminiText = result.response.text();
                                if (geminiText) break;
                            } catch (me: unknown) {
                                const meLower = (me as {message?: string}).message?.toLowerCase() || "";
                                if (meLower.includes('404') || meLower.includes('not found')) continue;
                                throw me;
                            }
                        }
                        aiResponse = geminiText;
                    } catch (geminiErr) {
                        console.error('[CHAT] Gemini SDK failed:', geminiErr);
                    }
                }

                // 2. Try OpenRouter if Gemini fails/missing
                if (!aiResponse && process.env.OPENROUTER_API_KEY) {
                    try {
                        console.log('[CHAT] Attempting OpenRouter last-resort fallback...');
                        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: 'google/gemini-flash-1.5-8b',
                                messages: messages,
                                temperature: 0.5
                            })
                        });
                        const data = await response.json();
                        aiResponse = data.choices?.[0]?.message?.content;
                    } catch (fallbackErr) {
                        console.error('[CHAT] OpenRouter fallback failed:', fallbackErr);
                    }
                }
            }
        }

        if (!aiResponse) throw lastError || new Error('All AI providers failed to respond');

        return NextResponse.json({ response: aiResponse })
    } catch (error: unknown) {
        console.error('Chat Error:', error)
        return NextResponse.json({ error: (error as Error).message || 'Chat failed' }, { status: 500 })
    }
}
