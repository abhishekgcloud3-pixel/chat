import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/middleware/auth'

/**
 * Public routes that don't require authentication
 */
const publicRoutes = [
  '/',
  '/otp-verify',
  '/add-mobile'
]

/**
 * Routes that require authentication (will redirect to login if not authenticated)
 */
const protectedRoutes = [
  '/chat'
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  
  // Check if the current route is public
  const isPublicRoute = publicRoutes.some(route => {
    if (route === '/') {
      return pathname === route || pathname.startsWith('/api')
    }
    return pathname.startsWith(route)
  })

  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // For protected routes, check authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute) {
    const token = req.cookies.get('auth_token')?.value

    if (!token) {
      // No token found, redirect to login
      const url = req.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Verify the token
    const payload = verifyToken(token)
    
    if (!payload) {
      // Invalid or expired token, redirect to login
      const url = req.nextUrl.clone()
      url.pathname = '/'
      
      // Clear the invalid token
      const response = NextResponse.redirect(url)
      response.cookies.delete('auth_token')
      return response
    }

    // Token is valid, allow access
    return NextResponse.next()
  }

  // For all other routes, allow access (this includes API routes for public endpoints)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}