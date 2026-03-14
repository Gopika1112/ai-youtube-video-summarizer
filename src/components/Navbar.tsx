'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, History, PlusCircle, Youtube, Settings } from 'lucide-react'

interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: any
    onSignOut: () => void
}

export default function Navbar({ user, onSignOut }: Props) {
    const [isHovered, setIsHovered] = useState(false)
    const pathname = usePathname()
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

    return (
        <motion.div 
            initial={false}
            animate={{ width: 80 }}
            className="fixed top-0 left-0 h-full bg-[#0f172a] border-r border-white/5 z-[100] p-4 flex flex-col items-center overflow-hidden"
        >
            {/* Brand/Logo */}
            <div className="mb-12">
                <Link href="/" className="flex items-center justify-center p-2 rounded-2xl transition-all h-12">
                    <div className="min-w-[48px] h-[48px] bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 shrink-0">
                        ▶
                    </div>
                </Link>
            </div>

            {/* Navigation Items */}
            <div className="flex flex-col gap-6 flex-1 items-center">
                <Link
                    href="/dashboard"
                    className={`flex items-center justify-center p-4 rounded-2xl transition-all h-14 w-14 ${
                        pathname === '/dashboard' 
                        ? 'bg-blue-600/10 border border-blue-600/20 text-blue-500' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <PlusCircle size={24} className="shrink-0" />
                </Link>
                <Link
                    href="/dashboard/history"
                    className={`flex items-center justify-center p-4 rounded-2xl transition-all h-14 w-14 ${
                        pathname === '/dashboard/history' 
                        ? 'bg-blue-600/10 border border-blue-600/20 text-blue-500' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                    <History size={24} className="shrink-0" />
                </Link>
                <button
                    className="flex items-center justify-center p-4 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all h-14 w-14"
                >
                    <Settings size={24} className="shrink-0" />
                </button>
                
                <div className="mt-auto pt-6 border-t border-white/5 flex flex-col items-center gap-6">
                   <button
                        onClick={onSignOut}
                        className="flex items-center justify-center p-4 rounded-2xl text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all h-14 w-14"
                    >
                        <LogOut size={24} className="shrink-0" />
                    </button>
                    
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0 flex items-center justify-center font-bold text-xs text-white">
                        {displayName[0].toUpperCase()}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
