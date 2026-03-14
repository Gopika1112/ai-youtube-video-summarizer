import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Groq from 'groq-sdk'
import { extractVideoId } from '@/lib/utils'
import type { SummaryResult, TranscriptSegment } from '@/lib/types'

// Neural Build ID: 1773432000000-V8.0

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MAX_CHUNK_CHARS = 10000 // Safer limit for TPM/RPM
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 2000 // 2 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

import { YoutubeTranscript } from 'youtube-transcript'
// @ts-expect-error No type definitions available for this module
import { getSubtitles } from 'youtube-captions-scraper'
import { fetchTranscript as manualFetch } from '@/lib/youtube'

// ─── Video Info & Transcript ──────────────────────────────────────────────────
import { execSync } from 'child_process'
import path from 'path'

// ─── Video Info & Transcript ──────────────────────────────────────────────────
async function getTranscript(videoId: string, videoUrl: string): Promise<{ text: string; segments: TranscriptSegment[]; title: string }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let transcriptData: any[] = []
    let engine = 'Primary'

    try {
        // Try Primary Engine: youtube-transcript
        console.log('[TRANSCRIPT] Attempting Primary Engine...');
        transcriptData = await YoutubeTranscript.fetchTranscript(videoId)
        if (transcriptData?.length) console.log('[TRANSCRIPT] Primary Engine Success!');
    } catch {
        console.warn('[TRANSCRIPT] Primary Engine Failed');
    }

    if (!transcriptData || transcriptData.length === 0) {
        try {
            // Try Secondary Engine: youtube-captions-scraper
            console.log('[TRANSCRIPT] Attempting Secondary Engine...');
            transcriptData = await getSubtitles({ videoID: videoId, lang: 'en' })
            if (transcriptData?.length) {
                engine = 'Secondary'
                console.log('[TRANSCRIPT] Secondary Engine Success!');
            }
        } catch {
            console.error('[TRANSCRIPT] Secondary Engine Failed');
        }
    }

    if (!transcriptData || transcriptData.length === 0) {
        // Engaging Final Neural Override: Manual Extraction
        console.log('[TRANSCRIPT] Engaging Manual Neural Override protocol...');
        try {
            const manualData = await manualFetch(videoId)
            if (manualData && manualData.length > 0) {
                transcriptData = manualData
                engine = 'Manual'
                console.log(`[TRANSCRIPT] Manual Override SUCCESS.`);
            }
        } catch {
            console.error('[TRANSCRIPT] Manual Override Failed');
        }
    }

    if (!transcriptData || transcriptData.length === 0) {
        console.log('[TRANSCRIPT] Engaging Multi-language Fallback...');
        for (const lang of ['en', 'hi', 'es', 'ml']) {
            try {
                transcriptData = await YoutubeTranscript.fetchTranscript(videoId, { lang })
                if (transcriptData && transcriptData.length > 0) {
                    engine = 'Primary'
                    break
                }
            } catch {
                continue
            }
        }
    }

    // --- NEW: yt-dlp Python Scraper Fallback ---
    if (!transcriptData || transcriptData.length === 0) {
        console.log('[TRANSCRIPT] Engaging yt-dlp Python Scraper Engine...');
        try {
            const scraperPath = path.join(process.cwd(), 'src/app/api/summarize/yt_dlp_scraper.py')
            const resultJson = execSync(`python "${scraperPath}" "${videoUrl}"`, { encoding: 'utf8' })
            const result = JSON.parse(resultJson)
            
            if (result && !result.error && result.segments?.length) {
                transcriptData = result.segments
                engine = 'yt-dlp'
                console.log('[TRANSCRIPT] yt-dlp Engine Success!');
            } else if (result.error) {
                console.warn('[TRANSCRIPT] yt-dlp Engine reported error:', result.error);
            }
        } catch (e: unknown) {
            console.error('[TRANSCRIPT] yt-dlp Engine Failed:', e instanceof Error ? e.message : String(e));
        }
    }

    if (!transcriptData || transcriptData.length === 0) {
        throw new Error('CAPTION_UNAVAILABLE')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const segments: TranscriptSegment[] = transcriptData.map((t: any) => ({
        text: t.text,
        offset: engine === 'Primary' ? t.offset / 1000 : (engine === 'Manual' || engine === 'yt-dlp' ? t.offset : parseFloat(t.start)),
        duration: engine === 'Primary' ? t.duration / 1000 : (engine === 'Manual' || engine === 'yt-dlp' ? t.duration : parseFloat(t.dur || '0'))
    }))

    const fullText = segments.map(s => s.text).join(' ')
    
    let title = 'YouTube Video'
    try {
        const oembed = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        const data = await oembed.json()
        title = data.title
    } catch {
        console.warn('Metadata fetch failed, using fallback title')
    }

    return { text: fullText, segments, title }
}


// ─── Transcript Processing ─────────────────────────────────────────────────────
function splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = []
    let i = 0
    while (i < text.length) {
        chunks.push(text.slice(i, i + chunkSize))
        i += chunkSize
    }
    return chunks
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callGroqWithRetry(messages: any[], responseFormat?: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastError: any;
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const completion = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant',
                messages,
                temperature: 0.3,
                max_tokens: 3000,
                response_format: responseFormat,
            })
            return completion.choices[0].message.content
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            lastError = error;
            // Handle Rate Limit (429) specially
            if (error.status === 429 || error.message?.includes('rate_limit')) {
                const delay = INITIAL_RETRY_DELAY * Math.pow(2, i) + Math.random() * 1000;
                console.warn(`[GROQ] Rate limit hit. Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${MAX_RETRIES})`);
                await sleep(delay);
                continue;
            }
            throw error; // Rethrow other errors
        }
    }
    throw lastError;
}

// ─── AI Summary Generation ─────────────────────────────────────────────────────
async function generateSummary(
    transcript: string,
    videoTitle: string
): Promise<SummaryResult> {
    const chunks = splitIntoChunks(transcript, MAX_CHUNK_CHARS)
    
    // If only one chunk, summarize it directly
    if (chunks.length === 1) {
        return await summarizeChunk(chunks[0], videoTitle)
    }

    // Multiple chunks: Summarize each then merge
    console.log(`[AI] Processing ${chunks.length} chunks...`)
    const chunkSummaries = []
    for (let i = 0; i < chunks.length; i++) {
        const s = await summarizeChunk(chunks[i], `${videoTitle} (Part ${i + 1})`)
        chunkSummaries.push(s)
    }

    // Final Merge Step
    console.log('[AI] Merging chunk summaries into final report...')
    const mergePrompt = `Analyze the following intermediate summaries of a YouTube video titled "${videoTitle}" and create a single, cohesive, high-quality final report.
    
    INTERMEDIATE SUMMARIES:
    ${chunkSummaries.map((s, i) => `PART ${i+1}:\n${s.short_summary}\n${s.detailed_summary}`).join('\n\n')}

    Return the final result in the exact same JSON format as requested before.`

    return await finalizeSummary(mergePrompt, videoTitle)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function summarizeChunk(text: string, title: string): Promise<any> {
    const prompt = `Summarize this portion of a video transcript.
    Video Title: "${title}"
    
    TRANSCRIPT PORTION:
    ${text}
    
    Return a JSON object with:
    {
      "short_summary": "1-2 sentence overview",
      "detailed_summary": "2-3 paragraphs of analysis",
      "key_takeaways": ["Takeaway 1", "Takeaway 2"],
      "important_insights": ["Insight 1"],
      "key_moments": [{"timestamp": number, "title": "...", "description": "..."}]
    }`

    const content = await callGroqWithRetry([{ role: 'user', content: prompt }], { type: 'json_object' })
    if (!content) throw new Error('AI failed to summarize chunk')
    return JSON.parse(content)
}

async function finalizeSummary(mergePrompt: string, videoTitle: string): Promise<SummaryResult> {
    const finalInstructions = `
    Return valid JSON with exactly these fields:
    {
      "short_summary": "2-3 sentence overview (as a single string)",
      "detailed_summary": "4-6 detailed paragraphs (as a single string with \\n for newlines, NOT an array)",
      "key_takeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3", "Takeaway 4", "Takeaway 5"],
      "important_insights": ["Insight 1", "Insight 2", "Insight 3", "Insight 4"],
      "key_moments": [
        {"timestamp": number_in_seconds, "title": "Moment Title", "description": "Short description"}
      ]
    }
    
    CRITICAL CONSTRAINTS:
    1. "detailed_summary" MUST be a single string.
    2. "timestamp" MUST be a numeric value in total seconds.
    3. Provide exactly 12 key_moments if the total content allows.`

    const content = await callGroqWithRetry([
        { role: 'system', content: `You are an expert summarizer for the video: ${videoTitle}` },
        { role: 'user', content: mergePrompt + '\n' + finalInstructions }
    ], { type: 'json_object' })

    if (!content) throw new Error('Final AI merge failed')
    const data = JSON.parse(content);

    // --- Post-Processing ---
    if (Array.isArray(data.detailed_summary)) data.detailed_summary = data.detailed_summary.join('\n\n');
    if (Array.isArray(data.key_moments)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.key_moments = data.key_moments.map((m: any) => {
            if (typeof m.timestamp === 'string' && m.timestamp.includes(':')) {
                const parts = m.timestamp.split(':').map(Number);
                let seconds = 0;
                if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
                else if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
                m.timestamp = seconds;
            }
            m.timestamp = Number(m.timestamp) || 0;
            return m;
        });
    }

    return data as SummaryResult
}

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(request: Request) {
    let videoIdForLog = 'unknown';
    try {
        console.log('--- [API] Summarization Request Received [V7.1-HIJACK-ACTIVE] ---')
        
        const supabase = await createClient()
        
        console.log('[API] Verifying Authentication...');
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.error('[API] Auth Failed:', authError?.message);
            return NextResponse.json({ error: 'Unauthorized. Please sign out and sign in again.' }, { status: 401 })
        }
        console.log('[API] Auth Success: user_id =', user.id);

        const { url } = await request.json()
        if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 })

        const videoId = extractVideoId(url)
        if (!videoId) return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
        videoIdForLog = videoId;

        console.log(`--- [API] Processing Video: ${videoId} ---`);

        // 1. Get Transcript
        console.log('[API] Step 1: Fetching transcript...');
        const { text, title } = await getTranscript(videoId, url);
        console.log('[API] Step 1 Success. Title:', title);

        // 2. Generate Summary
        console.log('[API] Step 2: Generating AI summary via Groq...');
        const summaryResult = await generateSummary(text, title);
        console.log('[API] Step 2 Success.');

        // 3. Save to DB
        console.log('[API] Step 3: Saving to Knowledge Vault...');
        const { data: savedSummary, error: dbError } = await supabase
            .from('summaries')
            .insert({
                user_id: user.id,
                video_id: videoId,
                video_url: url,
                video_title: title,
                thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                short_summary: summaryResult.short_summary,
                detailed_summary: summaryResult.detailed_summary,
                key_takeaways: summaryResult.key_takeaways,
                important_insights: summaryResult.important_insights,
                key_moments: summaryResult.key_moments,
            })
            .select()
            .single()

        if (dbError) {
            console.error('[API] DB Insert Error:', dbError.message);
            throw dbError;
        }

        console.log('[API] --- Process Complete ---');
        return NextResponse.json({ summary: savedSummary })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error(`--- [API] Fatal Error for ${videoIdForLog} ---`);
        console.error('Message:', error.message);
        console.error('Type:', error.name);
        
        let errorMessage = error.message || 'An unexpected error occurred';
        let statusCode = 500;

        if (error.message === 'CAPTION_UNAVAILABLE') {
            errorMessage = 'No transcript available for this video. Please try a video with Closed Captions (CC) or auto-generated subtitles enabled.';
            statusCode = 422;
        } else if (error.name === 'AbortError' || error.message?.includes('aborted')) {
            errorMessage = 'Request timed out. Please try again.';
            statusCode = 504;
        }

        return NextResponse.json({ error: errorMessage }, { status: statusCode })
    }
}
