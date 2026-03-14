export interface Summary {
    id: string
    user_id: string
    video_id: string
    video_url: string
    video_title: string
    thumbnail_url: string
    short_summary: string
    detailed_summary: string
    key_takeaways: string[]
    important_insights: string[]
    key_moments: KeyMoment[]
    created_at: string
    updated_at: string
}

export interface KeyMoment {
    timestamp: number
    title: string
    description: string
}

export interface SummaryResult {
    short_summary: string
    detailed_summary: string
    key_takeaways: string[]
    important_insights: string[]
    key_moments: KeyMoment[]
}

export interface TranscriptSegment {
    text: string
    offset: number
    duration: number
}

export interface VideoInfo {
    title: string
    thumbnail: string
    videoId: string
}
