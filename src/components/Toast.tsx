'use client'

interface Props {
    message: string
    type: 'success' | 'error'
}

export default function Toast({ message, type }: Props) {
    return (
        <div className={`toast toast-${type}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>{type === 'success' ? '✅' : '❌'}</span>
            {message}
        </div>
    )
}
