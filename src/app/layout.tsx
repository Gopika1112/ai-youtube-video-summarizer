import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'YT Summarizer – AI-Powered YouTube Video Summaries',
  description: 'Instantly summarize any YouTube video using AI. Get key takeaways, insights, and detailed analysis in seconds.',
  keywords: ['youtube summarizer', 'AI summary', 'video transcript', 'key takeaways'],
  openGraph: {
    title: 'YT Summarizer – AI-Powered YouTube Video Summaries',
    description: 'Instantly summarize any YouTube video using AI.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="animated-bg min-h-screen">
        {children}
      </body>
    </html>
  )
}
