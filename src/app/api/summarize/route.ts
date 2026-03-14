import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const videoUrl = body.url

        if (!videoUrl) {
            return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
        }

        // Extract video ID for caching check
        let videoId = videoUrl;
        if (videoUrl.includes("v=")) {
            videoId = videoUrl.split("v=")[1].split("&")[0];
        } else if (videoUrl.includes("youtu.be/")) {
            videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
        }

        console.log(`[PROXY] Checking cache for video: ${videoId}`)
        
        // 1. READ-ASIDE CACHE: Check if we already have this summary in the DB
        const { data: existingSummary } = await supabase
            .from('summaries')
            .select('*')
            .eq('video_id', videoId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (existingSummary) {
            console.log(`[PROXY] Cache Hit for video: ${videoId}`)
            return NextResponse.json({ summary: existingSummary, source: 'cache' })
        }

        // --- PROXY TO BACKEND ---
        const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://youtube-summarizer-backend-8k4t.onrender.com"
        const SUMMARIZE_ENDPOINT = `${BACKEND_BASE_URL.replace(/\/$/, '')}/summarize`
        
        console.log(`[PROXY] Cache Miss. Sending request to Backend: ${SUMMARIZE_ENDPOINT}`)
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // Increased to 120s to match backend timeout

        try {
            const response = await fetch(SUMMARIZE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: videoUrl }),
                signal: controller.signal
            })

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText };
                }
                console.error('[PROXY] Render Error:', errorData)
                return NextResponse.json({ error: errorData.error || 'Backend synthesis failed' }, { status: response.status })
            }

            const data = await response.json()
            const summaryResult = data.summary

        // --- SAVE TO SUPABASE ---
        // We still save to the database here to keep the user's history in Next.js
        const { data: savedSummary, error: dbError } = await supabase
            .from('summaries')
            .insert({
                user_id: user.id,
                video_id: data.video_id,
                video_url: videoUrl,
                video_title: summaryResult.video_title,
                thumbnail_url: `https://img.youtube.com/vi/${data.video_id}/maxresdefault.jpg`,
                short_summary: summaryResult.short_summary,
                detailed_summary: summaryResult.detailed_summary,
                key_takeaways: summaryResult.key_takeaways,
                important_insights: summaryResult.important_insights,
                key_moments: summaryResult.key_moments,
            })
            .select()
            .single()

        if (dbError) {
            console.error('[PROXY] DB Save Error:', dbError.message)
            return NextResponse.json({ error: 'Failed to save summary to vault' }, { status: 500 })
        }

        return NextResponse.json({ summary: savedSummary })

        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                return NextResponse.json({ error: 'Neural synthesis timed out. The video might be too long or the server is busy.' }, { status: 504 })
            }
            throw error;
        }

    } catch (error: any) {
        console.error('[PROXY] Fatal Error:', error.message)
        return NextResponse.json({ 
            error: error.message || 'The synthesis server is currently under heavy load or warming up.' 
        }, { status: 500 })
    }
}
