'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Send, Bot, User, Loader2, Volume2, Square, MessageSquare, Pause, Play } from 'lucide-react'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

interface Props {
    videoId: string
    videoTitle: string
}

export default function AudioChat({ videoId, videoTitle }: Props) {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    useEffect(() => {
        // Initialize Speech Recognition
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition()
            recognitionRef.current.continuous = false
            recognitionRef.current.interimResults = false
            recognitionRef.current.lang = 'en-US'

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript
                setInput(transcript)
                setIsListening(false)
                handleSend(transcript)
            }

            recognitionRef.current.onerror = () => {
                setIsListening(false)
            }

            recognitionRef.current.onend = () => {
                setIsListening(false)
            }
        }

        // Cleanup synthesis on unmount
        return () => {
            window.speechSynthesis.cancel()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop()
        } else {
            setInput('')
            setIsListening(true)
            recognitionRef.current?.start()
        }
    }

    const speak = (text: string) => {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        
        utterance.onstart = () => {
            setIsSpeaking(true)
            setIsPaused(false)
        }
        utterance.onend = () => {
            setIsSpeaking(false)
            setIsPaused(false)
        }
        utterance.onerror = () => {
            setIsSpeaking(false)
            setIsPaused(false)
        }

        window.speechSynthesis.speak(utterance)
    }

    const handlePauseResume = () => {
        if (isPaused) {
            window.speechSynthesis.resume()
            setIsPaused(false)
        } else {
            window.speechSynthesis.pause()
            setIsPaused(true)
        }
    }

    const handleStopSpeech = () => {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
        setIsPaused(false)
    }

    const handleSend = async (textOverride?: string) => {
        const messageText = textOverride || input
        if (!messageText.trim()) return

        const newMessages: Message[] = [...messages, { role: 'user', content: messageText }]
        setMessages(newMessages)
        setInput('')
        setLoading(true)
        
        // Stop any current speaking before starting new response
        handleStopSpeech()

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageText,
                    videoId,
                    history: messages.slice(-4) // Send last 4 messages for context
                })
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error)
            }

            const data = await res.json()
            const aiMessage: Message = { role: 'assistant', content: data.response }
            setMessages(prev => [...prev, aiMessage])
            speak(data.response)
        } catch (err: any) {
            console.error(err)
            if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.name === 'TypeError') {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Server is currently unavailable. Please try again later.' }])
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Forgive me, my neural link is failing. Please try again.' }])
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-[500px] bg-slate-900/50 rounded-3xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Neural Intelligence Active</span>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                        <MessageSquare size={48} className="text-blue-500" />
                        <p className="text-sm font-medium">Ask me anything about &quot;{videoTitle}&quot;</p>
                        <p className="text-[10px] font-black uppercase tracking-widest">Audio input enabled</p>
                    </div>
                )}
                {messages.map((msg, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[80%] p-4 rounded-2xl flex gap-3 ${
                            msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white/10 text-slate-200 rounded-tl-none border border-white/5'
                        }`}>
                            <div className="flex-shrink-0 mt-1">
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} className="text-blue-400" />}
                            </div>
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                    </motion.div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white/5 p-4 rounded-2xl animate-pulse flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin text-blue-500" />
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Neural Link Syncing...</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 bg-white/[0.02] border-t border-white/10">
                {/* Voice Playback Controls */}
                <AnimatePresence>
                    {isSpeaking && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: 10, height: 0 }}
                            className="flex items-center gap-3 mb-4 p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 overflow-hidden"
                        >
                            <div className="flex-shrink-0">
                                <Volume2 size={16} className="text-blue-400 animate-pulse" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                                    {isPaused ? 'Speech Paused' : 'Neural Voice Transmitting'}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePauseResume}
                                    className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all"
                                    title={isPaused ? "Resume" : "Pause"}
                                >
                                    {isPaused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                                </button>
                                <button
                                    onClick={handleStopSpeech}
                                    className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                    title="Stop"
                                >
                                    <Square size={14} fill="currentColor" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex gap-4 items-center">
                    <button
                        onClick={toggleListening}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                            isListening 
                            ? 'bg-red-500 animate-pulse text-white' 
                            : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white border border-blue-500/20'
                        }`}
                    >
                        {isListening ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
                    </button>
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder={isListening ? "Listening..." : "Message Intelligence..."}
                            className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-white focus:outline-none focus:border-blue-500 transition-all font-medium"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || loading}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-0"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
