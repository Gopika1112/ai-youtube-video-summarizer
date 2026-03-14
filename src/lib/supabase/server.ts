import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
    const cookieStore = await cookies()
    
    // Custom fetch with timeout to prevent hanging on network issues
    const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit) => {
        const controller = new AbortController()
        const id = setTimeout(() => controller.abort(), 8000) // Increase to 8 seconds
        try {
            const response = await fetch(input, {
                ...init,
                signal: controller.signal,
            })
            clearTimeout(id)
            return response
        } catch (error) {
            clearTimeout(id)
            throw error
        }
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: { fetch: fetchWithTimeout },
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Ignore server component set errors
                    }
                },
            },
        }
    )
}
