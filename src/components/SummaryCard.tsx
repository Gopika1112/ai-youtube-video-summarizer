'use client'

import { format } from 'date-fns'
import type { Summary } from '@/lib/types'
import { motion } from 'framer-motion'
import { Youtube, Calendar, ArrowUpRight, Trash2 } from 'lucide-react'

interface Props {
    summary: Summary
    index: number
    onClick: () => void
    onDelete: (id: string, e: React.MouseEvent) => void
    showToast: (message: string, type: 'success' | 'error') => void
}

export default function SummaryCard({ summary, index, onClick, onDelete }: Props) {
    const dateFormatted = format(new Date(summary.created_at), 'MMM d, yyyy')

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -5 }}
            onClick={onClick}
            className="group relative bg-white border border-slate-100 rounded-3xl p-8 cursor-pointer transition-all hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 shadow-sm"
        >
            <div className="flex flex-col space-y-6">
                {/* Header: Date and Platform */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <Calendar size={14} />
                        {dateFormatted}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full text-red-500 text-[10px] font-bold uppercase tracking-widest">
                        <Youtube size={12} />
                        YouTube
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-slate-800 line-clamp-2 leading-tight group-hover:text-blue-500 transition-colors">
                    {summary.video_title}
                </h3>

                {/* Preview Text */}
                <p className="text-sm text-slate-500 line-clamp-3 font-medium leading-relaxed">
                    {summary.short_summary}
                </p>

                {/* Footer Actions */}
                <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-blue-500 text-[11px] font-black uppercase tracking-widest">
                        View Analysis <ArrowUpRight size={14} />
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Permanently redact this intelligence record?')) {
                                onDelete(summary.id, e)
                            }
                        }}
                        className="p-2.5 rounded-xl bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </motion.div>
    )
}
