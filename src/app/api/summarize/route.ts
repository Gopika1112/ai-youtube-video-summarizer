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

        // --- PROXY TO RENDER BACKEND ---
        // This solves CORS and YouTube blocking issues by using the Render environment
        const RENDER_BACKEND_URL = "https://youtube-summarizer-backend-8k4t.onrender.com/summarize"
        
        console.log(`[PROXY] Sending request to Render: ${videoUrl}`)
        
        const response = await fetch(RENDER_BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: videoUrl })
        })

        if (!response.ok) {
            const errorData = await response.json()
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
        console.error('[PROXY] Fatal Error:', error.message)
        return NextResponse.json({ 
            error: 'The synthesis server is currently under heavy load or warming up. Please try again in 30 seconds.' 
        }, { status: 500 })
    }
}
