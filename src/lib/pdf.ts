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
    try {
    // High Fidelity Stage (Visible but far off-screen to ensure full rendering engine activation)
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.top = '-20000px'
    iframe.style.left = '0'
    iframe.style.width = '1200px'
    iframe.style.height = '3000px'
    iframe.style.border = 'none'
    iframe.style.zIndex = '-9999'
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

iframeDoc.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=Noto+Sans+Malayalam:wght@400;700&display=swap" rel="stylesheet">
        <style>
            * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
            body { 
                background-color: #ffffff; 
                color: #0f172a; 
                font-family: 'Inter', 'Noto Sans Malayalam', sans-serif; 
                margin: 0; 
                padding: 0;
                line-height: 2.0; /* Crucial for Malayalam character stacks */
                text-rendering: initial; 
                -webkit-font-smoothing: initial !important;
                letter-spacing: 0px !important;
                text-align: left !important;
            }
            #root { 
                padding: 40px 60px; 
                width: 850px; 
                background-color: #ffffff;
            }
            .text-body {
                font-size: 15px;
                color: #334155;
                letter-spacing: 0px !important;
                white-space: pre-wrap;
                text-align: left !important;
                word-break: break-word;
            }
            .header {
                border-bottom: 2px solid #3b82f6;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .title {
                color: #0f172a;
                font-size: 26px;
                font-weight: 800;
                margin: 0 0 10px 0;
                line-height: 1.3;
                letter-spacing: 0px !important;
            }
            .meta-label {
                color: #64748b;
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0px !important;
                margin-bottom: 4px;
            }
            .section-label {
                color: #3b82f6;
                font-size: 11px;
                font-weight: 800;
                margin-bottom: 12px;
                border-left: 3px solid #3b82f6;
                padding-left: 10px;
            }
            .content-box {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 22px;
                margin-bottom: 30px;
            }
            .takeaway-left {
                display: table-cell;
                width: 30px;
                vertical-align: top;
            }
            .takeaway-num {
                background: #3b82f6;
                color: white;
                width: 22px;
                height: 22px;
                line-height: 22px;
                border-radius: 4px;
                text-align: center;
                font-weight: 800;
                font-size: 11px;
            }
            .takeaway-content {
                display: table-cell;
                vertical-align: top;
                padding-left: 10px;
            }
            .moment-list {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .moment-card {
                background: #ffffff;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 18px;
                page-break-inside: avoid;
                text-align: left !important;
            }
            .timestamp {
                color: #3b82f6;
                font-weight: 800;
                font-size: 13px;
                margin-bottom: 6px;
                display: block;
            }
            .moment-title {
                font-weight: 700;
                font-size: 16px;
                margin-bottom: 6px;
                color: #0f172a;
            }
        </style>
    </head>
    <body>
        <div id="root">
            <div class="header">
                <div class="meta-label">${(summary as any).labels?.ai_intelligence_report || 'AI Intelligence Report'}</div>
                <h1 class="title">${summary.video_title}</h1>
                    <div class="meta-label" style="color: #94a3b8;">${(summary as any).labels?.generated_on || 'Generated on'} ${format(new Date(summary.created_at), 'MMMM d, yyyy')}</div>
            </div>

            <div class="section-label">${(summary as any).labels?.executive_summary || 'Executive Summary'}</div>
            <div class="content-box">
                <div class="text-body" style="font-size: 16px; font-weight: 500; line-height: 1.7; color: #1e293b;">
                    ${summary.short_summary}
                </div>
            </div>

            <div class="section-label">${(summary as any).labels?.key_takeaways || 'Key Takeaways'}</div>
            <div style="margin-bottom: 40px; padding-left: 10px;">
                ${(summary.key_takeaways as string[]).map((t, i) => `
                    <div class="takeaway-item">
                        <div class="takeaway-left"><div class="takeaway-num">${i+1}</div></div>
                        <div class="takeaway-content text-body" style="font-weight: 500;">${t}</div>
                    </div>
                `).join('')}
            </div>

            <div class="section-label">${(summary as any).labels?.detailed_analysis || 'Detailed Analysis'}</div>
            <div class="text-body" style="margin-bottom: 50px; padding: 0 10px;">
                ${summary.detailed_summary.split('\n').filter(Boolean).map(p => `
                    <p style="margin-bottom: 22px; text-align: left;">${p}</p>
                `).join('')}
            </div>

            ${summary.important_insights && (summary.important_insights as string[]).length > 0 ? `
                <div class="section-label">${(summary as any).labels?.strategic_insights || 'Strategic Insights'}</div>
                <div class="content-box" style="border-left: 5px solid #3b82f6; background: #f0f7ff;">
                    ${(summary.important_insights as string[]).map(ins => `
                        <div class="text-body" style="margin-bottom: 10px; font-weight: 500;">• ${ins}</div>
                    `).join('')}
                </div>
            ` : ''}

            ${summary.key_moments && (summary.key_moments as KeyMoment[]).length > 0 ? `
                <div class="section-label">${(summary as any).labels?.knowledge_timeline || 'Knowledge Timeline'}</div>
                <div class="moment-list">
                    ${(summary.key_moments as KeyMoment[]).map(m => `
                        <div class="moment-card">
                            <span class="timestamp">${formatTimestamp(m.timestamp)}</span>
                            <div class="moment-title">${m.title}</div>
                            <div class="text-body" style="font-size: 14px; color: #475569;">${m.description}</div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div style="margin-top: 80px; padding-top: 20px; border-top: 2px solid #f1f5f9; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; font-weight: 600;">
                <span>${(summary as any).labels?.source || 'Source'}: ${summary.video_url}</span>
                <span>${(summary as any).labels?.confidential || 'AI Generated Report'}</span>
            </div>
        </div>
    </body>
    </html>
`)
iframeDoc.close()

// Wait for the fonts to be fully baked into the rendering engine
await (iframe.contentWindow as any).document.fonts.ready
await new Promise(resolve => setTimeout(resolve, 4000)) // Deep shaping wait

const captureRoot = iframeDoc.getElementById('root')
if (!captureRoot) throw new Error('Root not found')

const canvas = await html2canvas(captureRoot, {
    scale: 3, // Ultra high resolution for crisp Malayalam glyphs
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 1200,
    scrollX: 0,
    scrollY: 0,
    imageTimeout: 0,
    removeContainer: true
})

document.body.removeChild(iframe)
const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
const imgData = canvas.toDataURL('image/jpeg', 0.98)

const pdfWidth = doc.internal.pageSize.getWidth()
const pageHeight = doc.internal.pageSize.getHeight()
const imgWidth = canvas.width
const imgHeight = canvas.height
const pdfHeight = (imgHeight * pdfWidth) / imgWidth

let heightLeft = pdfHeight
let position = 0

// Add first page
doc.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight)
heightLeft -= pageHeight

// Add additional pages if needed
while (heightLeft > 0) {
    position = heightLeft - pdfHeight
    doc.addPage()
    doc.setFillColor(255, 255, 255)
    doc.rect(0, 0, pdfWidth, pageHeight, 'F')
    doc.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight)
    heightLeft -= pageHeight
}
finalDoc = doc
        finalDoc = doc
    } catch (captureErr) {
        console.error('High-fidelity capture failed:', captureErr)
        // Background fallback Engine (Premium Dark Version)
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        const margin = 20
        const contentWidth = pageWidth - margin * 2
        
        // Dark Page Background
        doc.setFillColor(15, 23, 42) // #0f172a
        doc.rect(0, 0, pageWidth, pageHeight, 'F')
        
        let y = margin

        const checkPageBreak = (needed: number) => {
            if (y + needed > pageHeight - margin) {
                doc.addPage()
                doc.setFillColor(15, 23, 42)
                doc.rect(0, 0, pageWidth, pageHeight, 'F')
                y = margin
            }
        }

        const addSectionTitle = (title: string, r: number, g: number, b: number) => {
            checkPageBreak(25)
            doc.setFillColor(r, g, b)
            doc.rect(margin, y, 4, 10, 'F')
            doc.setTextColor(r, g, b)
            doc.setFontSize(13)
            doc.setFont('helvetica', 'bold')
            doc.text(title, margin + 8, y + 7)
            y += 16
            doc.setTextColor(255, 255, 255)
            doc.setFont('helvetica', 'normal')
        }

        const addWrappedText = (text: string, fontSize: number = 10, color: [number, number, number] = [248, 250, 252]) => {
            doc.setFontSize(fontSize)
            doc.setTextColor(...color)
            doc.setFont('helvetica', 'normal')
            const lines = doc.splitTextToSize(text, contentWidth)
            for (const line of lines) {
                checkPageBreak(10)
                doc.text(line, margin, y)
                y += 6
            }
            y += 4
        }

        // Header
        doc.setFillColor(30, 41, 59) // #1e293b
        doc.rect(0, 0, pageWidth, 50, 'F')
        doc.setTextColor(59, 130, 246)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('NEURAL SUMMARIZER • AI INTELLIGENCE REPORT', margin, 18)
        
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(18)
        const titleLines = doc.splitTextToSize(summary.video_title, contentWidth)
        doc.text(titleLines, margin, 31)
        
        doc.setTextColor(148, 163, 184)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.text(`DATE: ${format(new Date(summary.created_at), 'MMMM d, yyyy').toUpperCase()}`, margin, 44)

        // Content Sections
        y = 65
        addSectionTitle('EXECUTIVE SUMMARY', 59, 130, 246)
        addWrappedText(summary.short_summary, 11, [255, 255, 255])
        
        y += 6
        addSectionTitle('KEY TAKEAWAYS', 45, 212, 191)
        summary.key_takeaways.forEach((t, i) => addWrappedText(`${i+1}. ${t}`, 10, [203, 213, 225]))

        y += 6
        addSectionTitle('STRATEGIC INSIGHTS', 129, 140, 248)
        summary.important_insights.forEach((ins) => addWrappedText(`• ${ins}`, 10, [203, 213, 225]))

        y += 6
        addSectionTitle('DETAILED ANALYSIS', 167, 139, 250)
        summary.detailed_summary.split('\n').filter(Boolean).forEach(p => addWrappedText(p, 10, [148, 163, 184]))
        
        // Key Moments Fallback
        if (summary.key_moments && summary.key_moments.length > 0) {
            y += 6
            addSectionTitle('KNOWLEDGE TIMELINE', 96, 165, 250)
            summary.key_moments.forEach(m => {
                checkPageBreak(30)
                doc.setFont('helvetica', 'bold')
                doc.setTextColor(96, 165, 250)
                doc.text(formatTimestamp(m.timestamp), margin, y)
                y += 6
                doc.setTextColor(255, 255, 255)
                doc.text(m.title, margin, y)
                y += 5
                addWrappedText(m.description, 9, [148, 163, 184])
                y += 2
            })
        }
        
        // Footer line
        doc.setDrawColor(30, 41, 59)
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        doc.text(`SOURCE: ${summary.video_url.substring(0, 60)}...`, margin, pageHeight - 10)
        doc.text('CONFIDENTIAL • AI GENERATED', pageWidth - margin - 45, pageHeight - 10)
        
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
