import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    // Skip middleware if Supabase URL is not configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your_supabase_project_url') {
        // Allow all requests through when env vars aren't set
        return NextResponse.next({ request })
    }

    // Only perform auth check if the route is protected or an API route
    const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')
    const isAuth = request.nextUrl.pathname.startsWith('/auth')
    const isApi = request.nextUrl.pathname.startsWith('/api')
    
    // Check for existence of Supabase session cookie to avoid unnecessary network calls
    const hasSession = request.cookies.getAll().some(c => c.name.includes('supabase-auth-token') || c.name.includes('sb-'))
    
    let supabaseResponse = NextResponse.next({ request })

    if (!isDashboard && !isAuth && !isApi) {
        return supabaseResponse
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                )
                supabaseResponse = NextResponse.next({ request })
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                )
            },
        },
    })

    // If it's a dashboard or API route and we don't even have a cookie, short-circuit
    if (!hasSession && (isDashboard || isApi)) {
        if (isDashboard) {
            const url = request.nextUrl.clone()
            url.pathname = '/'
            return NextResponse.redirect(url)
        }
        // For API, just let it through and it will fail with 401 via its own getUser() check
        return supabaseResponse
    }

    const { data: { user } } = await supabase.auth.getUser()

    // Protect dashboard routes
    if (!user && isDashboard) {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
