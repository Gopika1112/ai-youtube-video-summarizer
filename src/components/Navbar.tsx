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
        <div className="fixed top-0 left-0 h-full w-[70px] bg-white border-r border-slate-100 z-[100] flex flex-col items-center py-8 gap-10">
            {/* Brand/Logo */}
            <Link href="/" className="mb-4">
                <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <Youtube size={24} />
                </div>
            </Link>

            {/* Navigation Items */}
            <div className="flex flex-col gap-8 items-center">
                <Link
                    href="/dashboard"
                    className={`p-3 rounded-xl transition-all ${
                        pathname === '/dashboard' 
                        ? 'text-blue-500 bg-blue-50' 
                        : 'text-slate-400 hover:text-blue-500 hover:bg-slate-50'
                    }`}
                >
                    <PlusCircle size={24} />
                </Link>
                <Link
                    href="/dashboard/history"
                    className={`p-3 rounded-xl transition-all ${
                        pathname === '/dashboard/history' 
                        ? 'text-blue-500 bg-blue-50' 
                        : 'text-slate-400 hover:text-blue-500 hover:bg-slate-50'
                    }`}
                >
                    <History size={24} />
                </Link>
            </div>

            {/* Bottom Section */}
            <div className="mt-auto flex flex-col gap-6 items-center">
                <button
                    onClick={onSignOut}
                    className="p-3 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                    <LogOut size={24} />
                </button>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 border border-slate-200">
                    {displayName[0].toUpperCase()}
                </div>
            </div>
        </div>
    )
}
