import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        let pdfBase64 = ''
        let fileName = ''

        const contentType = request.headers.get('content-type') || ''
        
        if (contentType.includes('application/json')) {
            const body = await request.json()
            pdfBase64 = body.pdfBase64
            fileName = body.fileName
        } else {
            const formData = await request.formData()
            pdfBase64 = formData.get('pdfBase64') as string
            fileName = formData.get('fileName') as string
        }
        
        if (!pdfBase64 || !fileName) {
            return NextResponse.json({ error: 'Missing PDF data or filename' }, { status: 400 })
        }

        const base64Data = pdfBase64.includes('base64,') 
            ? pdfBase64.split('base64,')[1] 
            : pdfBase64

        const pdfBuffer = Buffer.from(base64Data, 'base64')
        const safeName = fileName.replace(/[^a-z0-9.\-_]/gi, '_')

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safeName}"`,
                'Content-Length': pdfBuffer.length.toString(),
            },
        })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('[API_DOWNLOAD_ERROR]:', error)
        return NextResponse.json({ error: 'Download failed' }, { status: 500 })
    }
}
