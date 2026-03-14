'use client'

import { useState } from 'react'
import {
  Zap,
  BrainCircuit,
  Clock
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function HomePage() {
  const [loading, setLoading] = useState(false)


  const handleLogin = async () => {
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white relative overflow-hidden flex flex-col items-center p-6 selection:bg-blue-500/10">
      {/* Subtle Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.03),transparent_50%)] pointer-events-none" />

      <div className="max-w-6xl w-full text-center space-y-32 relative z-10 pt-32">
        {/* Hero Section */}
        <div className="space-y-12">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center"
            >
              <div className="w-20 h-20 bg-blue-500 rounded-3xl flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-blue-500/10 transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                ▶
              </div>
            </motion.div>

            {/* Hero Text */}
            <div className="space-y-6">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-6xl md:text-8xl font-extrabold text-slate-900 tracking-tight leading-none"
              >
                AI Video <span className="text-blue-500">Summary</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium"
              >
                The most efficient way to consume YouTube content. Turn any video into a comprehensive report in seconds.
              </motion.p>
            </div>

            {/* Login Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="pt-4 flex flex-col items-center gap-8"
            >
              <button
                onClick={handleLogin}
                disabled={loading}
                className="group relative flex items-center gap-4 bg-white border border-slate-200 text-slate-800 font-bold py-5 px-12 rounded-full text-xl transition-all hover:border-blue-200 hover:shadow-xl active:scale-95 shadow-sm"
              >
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="tracking-tight">{loading ? 'Starting...' : 'Continue with Google'}</span>
              </button>

              <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400">
                <span>Free to use</span>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                <span>Instant Retrieval</span>
              </div>
            </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {[
            {
              icon: <Zap className="text-blue-500" size={24} />,
              title: "Instant Generation",
              desc: "Complete video analysis delivered in under 10 seconds."
            },
            {
              icon: <BrainCircuit className="text-blue-400" size={24} />,
              title: "Expert Insights",
              desc: "LLaMA powered agents to identify critical patterns."
            },
            {
              icon: <Clock className="text-slate-400" size={24} />,
              title: "Permanent Vault",
              desc: "Automatically save and search your research library."
            }
          ].map((feature, i) => (
            <div key={i} className="p-12 border border-slate-100 rounded-[48px] bg-white hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-500/5 transition-all flex flex-col items-center text-center space-y-6 group shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-blue-50 transition-colors">
                {feature.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">{feature.title}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Footer */}
        <footer className="pt-20 text-slate-400 text-[10px] font-bold uppercase tracking-[0.5em] pb-10">
          Clean • Fast • Accurate
        </footer>
      </div>
    </main>
  )
}
