import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Session cookie set by better-auth
const SESSION_COOKIE = 'mihbah.session_token'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get(SESSION_COOKIE)

  // Protect /(app)/* routes — redirect to login if no session cookie
  if (!session?.value) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match /(app) group routes
    '/(app)/:path*',
    '/dashboard/:path*',
  ],
}
