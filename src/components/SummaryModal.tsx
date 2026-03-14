'use client'

import { useState, useEffect, useRef } from 'react'
import type { Summary, KeyMoment } from '@/lib/types'
import { formatTimestamp } from '@/lib/utils'
import { format } from 'date-fns'
import { generatePDF } from '@/lib/pdf'
import { motion } from 'framer-motion'
import {
    X, Copy, Download, Trash2, ExternalLink,
    BookOpen, CheckCircle2, Lightbulb, Clock,
    Layers, Layout, Globe, Languages, Loader2, MessageSquare, FileText
} from 'lucide-react'
import AudioChat from './AudioChat'

interface Props {
    summary: Summary
    onClose: () => void
    onDelete: (id: string) => void
    showToast: (message: string, type: 'success' | 'error') => void
}

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

export default function SummaryModal({ summary, onClose, onDelete, showToast }: Props) {
    const contentRef = useRef<HTMLDivElement>(null)
    const [loading, setLoading] = useState(false)
    const [translatedText, setTranslatedText] = useState("")
    const [targetLanguage, setTargetLanguage] = useState('English')
    const [activeTab, setActiveTab] = useState<'report' | 'chat'>('report')

    const parsedTranslatedData = translatedText ? (() => {
        try { return JSON.parse(translatedText); } catch { return null; }
    })() : null

    const currentSummary = parsedTranslatedData?.short_summary || summary.short_summary
    const currentDetailed = parsedTranslatedData?.detailed_summary || summary.detailed_summary
    const currentTakeaways = (parsedTranslatedData?.key_takeaways || summary.key_takeaways) as string[]
    const currentInsights = (parsedTranslatedData?.important_insights || summary.important_insights) as string[]
    const currentMoments = (parsedTranslatedData?.key_moments || summary.key_moments) as KeyMoment[]

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = ''
        }
    }, [onClose])

    const handleTranslate = async () => {
        if (targetLanguage === 'English') {
            setTranslatedText("")
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    text: JSON.stringify(summary),
                    targetLanguage 
                })
            })
            const data = await res.json()
            
            if (!res.ok) throw new Error(data.error)
            setTranslatedText(data.translatedText)
            showToast(`Translated to ${targetLanguage}`, 'success')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error(err)
            showToast(err.message || 'Translation failed', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleCopyAll = async () => {
        const text = [
            `# ${summary.video_title}`,
            `URL: ${summary.video_url}`,
            `Date: ${format(new Date(summary.created_at), 'MMM d, yyyy')}`,
            '',
            '## Short Summary',
            currentSummary,
            '',
            '## Detailed Summary',
            currentDetailed,
            '',
            '## Key Takeaways',
            ...currentTakeaways.map((t, i) => `${i + 1}. ${t}`),
            '',
            '## Important Insights',
            ...currentInsights.map((ins, i) => `${i + 1}. ${ins}`),
        ].join('\n')

        try {
            await navigator.clipboard.writeText(text)
            showToast('Full intelligence report copied!', 'success')
        } catch {
            showToast('Failed to copy', 'error')
        }
    }

    const handleDownloadPDF = async () => {
        try {
            showToast('Compiling PDF report...', 'success')
            
            // Construct a synchronized data object with the currently active language
            const currentData = {
                ...summary,
                short_summary: currentSummary,
                detailed_summary: currentDetailed,
                key_takeaways: currentTakeaways,
                important_insights: currentInsights,
                key_moments: currentMoments
            }

            // High-fidelity capture (preserves Hindi visually)
            if (contentRef.current && activeTab === 'report') {
                await generatePDF(currentData, contentRef.current)
            } else {
                // Background fallback (English-only if fonts missing)
                await generatePDF(currentData)
            }
            
            showToast('Intelligence Report Downloaded!', 'success')
        } catch (err) {
            console.error('PDF Generation Error:', err)
            showToast('PDF generation failed. Please try on the report tab.', 'error')
        }
    }

    const handleDelete = async () => {
        if (confirm('Permanently redact this intelligence report?')) {
            await onDelete(summary.id)
            onClose()
        }
    }

    const thumbnailUrl = summary.thumbnail_url || `https://img.youtube.com/vi/${summary.video_id}/mqdefault.jpg`

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-xl overflow-y-auto"
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="w-full max-w-4xl bg-bg-secondary border border-white/10 rounded-[32px] overflow-hidden shadow-2xl shadow-purple-500/10"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="relative h-[300px] overflow-hidden">
                    <img
                        src={thumbnailUrl}
                        alt={summary.video_title}
                        className="w-full h-full object-cover grayscale-[30%] opacity-60"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${summary.video_id}/mqdefault.jpg`
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent" />

                    {/* Controls Overlay */}
                    <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none">
                        <div className="badge-premium px-4 py-2 bg-black/40 backdrop-blur-md pointer-events-auto">
                            <Layers size={14} className="text-blue-400" />
                            <span>REPORT ID: {summary.id.slice(0, 8)}</span>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.1, rotate: 90 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={onClose}
                            className="w-12 h-12 bg-black/40 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white pointer-events-auto"
                        >
                            <X size={24} />
                        </motion.button>
                    </div>

                    {/* Metadata Content */}
                    <div className="absolute bottom-10 left-10 right-10">
                        <motion.h2
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-2xl md:text-4xl font-black font-display leading-[1.1] mb-6 tracking-tight text-balance"
                        >
                            {summary.video_title}
                        </motion.h2>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                                <Clock size={16} />
                                {format(new Date(summary.created_at), 'MMMM d, yyyy')}
                            </div>
                            <motion.a
                                whileHover={{ scale: 1.05 }}
                                href={summary.video_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="badge-premium bg-accent-purple text-white border-transparent"
                            >
                                <ExternalLink size={14} /> View Original Source
                            </motion.a>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-10 py-6 border-b border-white/5 bg-white/[0.02] flex items-center gap-4 flex-wrap">
                    <motion.button
                        whileHover={{ y: -2 }}
                        onClick={handleCopyAll}
                        className="btn-secondary py-2 px-6 rounded-xl text-sm"
                    >
                        <Copy size={16} /> Export Markdown
                    </motion.button>
                    <motion.button
                        whileHover={{ y: -2 }}
                        onClick={handleDownloadPDF}
                        className="btn-secondary py-2 px-6 rounded-xl text-sm border-accent-blue/20 text-accent-blue hover:bg-accent-blue/10"
                    >
                        <Download size={16} /> Full PDF Report
                    </motion.button>

                    <div className="flex items-center gap-3 bg-white/5 p-1 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2 px-3 text-slate-500">
                            <Languages size={14} />
                            <span className="text-[10px] font-black uppercase tracking-wider">Translate</span>
                        </div>
                        <select
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value)}
                            className="bg-transparent text-sm font-bold text-white focus:outline-none pr-4 cursor-pointer"
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code} className="bg-slate-900">{lang.label}</option>
                            ))}
                        </select>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleTranslate}
                            disabled={loading}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                                loading 
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20'
                            }`}
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                            {loading ? 'Translating...' : `Translate to ${targetLanguage}`}
                        </motion.button>
                    </div>

                    <div className="ml-auto flex items-center gap-4">
                        <div className="h-6 w-[1px] bg-white/10 hidden md:block" />
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={handleDelete}
                            className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                        >
                            <Trash2 size={18} />
                        </motion.button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-10 flex gap-8 border-b border-white/5 bg-white/[0.01]">
                    <button
                        onClick={() => setActiveTab('report')}
                        className={`py-4 transition-all relative font-black uppercase tracking-widest text-xs flex items-center gap-2 ${
                            activeTab === 'report' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <FileText size={14} /> Intelligence Report
                        {activeTab === 'report' && (
                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`py-4 transition-all relative font-black uppercase tracking-widest text-xs flex items-center gap-2 ${
                            activeTab === 'chat' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <MessageSquare size={14} /> Neural Chat (Audio Enabled)
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-1" />
                        {activeTab === 'chat' && (
                            <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-bg-secondary">
                    <div 
                        ref={contentRef} 
                        data-pdf-content="true"
                        className="p-10 bg-bg-secondary"
                    >
                        {activeTab === 'chat' ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="grid lg:grid-cols-2 gap-8"
                            >
                                {/* Neural Video Terminal */}
                                <div className="space-y-6">
                                    <div className="relative aspect-video rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black group">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${summary.video_id}?autoplay=0&rel=0`}
                                            className="absolute inset-0 w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                        <div className="absolute top-4 left-4">
                                            <div className="px-3 py-1 bg-red-600/20 backdrop-blur-md border border-red-500/30 rounded-lg flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-widest">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                Live Signal
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                                        <h4 className="text-sm font-bold text-white mb-2 line-clamp-1">{summary.video_title}</h4>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                            Synchronized neural link active. You can now analyze the video stream and chat with our intelligence agents simultaneously.
                                        </p>
                                    </div>
                                </div>
    
                                {/* Chat Interface */}
                                <AudioChat videoId={summary.video_id} videoTitle={summary.video_title} />
                            </motion.div>
                        ) : (
                            <div className="space-y-16">
                                {/* Executive Summary */}
                        <motion.section
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                        >
                        <div className="flex items-center gap-3 mb-6">
                            <Layout className="text-accent-purple" size={20} />
                            <h3 className="text-lg font-black font-display uppercase tracking-widest text-accent-purple/80">Executive Summary</h3>
                        </div>
                        <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-3xl text-lg text-slate-300 leading-relaxed font-medium">
                            {currentSummary}
                        </div>
                    </motion.section>

                    {/* Detailed Analysis */}
                    <motion.section
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <BookOpen className="text-blue-400" size={20} />
                            <h3 className="text-lg font-black font-display uppercase tracking-widest text-blue-400/80">Structural Analysis</h3>
                        </div>
                        <div className="grid gap-6 text-text-secondary leading-loose">
                            {currentDetailed.split('\n').filter(Boolean).map((para: string, i: number) => (
                                <p key={i} className="pl-4 border-l-2 border-white/5 bg-white/[0.01] p-4 rounded-r-xl">{para}</p>
                            ))}
                        </div>
                    </motion.section>

                    {/* Key Findings Grid */}
                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Takeaways */}
                        <motion.section
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <CheckCircle2 className="text-teal-400" size={20} />
                                <h3 className="text-lg font-black font-display uppercase tracking-widest text-teal-400/80">Key Takeaways</h3>
                            </div>
                            <div className="space-y-4">
                                {currentTakeaways.map((takeaway: string, i: number) => (
                                    <div key={i} className="flex gap-4 items-start p-5 bg-teal-500/5 border border-teal-500/10 rounded-2xl group transition-all hover:bg-teal-500/10 hover:border-teal-500/20">
                                        <div className="flex-shrink-0 w-6 h-6 bg-teal-500/20 rounded-lg flex items-center justify-center text-[10px] font-bold text-teal-400">
                                            {i + 1}
                                        </div>
                                        <p className="text-sm font-medium leading-relaxed">{takeaway}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.section>

                        {/* Insights */}
                        <motion.section
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <Lightbulb className="text-indigo-400" size={20} />
                                <h3 className="text-lg font-black font-display uppercase tracking-widest text-indigo-400/80">Strategic Insights</h3>
                            </div>
                            <div className="space-y-4">
                                {currentInsights.map((insight: string, i: number) => (
                                    <div key={i} className="flex gap-4 items-start p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl group transition-all hover:bg-indigo-500/10 hover:border-indigo-500/20">
                                        <Lightbulb size={20} className="text-indigo-400 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                                        <p className="text-sm font-medium leading-relaxed">{insight}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    </div>

                            {/* Key Moments */}
                            {currentMoments.length > 0 && (
                                <motion.section
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                >
                                    <div className="flex items-center gap-3 mb-8">
                                        <Clock className="text-blue-400" size={20} />
                                        <h3 className="text-lg font-black font-display uppercase tracking-widest text-blue-400/80">Knowledge Markers</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {currentMoments.map((moment: KeyMoment, i: number) => (
                                            <motion.div
                                                key={i}
                                                whileHover={{ x: 5 }}
                                                className="flex gap-4 p-5 bg-blue-500/5 border border-blue-500/10 rounded-2xl hover:bg-blue-500/10 transition-colors"
                                            >
                                                <a
                                                    href={`${summary.video_url}&t=${Math.floor(moment.timestamp)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-2 bg-blue-500/20 rounded-xl text-blue-400 font-mono font-bold text-xs self-start whitespace-nowrap"
                                                >
                                                    {formatTimestamp(moment.timestamp)}
                                                </a>
                                                <div>
                                                    <h4 className="font-bold text-sm mb-2 text-white">{moment.title}</h4>
                                                    <p className="text-xs text-slate-400 leading-relaxed">{moment.description}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.section>
                            )}
                            </div>
                        )}

                        {/* Malayalam Translation Display (Per USER Request) */}
                        {translatedText && (
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-16 pt-16 border-t border-white/5"
                            >
                                <div className="flex items-center gap-3 mb-6">
                                    <Globe className="text-blue-500" size={20} />
                                    <h3 className="text-lg font-black font-display uppercase tracking-widest text-blue-500/80">{targetLanguage} Translation</h3>
                                </div>
                                <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-3xl text-lg text-slate-300 leading-relaxed font-medium">
                                    {/* Handle both JSON and Raw Text formats */}
                                    {(() => {
                                        try {
                                            const parsed = JSON.parse(translatedText);
                                            return parsed.short_summary || translatedText;
                                        } catch {
                                            return translatedText;
                                        }
                                    })()}
                                </div>
                            </motion.section>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
