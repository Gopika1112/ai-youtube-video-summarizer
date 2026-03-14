'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, History, PlusCircle, Youtube } from 'lucide-react'

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
            className="fixed top-0 left-0 h-full bg-white border-r border-slate-100 z-[100] p-4 flex flex-col items-center overflow-hidden"
        >
            {/* Brand/Logo */}
            <div className="mb-12">
                <Link href="/" className="flex items-center justify-center p-2 rounded-2xl transition-all h-12">
                    <div className="min-w-[40px] h-[40px] bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                        <Youtube size={24} />
                    </div>
                </Link>
            </div>

            {/* Navigation Items */}
            <div className="flex flex-col gap-8 flex-1 items-center">
                <Link
                    href="/dashboard"
                    className={`flex items-center justify-center p-3 rounded-xl transition-all font-bold text-sm h-12 w-12 ${
                        pathname === '/dashboard' 
                        ? 'bg-blue-50 text-blue-500' 
                        : 'text-slate-400 hover:text-blue-500 hover:bg-slate-50'
                    }`}
                >
                    <PlusCircle size={24} className="shrink-0" />
                </Link>
                <Link
                    href="/dashboard/history"
                    className={`flex items-center justify-center p-3 rounded-xl transition-all font-bold text-sm h-12 w-12 ${
                        pathname === '/dashboard/history' 
                        ? 'bg-blue-50 text-blue-500' 
                        : 'text-slate-400 hover:text-blue-500 hover:bg-slate-50'
                    }`}
                >
                    <History size={24} className="shrink-0" />
                </Link>
                
                <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col items-center gap-6">
                   <button
                        onClick={onSignOut}
                        className="flex items-center justify-center p-3 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all h-12 w-12"
                    >
                        <LogOut size={24} className="shrink-0" />
                    </button>
                    
                    <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0 flex items-center justify-center font-bold text-xs text-slate-600 border border-slate-200">
                        {displayName[0].toUpperCase()}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
