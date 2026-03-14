'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Youtube,
  ArrowRight,
  Zap,
  Shield,
  Search,
  Sparkles,
  BrainCircuit,
  Clock
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function HomePage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
    <main className="min-h-screen bg-[#0f172a] relative overflow-hidden flex flex-col items-center p-6 selection:bg-blue-500/30">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.05),transparent_50%)] pointer-events-none" />

      <div className="max-w-6xl w-full text-center space-y-24 relative z-10 pt-20">
        {/* Hero Section */}
        <div className="space-y-12">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center"
            >
              <div className="w-20 h-20 bg-blue-600 rounded-[24px] flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-blue-500/20 rotate-3 animate-pulse">
                ▶
              </div>
            </motion.div>

            {/* Hero Text */}
            <div className="space-y-6">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none"
              >
                AI Video <span className="text-blue-500">Summary</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium"
              >
                The ultimate intelligence layer for YouTube. Turn hours of video into actionable knowledge in seconds.
              </motion.p>
            </div>

            {/* Login Button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="pt-4 flex flex-col items-center gap-6"
            >
              <button
                onClick={handleLogin}
                disabled={loading}
                className="group relative flex items-center gap-4 bg-white text-black font-black py-5 px-12 rounded-[24px] text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" className="fill-current">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="tracking-tight">{loading ? 'Synthesizing...' : 'Continue with Google'}</span>
              </button>

              <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
                <span>Zero Configuration</span>
                <span className="w-1 h-1 bg-slate-500/30 rounded-full" />
                <span>Free Intelligence</span>
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
              title: "Instant Summary",
              desc: "Complete video breakdown delivered in under 10 seconds."
            },
            {
              icon: <BrainCircuit className="text-indigo-400" size={24} />,
              title: "Deep Insights",
              desc: "LLaMA 3.3 powered analysis to find the hidden value."
            },
            {
              icon: <Clock className="text-teal-400" size={24} />,
              title: "Knowledge Vault",
              desc: "Automatically save and search your research history."
            }
          ].map((feature, i) => (
            <div key={i} className="p-10 border border-[#1e293b] rounded-[32px] bg-white/[0.01] hover:bg-white/[0.03] hover:border-blue-500/30 transition-all flex flex-col items-center text-center space-y-6 group">
              <div className="w-16 h-16 rounded-[20px] bg-[#1e293b] flex items-center justify-center border border-[#1e293b] group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white tracking-tight">{feature.title}</h3>
                <p className="text-sm text-slate-400 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* How it Works Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="space-y-16"
        >
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">Automated <span className="text-blue-500">Intelligence</span> Pipeline</h2>
            <p className="text-slate-400 font-medium max-w-2xl mx-auto">
              Behind the curtain, our autonomous agents deploy a sophisticated multi-stage processing stack to synthesize your intelligence reports.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {[
              {
                num: "01",
                color: "text-blue-500",
                bg: "bg-blue-500/10",
                title: "Signal Capture",
                desc: "Agents intercept the YouTube stream and extract raw transcript data from global metadata shards."
              },
              {
                num: "02",
                color: "text-indigo-400",
                bg: "bg-indigo-400/10",
                title: "Neural Synthesis",
                desc: "LLaMA 3.3 models process the signal, identifying strategic patterns and key semantic moments."
              },
              {
                num: "03",
                color: "text-teal-400",
                bg: "bg-teal-400/10",
                title: "Vector Storage",
                desc: "The synthesized intelligence is encrypted and stored in your private temporal vault for instant recall."
              },
              {
                num: "04",
                color: "text-blue-400",
                bg: "bg-blue-400/10",
                title: "Expert Export",
                desc: "Generate high-fidelity PDF reports or Markdown dossiers for your strategic research needs."
              }
            ].map((step, i) => (
              <div key={i} className="relative group">
                <div className="p-8 border border-[#1e293b] rounded-[32px] bg-[#1e293b]/50 hover:bg-[#1e293b] transition-all h-full space-y-6 text-left">
                  <div className={`w-12 h-12 rounded-2xl ${step.bg} flex items-center justify-center ${step.color} font-black`}>{step.num}</div>
                  <h4 className="text-white font-bold">{step.title}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <footer className="pt-20 text-slate-600 text-[10px] font-black uppercase tracking-[0.5em] pb-10">
          AI Power • Groq Speed • Pure Insight
        </footer>
      </div>
    </main>
  )
}
