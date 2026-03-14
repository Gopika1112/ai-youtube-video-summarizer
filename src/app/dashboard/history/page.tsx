'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Summary } from '@/lib/types'
import Navbar from '@/components/Navbar'
import SummaryCard from '@/components/SummaryCard'
import SummaryModal from '@/components/SummaryModal'
import Toast from '@/components/Toast'
import { AnimatePresence, motion } from 'framer-motion'
import { History as HistoryIcon, Search, AlertCircle, Loader2 } from 'lucide-react'

export default function HistoryPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null)
    const [summaries, setSummaries] = useState<Summary[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null)
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/')
                return
            }
            setUser(user)
            fetchSummaries(user.id)
        }
        checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])

    const fetchSummaries = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('summaries')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })

            if (error) throw error
            setSummaries(data || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error('Error fetching summaries:', err)
            showToast('Failed to load history', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('summaries')
                .delete()
                .eq('id', id)

            if (error) throw error
            setSummaries(prev => prev.filter(s => s.id !== id))
            showToast('Intelligence redacted successfully', 'success')
        } catch {
            showToast('Failed to redact intelligence', 'error')
        }
    }

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    const filteredSummaries = summaries.filter(s =>
        s.video_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.short_summary.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    if (loading && !summaries.length) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0f172a] flex">
            <Navbar user={user} onSignOut={handleSignOut} />

            <main className="flex-1 py-12 pr-6 md:pr-12 space-y-12 pl-32 transition-all duration-300">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">
                            <HistoryIcon size={12} /> ARCHIVED INTELLIGENCE
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Knowledge <span className="text-blue-500">Vault</span></h1>
                        <p className="text-slate-400 font-medium text-lg max-w-xl">
                            Access your previously synthesized intelligence reports and strategic video analyses.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search your knowledge base..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1e293b] border border-[#334155] rounded-[20px] py-4 pl-12 pr-6 text-white placeholder-slate-600 transition-all focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 font-medium"
                        />
                    </div>
                </div>

                {/* Summaries Grid */}
                <AnimatePresence mode="popLayout">
                    {filteredSummaries.length > 0 ? (
                        <motion.div
                            layout
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                        >
                            {filteredSummaries.map((summary, index) => (
                                <SummaryCard
                                    key={summary.id}
                                    summary={summary}
                                    index={index}
                                    onClick={() => setSelectedSummary(summary)}
                                    onDelete={handleDelete}
                                    showToast={showToast}
                                />
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full"
                        >
                            {!summaries.length ? (
                                <div className="py-24 text-center space-y-6 bg-[#1e293b]/50 border border-[#1e293b] rounded-[40px] w-full">
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-500">
                                        <HistoryIcon size={40} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold text-white tracking-tight">Vault is Empty</h3>
                                        <p className="text-slate-400 font-medium">Start synthesizing videos to build your research library.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-32 text-center w-full">
                                    <div className="w-20 h-20 bg-[#1e293b] border border-[#334155] rounded-3xl flex items-center justify-center mb-6">
                                        <AlertCircle className="text-slate-600" size={32} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2">No intelligence records found</h3>
                                    <p className="text-slate-400 font-medium max-w-md">
                                        {searchTerm ? `No records matching "${searchTerm}" were found in the archive.` : "You haven't synthesized any videos yet. Start by generating a new summary."}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Modal & Toast */}
            <AnimatePresence>
                {selectedSummary && (
                    <SummaryModal
                        summary={selectedSummary}
                        onClose={() => setSelectedSummary(null)}
                        onDelete={handleDelete}
                        showToast={showToast}
                    />
                )}
            </AnimatePresence>

            {toast && <Toast message={toast.message} type={toast.type} />}
        </div>
    )
}
