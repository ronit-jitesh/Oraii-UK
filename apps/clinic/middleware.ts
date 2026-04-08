// middleware.ts — lightweight session guard for ORAII UK clinic portal
// Only enforces 30-min inactivity timeout — does NOT hard-block unauthenticated requests
// (Supabase auth handles the actual auth check in each server component/action)

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const TIMEOUT_MS         = 30 * 60 * 1000   // 30 minutes
const LAST_ACTIVE_COOKIE = 'oraii_last_active'

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/callback',
  '/forgot-password',
  '/login',
  '/register',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public paths
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // Only apply to protected routes
  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/session')
  if (!isProtected) return NextResponse.next()

  const now          = Date.now()
  const lastActive   = request.cookies.get(LAST_ACTIVE_COOKIE)
  const lastActiveTs = lastActive ? parseInt(lastActive.value, 10) : null

  // Only redirect on EXPLICIT stale timeout — not on missing cookie
  // Missing cookie just means first visit or cookie cleared — let Supabase auth handle it
  if (lastActiveTs && !isNaN(lastActiveTs) && (now - lastActiveTs) > TIMEOUT_MS) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('timeout', '1')
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete(LAST_ACTIVE_COOKIE)
    return response
  }

  // Refresh activity timestamp
  const response = NextResponse.next()
  response.cookies.set(LAST_ACTIVE_COOKIE, String(now), {
    httpOnly: true,
    sameSite: 'lax',           // lax instead of strict — prevents issues with redirects
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   60 * 60 * 2,
    path:     '/',
  })
  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/session/:path*'],
}
