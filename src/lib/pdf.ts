import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import type { Summary, KeyMoment } from './types'
import { formatTimestamp } from './utils'
import { format } from 'date-fns'

export async function generatePDF(summary: Summary, element?: HTMLElement): Promise<void> {
    // Ultra-aggressive sanitization for 100% OS compatibility
    const distilledTitle = (summary.video_title || 'report')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 25) || 'intelligence'
    
    const fileName = `${distilledTitle}.pdf`
    console.log(`[PDF] PROTOCOL INITIATED: ${fileName}`)

    let finalDoc: jsPDF | null = null

    // --- HIGH FIDELITY CAPTURE ENGINE ---
    if (element) {
        try {
            const iframe = document.createElement('iframe')
            iframe.style.position = 'fixed'
            iframe.style.top = '-10000px'
            iframe.style.left = '-10000px'
            iframe.style.width = '850px'
            iframe.style.height = '1200px'
            document.body.appendChild(iframe)

            const iframeDoc = iframe.contentWindow?.document
            if (!iframeDoc) throw new Error('Could not create isolation context')

            const momentsHTML = summary.key_moments && (summary.key_moments as KeyMoment[]).length > 0
                ? `<div style="margin-top: 40px;">
                    <h3 style="color: #60a5fa; font-size: 24px; font-weight: 900; margin-bottom: 20px;">KNOWLEDGE MARKERS</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        ${(summary.key_moments as KeyMoment[]).map(m => `
                            <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 15px;">
                                <div style="color: #60a5fa; font-weight: bold; font-size: 11px; margin-bottom: 5px;">${formatTimestamp(m.timestamp)}</div>
                                <div style="color: #ffffff; font-weight: bold; font-size: 13px; margin-bottom: 5px;">${m.title}</div>
                                <div style="color: #94a3b8; font-size: 11px; line-height: 1.4;">${m.description}</div>
                            </div>
                        `).join('')}
                    </div>
                   </div>`
                : '';

            const takeawaysHTML = (summary.key_takeaways as string[]).map((t, i) => `
                <div style="display: flex; gap: 15px; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 15px; margin-bottom: 10px;">
                    <div style="background: #2dd4bf; color: #0f172a; width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 11px; flex-shrink: 0;">${i+1}</div>
                    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">${t}</div>
                </div>
            `).join('');

            const insightsHTML = (summary.important_insights as string[]).map(ins => `
                <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 15px; margin-bottom: 10px; color: #cbd5e1; font-size: 13px; line-height: 1.6; border-left: 4px solid #818cf8;">
                    ${ins}
                </div>
            `).join('');

            iframeDoc.open()
            iframeDoc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Noto+Sans+Malayalam:wght@400;700;900&display=swap" rel="stylesheet">
                    <style>
                        * { box-sizing: border-box; }
                        body { background-color: #0f172a; color: #f8fafc; font-family: 'Inter', 'Noto Sans Malayalam', sans-serif; margin: 0; padding: 0; }
                        #root { padding: 80px; width: 850px; min-height: 1200px; display: block; background-color: #0f172a; }
                    </style>
                </head>
                <body>
                    <div id="root">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 50px; opacity: 0.6;">
                            <div style="font-weight: 900; font-size: 14px; letter-spacing: 2px;">NEURAL SUMMARIZER</div>
                            <div style="font-size: 10px;">ID: ${summary.id.slice(0, 8).toUpperCase()}</div>
                        </div>
                        <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 40px; margin-bottom: 50px;">
                            <h1 style="color: #ffffff; font-size: 42px; font-weight: 900; margin: 0; line-height: 1.1;">${summary.video_title}</h1>
                            <div style="margin-top: 20px; color: #94a3b8; font-size: 13px; font-weight: 600;">
                                ${format(new Date(summary.created_at), 'MMMM d, yyyy')} • AI INTELLIGENCE REPORT
                            </div>
                        </div>
                        <div style="margin-bottom: 60px;">
                            <div style="color: #a78bfa; font-weight: 800; font-size: 11px; letter-spacing: 0.1em; margin-bottom: 15px;">EXECUTIVE SUMMARY</div>
                            <div style="background: #1e293b; border: 1px solid #334155; border-radius: 20px; padding: 40px; color: #ffffff; font-size: 19px; line-height: 1.8;">
                                ${summary.short_summary}
                            </div>
                        </div>
                        <div style="margin-bottom: 60px;">
                            <div style="color: #60a5fa; font-weight: 800; font-size: 11px; letter-spacing: 0.1em; margin-bottom: 15px;">STRUCTURAL ANALYSIS</div>
                            <div style="color: #cbd5e1; font-size: 15px; line-height: 2.0;">
                                ${summary.detailed_summary.split('\n').filter(Boolean).map(p => `
                                    <div style="margin-bottom: 25px; padding-left: 25px; border-left: 1px solid #334155;">${p}</div>
                                `).join('')}
                            </div>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 60px;">
                            <div><h3 style="color: #2dd4bf; font-size: 18px; font-weight: 900; margin-bottom: 20px;">KEY TAKEAWAYS</h3>${takeawaysHTML}</div>
                            <div><h3 style="color: #818cf8; font-size: 18px; font-weight: 900; margin-bottom: 20px;">STRATEGIC INSIGHTS</h3>${insightsHTML}</div>
                        </div>
                        ${momentsHTML}
                        <div style="margin-top: 100px; padding-top: 30px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; color: #475569; font-size: 10px;">
                            <span>SOURCE: ${summary.video_url}</span>
                            <span>PAGE 01 • CONFIDENTIAL</span>
                        </div>
                    </div>
                </body>
                </html>
            `)
            iframeDoc.close()
            await new Promise(resolve => setTimeout(resolve, 300))

            const captureRoot = iframeDoc.getElementById('root')
            if (!captureRoot) throw new Error('Capture root not found')

            const canvas = await html2canvas(captureRoot, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#0f172a',
                logging: false,
                windowWidth: 850
            })

            document.body.removeChild(iframe)
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
            const imgData = canvas.toDataURL('image/jpeg', 0.95)
            
            const pdfWidth = doc.internal.pageSize.getWidth()
            const pageHeight = doc.internal.pageSize.getHeight()
            const imgWidth = canvas.width
            const imgHeight = canvas.height
            const pdfHeight = (imgHeight * pdfWidth) / imgWidth
            
            let heightLeft = pdfHeight
            let position = 0
            doc.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight)
            heightLeft -= pageHeight

            while (heightLeft > 0) {
                position = heightLeft - pdfHeight
                doc.addPage()
                doc.setFillColor(15, 23, 42)
                doc.rect(0, 0, pdfWidth, pageHeight, 'F')
                doc.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight)
                heightLeft -= pageHeight
            }
            finalDoc = doc
        } catch (captureErr) {
            console.error('High-fidelity capture failed:', captureErr)
        }
    }

    // --- FALLBACK ENGINE ---
    if (!finalDoc) {
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 20
        const contentWidth = pageWidth - margin * 2
        let y = margin

        const checkPageBreak = (needed: number) => {
            if (y + needed > pageHeight - margin) {
                doc.addPage()
                y = margin
            }
        }

        const addSectionTitle = (title: string, r: number, g: number, b: number) => {
            checkPageBreak(20)
            doc.setFillColor(r, g, b)
            doc.rect(margin, y, 4, 10, 'F')
            doc.setTextColor(r, g, b)
            doc.setFontSize(13)
            doc.setFont('helvetica', 'bold')
            doc.text(title, margin + 8, y + 7)
            y += 16
            doc.setTextColor(60, 60, 60)
            doc.setFont('helvetica', 'normal')
        }

        const addWrappedText = (text: string, fontSize: number = 10, color: [number, number, number] = [80, 80, 80]) => {
            doc.setFontSize(fontSize)
            doc.setTextColor(...color)
            doc.setFont('helvetica', 'normal')
            const lines = doc.splitTextToSize(text, contentWidth)
            for (const line of lines) {
                checkPageBreak(7)
                doc.text(line, margin, y)
                y += 6
            }
            y += 2
        }

        doc.setFillColor(139, 92, 246)
        doc.rect(0, 0, pageWidth, 45, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(9)
        doc.text('YT SUMMARIZER', margin, 14)
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        const titleLines = doc.splitTextToSize(summary.video_title, contentWidth - 10)
        doc.text(titleLines, margin, 26)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(`Generated on ${format(new Date(summary.created_at), 'MMMM d, yyyy')}`, margin, 40)

        y = 58
        addSectionTitle('Short Summary', 139, 92, 246)
        addWrappedText(summary.short_summary)
        y += 4
        addSectionTitle('Detailed Summary', 59, 130, 246)
        summary.detailed_summary.split('\n').filter(Boolean).forEach(p => addWrappedText(p))
        
        finalDoc = doc
    }

    // --- NUCLEAR DISPOSITION TRIGGER (Headers Enforcement) ---
    // Instead of client-side blobs, we use a hidden form to hit the API.
    // This forces the browser to respect the server's Content-Disposition header.
    if (finalDoc) {
        const pdfBase64 = finalDoc.output('datauristring')
        
        const form = document.createElement('form')
        form.method = 'POST'
        form.action = '/api/download'
        form.style.display = 'none'
        
        const pdfInput = document.createElement('input')
        pdfInput.type = 'hidden'
        pdfInput.name = 'pdfBase64'
        pdfInput.value = pdfBase64
        form.appendChild(pdfInput)
        
        const nameInput = document.createElement('input')
        nameInput.type = 'hidden'
        nameInput.name = 'fileName'
        nameInput.value = fileName
        form.appendChild(nameInput)
        
        document.body.appendChild(form)
        form.submit()
        
        setTimeout(() => {
            document.body.removeChild(form)
        }, 1000)
    }
}
