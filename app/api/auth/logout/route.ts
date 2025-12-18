import { NextRequest, NextResponse } from 'next/server'
import { withAuthPOST } from '@/lib/middleware/auth'
import { successResponse } from '@/lib/errors/handlers'

export const POST = withAuthPOST(async (req) => {
  // Create success response
  const response = NextResponse.json(successResponse(null, 'Logged out successfully'))

  // Clear the auth token cookie
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })

  return response
})