import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Session cookie set by better-auth
// In production (HTTPS), Better Auth adds __Secure- prefix automatically
const SESSION_COOKIE = 'mihbah.session_token'
const SESSION_COOKIE_SECURE = '__Secure-mihbah.session_token'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get(SESSION_COOKIE_SECURE) ?? request.cookies.get(SESSION_COOKIE)

  // Portal: /portal/login es público. El resto de /portal/* requiere sesión.
  if (pathname.startsWith('/portal')) {
    if (pathname === '/portal/login' || pathname.startsWith('/portal/login/')) {
      return NextResponse.next()
    }
    if (!session?.value) {
      const loginUrl = new URL('/portal/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // Admin app: redirige a /login si no hay sesión
  if (!session?.value) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Admin app
    '/(app)/:path*',
    '/dashboard/:path*',
    // Portal
    '/portal/:path*',
  ],
}
