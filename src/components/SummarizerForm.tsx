'use client'

import { useState, useMemo } from 'react'
import { Youtube, Search, ArrowRight, Loader2, Sparkles, BrainCircuit, Zap, RefreshCw, Layers, Globe, Clock } from 'lucide-react'
import type { Summary } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import { extractVideoId } from '@/lib/utils'

interface Props {
    onSubmit: (url: string) => Promise<Summary | null>
}

export default function SummarizerForm({ onSubmit }: Props) {
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<Summary | null>(null)
    const [targetLanguage, setTargetLanguage] = useState('English')

    const LANGUAGES = [
        { label: 'English', code: 'English' },
        { label: 'Spanish', code: 'Spanish' },
        { label: 'French', code: 'French' },
        { label: 'German', code: 'German' },
        { label: 'Japanese', code: 'Japanese' },
        { label: 'Chinese', code: 'Chinese' },
        { label: 'Portuguese', code: 'Portuguese' },
        { label: 'Malayalam', code: 'Malayalam' },
    ]

    const videoId = useMemo(() => extractVideoId(url), [url])
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!url.trim()) return

        setLoading(true)
        setError('')
        try {
            const summary = await onSubmit(url)
            if (summary) {
                if (targetLanguage !== 'English') {
                    // Auto-translate if requested - Using the new robust Atomic Chunking logic
                    try {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const translateChunk = async (chunk: any, retries: number = 3): Promise<any> => {
                            for (let i = 0; i < retries; i++) {
                                try {
                                    const res = await fetch(`/api/translate`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ text: JSON.stringify(chunk), targetLanguage })
                                    })
                                    
                                    if (res.status === 429) {
                                        throw new Error('RATE_LIMIT')
                                    }
                                    
                                    const data = await res.json()
                                    if (!res.ok) throw new Error(data.error)
                                    return data.translatedData
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                } catch (err: any) {
                                    if (err.message === 'RATE_LIMIT') throw err // No retry for rate limits
                                    if (i === retries - 1) throw err
                                    console.warn(`[AUTO-TRANSLATE] Chunk failure, retry ${i+1}/${retries}...`)
                                    await new Promise(r => setTimeout(r, 1000 * (i + 1)))
                                }
                            }
                        }

                        // Helper to chunk text safely by character count (optimized for multi-byte scripts)
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const chunkText = (text: string, limit: number = 500): string[] => {
                            if (text.length <= limit) return [text]
                            const chunks: string[] = []
                            const parts = text.split(/([.!?।\n\r]+)/).filter(p => p.length > 0)
                            let currentChunk = ''

                            for (let i = 0; i < parts.length; i++) {
                                const part = parts[i]
                                if ((currentChunk + part).length > limit && currentChunk.length > 0) {
                                    chunks.push(currentChunk.trim())
                                    currentChunk = part
                                } else if (part.length > limit) {
                                    if (currentChunk) chunks.push(currentChunk.trim())
                                    currentChunk = ''
                                    const words = part.split(/\s+/)
                                    let temp = ''
                                    for (const word of words) {
                                        if ((temp + word).length > limit && temp.length > 0) {
                                            chunks.push(temp.trim())
                                            temp = word
                                        } else {
                                            temp += (temp ? ' ' : '') + word
                                        }
                                    }
                                    currentChunk = temp
                                } else {
                                    currentChunk += part
                                }
                            }
                            if (currentChunk) chunks.push(currentChunk.trim())
                            return chunks
                        }

                        console.log(`[AUTO-TRANSLATE] Starting speed-optimized sequential processing for ${targetLanguage}...`)
                        
                        // Helper to safely extract value from potentially non-JSON response
                        const getVal = (res: any, key: string) => {
                            if (res && typeof res === 'object' && res[key]) return res[key];
                            return typeof res === 'string' ? res : '';
                        }

                        // Use sequential processing to avoid hitting Gemini rate limits
                        // Section 0: Labels
                        const labelsInput = {
                            executive_summary: "Executive Summary",
                            key_takeaways: "Key Takeaways",
                            detailed_analysis: "Detailed Analysis",
                            strategic_insights: "Strategic Insights",
                            knowledge_timeline: "Knowledge Timeline",
                            ai_intelligence_report: "AI Intelligence Report",
                            generated_on: "Generated on",
                            source: "Source",
                            confidential: "Confidential • AI Generated"
                        };
                        const labelsRes = await translateChunk(labelsInput);

                        // Section 1: Meta
                        const metaRes = await translateChunk({ short_summary: summary.short_summary });
                        
                        // Section 2: Takeaways
                        const takeawaysRes = [];
                        for (const t of summary.key_takeaways) {
                            const res = await translateChunk({ t });
                            takeawaysRes.push(getVal(res, 't'));
                        }
                        
                        // Section 3: Insights
                        const insightsRes = [];
                        for (const ins of summary.important_insights) {
                            const res = await translateChunk({ ins });
                            insightsRes.push(getVal(res, 'ins'));
                        }
                        
                        // Section 4: Moments
                        const momentsRes = [];
                        for (const m of (summary.key_moments as any[])) {
                            const [tRes, dRes] = await Promise.all([
                                translateChunk({ title: m.title }),
                                translateChunk({ description: m.description })
                            ]);
                            momentsRes.push({ 
                                title: getVal(tRes, 'title'), 
                                description: getVal(dRes, 'description'), 
                                timestamp: m.timestamp 
                            });
                        }
                        
                        // Section 5: Detailed Summary
                        const paragraphs = summary.detailed_summary.split('\n\n').filter(p => p.trim());
                        const transParts = [];
                        for (const p of paragraphs) {
                            const r = await translateChunk({ p });
                            transParts.push(getVal(r, 'p'));
                        }
                        const translatedDetailed = transParts.join('\n\n');

                        setResult({ 
                            ...summary, 
                            short_summary: getVal(metaRes, 'short_summary'),
                            detailed_summary: translatedDetailed,
                            key_takeaways: takeawaysRes,
                            important_insights: insightsRes,
                            key_moments: momentsRes,
                            labels: labelsRes // Store labels in the state
                        } as any)
                    } catch (transErr: any) {
                        console.error('[AUTO-TRANSLATE] Failed:', transErr)
                        setError(transErr.message || 'Auto-translation encountered an issue')
                        setResult(summary) // Fallback to original
                    }
                } else {
                    setResult(summary)
                }
            }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.name === 'TypeError') {
                setError('Server is currently unavailable. Please try again later.')
            } else {
                setError(err.message || 'Error generating summary')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto w-full px-6">
            <AnimatePresence mode="wait">
                {!result && !loading ? (
                    <motion.div
                        key="input-state"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="py-12 md:py-24"
                    >
                        <div className="text-center space-y-8 mb-16">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-black uppercase tracking-[0.2em]"
                            >
                                <Sparkles size={14} /> INTELLIGENCE PORT
                            </motion.div>
                            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-none">
                                Synthesize <span className="text-blue-500">Knowledge</span>
                            </h1>
                            <p className="text-slate-400 text-xl max-w-2xl mx-auto font-medium leading-relaxed">
                                Deploy our AI agents to extract strategic insights and key takeaways from any video stream.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-[32px] blur opacity-25 group-focus-within:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                <div className="relative flex items-center bg-[#0f172a] border border-[#1e293b] rounded-[28px] overflow-hidden p-2 pl-6 focus-within:border-blue-500/50 transition-all">
                                    <div className="text-slate-500 group-focus-within:text-blue-500 transition-colors">
                                        <Youtube size={28} />
                                    </div>
                                    <input
                                        type="url"
                                        placeholder="Enter YouTube URL: https://youtube.com/watch?v=..."
                                        className="w-full bg-transparent border-none py-6 px-6 text-white placeholder-[#3d342d] outline-none font-medium text-lg"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                    />
                                    <div className="flex items-center gap-2 border-l border-white/5 pl-6 pr-4">
                                        <Globe size={20} className="text-slate-600" />
                                        <select 
                                            value={targetLanguage}
                                            onChange={(e) => setTargetLanguage(e.target.value)}
                                            className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
                                        >
                                            {LANGUAGES.map(lang => (
                                                <option key={lang.code} value={lang.code} className="bg-[#0f172a]">{lang.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={!url.trim()}
                                        className="bg-white text-black font-black h-16 px-10 rounded-[22px] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 text-lg shadow-xl"
                                    >
                                        Extract <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-6 flex items-center gap-2 text-red-400 font-bold bg-red-500/5 border border-red-500/10 p-4 rounded-2xl justify-center"
                                >
                                    <Zap size={16} /> {error}
                                </motion.div>
                            )}
                        </form>
                    </motion.div>
                ) : loading ? (
                    <motion.div
                        key="loading-state"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="py-12 flex flex-col items-center justify-center gap-10 text-center"
                    >
                        {thumbnailUrl && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative w-full max-w-lg aspect-video rounded-[32px] overflow-hidden border border-white/10 shadow-2xl"
                            >
                                <img 
                                    src={thumbnailUrl} 
                                    alt="Video Thumbnail" 
                                    className="w-full h-full object-cover grayscale-[40%] opacity-60"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-40 animate-pulse"></div>
                                        <div className="relative bg-[#1e293b]/80 backdrop-blur-md border border-blue-500/30 p-8 rounded-full">
                                            <Loader2 className="animate-spin text-blue-500" size={48} />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        
                        {!thumbnailUrl && (
                             <div className="relative">
                                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse"></div>
                                <div className="relative bg-[#1e293b] border border-blue-500/30 p-10 rounded-[40px]">
                                    <Loader2 className="animate-spin text-blue-500" size={64} />
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                                <Layers size={12} /> Data Extraction in Progress
                            </div>
                            <h2 className="text-3xl font-black tracking-tight text-white">Analyzing Signal...</h2>
                            <p className="text-slate-400 font-medium max-w-sm mx-auto leading-relaxed text-sm">
                                Deploying LLaMA 3.3 neural models to synthesize video intelligence from the stream.
                            </p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="result-state"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="py-12 space-y-12"
                    >
                        <div className="flex flex-col lg:flex-row gap-10 items-start">
                             <div className="relative w-full lg:w-1/3 aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-xl flex-shrink-0">
                                <img 
                                    src={result?.thumbnail_url || thumbnailUrl || ''} 
                                    alt={result?.video_title} 
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <a 
                                    href={result?.video_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="absolute bottom-4 right-4 p-2 bg-red-600 rounded-lg text-white hover:scale-110 transition-transform"
                                >
                                    <Youtube size={20} />
                                </a>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div className="flex flex-wrap gap-3">
                                    <div className="badge-premium bg-blue-500/10 text-blue-500 border-blue-500/20">
                                        Synthesis Complete
                                    </div>
                                    {(result as any)?._source === 'cache' && (
                                        <div className="badge-premium bg-amber-500/10 text-amber-500 border-amber-500/20 flex items-center gap-1.5">
                                            <Zap size={14} className="fill-current" /> Lightning Fast (Cached)
                                        </div>
                                    )}
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-tight">
                                    {result?.video_title}
                                </h2>
                                <button
                                    onClick={() => { setResult(null); setUrl('') }}
                                    className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors pt-2"
                                >
                                    <RefreshCw size={16} /> New Analysis
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-[#1e293b] border border-[#1e293b] rounded-[32px] p-10 space-y-8 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-500 group-hover:scale-110 transition-transform">
                                    <BrainCircuit size={120} />
                                </div>
                                <h3 className="text-xl font-bold text-blue-500 flex items-center gap-2">
                                    <Zap size={20} /> Executive Summary
                                </h3>
                                <p className="text-slate-400 leading-relaxed text-xl font-medium italic relative z-10">
                                    &quot;{result?.short_summary}&quot;
                                </p>
                            </div>

                            <div className="bg-[#1e293b] border border-[#1e293b] rounded-[32px] p-10 space-y-8">
                                <h3 className="text-xl font-bold text-teal-400 flex items-center gap-2">
                                    <Search size={20} /> Strategic Takeaways
                                </h3>
                                <ul className="space-y-6">
                                    {result?.key_takeaways.map((point, i) => (
                                        <li key={i} className="flex gap-4 items-start">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-teal-400/10 flex items-center justify-center text-teal-400 text-xs font-black">
                                                {i + 1}
                                            </div>
                                            <p className="text-slate-300 font-medium leading-relaxed">{point}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="bg-[#1e293b] border border-[#1e293b] rounded-[32px] p-10 space-y-8">
                            <h3 className="text-xl font-bold text-indigo-400 flex items-center gap-2">
                                <Sparkles size={20} /> Neural Insights
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {result?.important_insights.map((insight, i) => (
                                    <div key={i} className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex gap-4 text-slate-400 font-medium leading-relaxed">
                                        <div className="text-indigo-400 flex-shrink-0">
                                            <Sparkles size={20} />
                                        </div>
                                        {insight}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Knowledge Markers (Timestamps) Section */}
                        {result?.key_moments && result.key_moments.length > 0 && (
                            <div className="bg-[#1e293b] border border-[#1e293b] rounded-[32px] p-10 space-y-8">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                                        <Clock size={20} /> Knowledge Timeline
                                    </h3>
                                    <div className="text-[10px] font-black tracking-widest text-slate-600 uppercase">
                                        Chronological Markers
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {result.key_moments.map((moment, i) => (
                                        <div key={i} className="flex gap-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all group">
                                            <div className="flex flex-col gap-2">
                                                <a 
                                                    href={`${result.video_url}&t=${Math.floor(moment.timestamp)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-2 bg-blue-500/20 rounded-xl text-blue-400 font-mono font-bold text-xs flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-lg shadow-blue-500/10"
                                                >
                                                    {Math.floor(moment.timestamp / 60)}:{(moment.timestamp % 60).toString().padStart(2, '0')}
                                                </a>
                                                <div className="text-[8px] font-black text-slate-600 uppercase text-center tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Neural Memory
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm mb-1 text-white group-hover:text-blue-400 transition-colors">{moment.title}</h4>
                                                <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-2">{moment.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center pt-8">
                            <button
                                onClick={() => {
                                    window.location.href = '/dashboard/history'
                                }}
                                className="group flex items-center gap-4 bg-[#1e293b] border border-blue-500/20 hover:border-blue-500/50 text-white font-black py-4 px-10 rounded-2xl transition-all shadow-xl"
                            >
                                <Search size={20} className="text-blue-500" />
                                View in Knowledge Vault Archive
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
