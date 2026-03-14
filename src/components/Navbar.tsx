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
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            initial={false}
            animate={{ width: isHovered ? 280 : 80 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 h-full bg-[#0f172a] border-r border-white/5 z-[100] p-4 flex flex-col overflow-hidden"
        >
            {/* Brand/Logo */}
            <div className="mb-12">
                <Link href="/" className="flex items-center gap-4 p-2 rounded-2xl transition-all h-12">
                    <div className="min-w-[48px] h-[48px] bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 shrink-0">
                        ▶
                    </div>
                    <motion.div 
                        animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                        className="whitespace-nowrap overflow-hidden"
                    >
                        <div className="text-white font-black text-sm tracking-tight leading-none mb-1 uppercase">Intelligence</div>
                        <div className="text-blue-500 font-black text-sm tracking-tight leading-none uppercase">Port</div>
                    </motion.div>
                </Link>
            </div>

            {/* Navigation Items */}
            <div className="flex flex-col gap-3 flex-1">
                <Link
                    href="/dashboard"
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm h-14 ${
                        pathname === '/dashboard' 
                        ? 'bg-blue-600/10 border border-blue-600/20 text-blue-500' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
                    }`}
                >
                    <PlusCircle size={24} className="shrink-0" />
                    <motion.span 
                        animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                        className="whitespace-nowrap"
                    >
                        Extract Summary
                    </motion.span>
                </Link>
                <Link
                    href="/dashboard/history"
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all font-bold text-sm h-14 ${
                        pathname === '/dashboard/history' 
                        ? 'bg-blue-600/10 border border-blue-600/20 text-blue-500' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
                    }`}
                >
                    <History size={24} className="shrink-0" />
                    <motion.span 
                        animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                        className="whitespace-nowrap"
                    >
                        Knowledge Vault
                    </motion.span>
                </Link>
                <button
                    className="flex items-center gap-4 p-4 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all font-bold text-sm h-14 border border-transparent"
                >
                    <Settings size={24} className="shrink-0" />
                    <motion.span 
                        animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                        className="whitespace-nowrap"
                    >
                        Preferences
                    </motion.span>
                </button>
                
                <div className="mt-auto pt-6 border-t border-white/5 space-y-4 overflow-hidden">
                    <div className="px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0 flex items-center justify-center font-bold text-xs text-white">
                                {displayName[0].toUpperCase()}
                            </div>
                            <motion.div 
                                animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                                className="text-white font-bold truncate text-sm"
                            >
                                {displayName}
                            </motion.div>
                        </div>
                    </div>

                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all font-bold text-sm"
                    >
                        <LogOut size={24} className="shrink-0" />
                        <motion.span 
                            animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
                        >
                            Sign Out
                        </motion.span>
                    </button>
                </div>
            </div>
        </motion.div>
    )
}
