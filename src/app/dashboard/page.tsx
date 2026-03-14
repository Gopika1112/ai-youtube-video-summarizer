'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

import SummarizerForm from '@/components/SummarizerForm'
import Navbar from '@/components/Navbar'

export default function DashboardPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
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
            setLoading(false)
        }
        checkUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])

    const handleNewSummary = async (videoUrl: string) => {
        try {
            const res = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: videoUrl }),
            })
            
            const data = await res.json()
            
            if (!res.ok) {
                if (res.status === 401 || data.error === 'Unauthorized') {
                    throw new Error('Session expired. Please sign out and sign in again.')
                }
                throw new Error(data.error || 'Failed to generate summary')
            }
            
            return data.summary
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            if (err.name === 'AbortError') {
                throw new Error('Neural synthesis timed out. The video might be too long or the AI is under heavy load. Please try again.')
            }
            console.error('Full Extraction Error:', err);
            throw err;
        }
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Navbar user={user} onSignOut={handleSignOut} />
            <main className="flex-1 flex flex-col items-center py-10 pl-32 transition-all duration-300">
                <SummarizerForm onSubmit={handleNewSummary} />
            </main>
        </div>
    )
}
