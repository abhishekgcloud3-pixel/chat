import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { AuthenticationError } from '@/lib/errors/ApiError'

/**
 * JWT Payload type
 */
export interface JWTPayload {
  userId: string
  email: string
  iat?: number
  exp?: number
}

/**
 * Extended NextRequest with user info
 */
export interface AuthenticatedRequest extends NextRequest {
  userId?: string
  user?: {
    id: string
    email: string
  }
}

/**
 * Get JWT secret from environment
 */
function getJWTSecret(): string {
  return process.env.JWT_SECRET || 'default-secret-key-change-in-production'
}

/**
 * Create a simple JWT token using Node crypto
 * Format: header.payload.signature
 */
export function createToken(payload: { userId: string; email: string }): string {
  const secret = getJWTSecret()
  
  // Header
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }
  
  const now = Math.floor(Date.now() / 1000)
  const expiresIn = 24 * 60 * 60 // 24 hours
  
  // Payload with timestamps
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  }
  
  // Encode header and payload as base64
  const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url')
  const payloadEncoded = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url')
  
  // Create signature
  const message = `${headerEncoded}.${payloadEncoded}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64url')
  
  return `${message}.${signature}`
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const secret = getJWTSecret()
    const parts = token.split('.')
    
    if (parts.length !== 3) {
      return null
    }
    
    const [headerEncoded, payloadEncoded, signatureEncoded] = parts
    
    // Verify signature
    const message = `${headerEncoded}.${payloadEncoded}`
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('base64url')
    
    if (signatureEncoded !== expectedSignature) {
      return null
    }
    
    // Decode payload
    const payloadBuffer = Buffer.from(payloadEncoded, 'base64url')
    const payload = JSON.parse(payloadBuffer.toString('utf-8')) as JWTPayload
    
    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    
    return payload
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

/**
 * Verify JWT token from request
 * Extracts token from Authorization header or cookies
 */
export async function verifyAuth(req: NextRequest): Promise<JWTPayload | null> {
  try {
    // Try to get token from Authorization header
    let token = req.headers.get('Authorization')?.replace('Bearer ', '')
    
    // If not in header, try to get from cookies
    if (!token) {
      token = req.cookies.get('auth_token')?.value
    }
    
    if (!token) {
      return null
    }
    
    return verifyToken(token)
  } catch (error) {
    console.error('JWT verification error:', error)
    return null
  }
}

/**
 * Middleware to enforce authentication
 * Returns 401 if user is not authenticated
 */
export async function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const payload = await verifyAuth(req)
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing authentication token' },
        { status: 401 }
      )
    }
    
    // Create authenticated request with user info
    const authReq = req as AuthenticatedRequest
    authReq.userId = payload.userId
    authReq.user = {
      id: payload.userId,
      email: payload.email,
    }
    
    return handler(authReq)
  }
}

/**
 * Middleware for GET requests with authentication
 */
export function withAuthGET(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    if (req.method !== 'GET') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    }
    return handler(req)
  })
}

/**
 * Middleware for POST requests with authentication
 */
export function withAuthPOST(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse> | NextResponse
) {
  return withAuth(async (req: AuthenticatedRequest) => {
    if (req.method !== 'POST') {
      return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
    }
    return handler(req)
  })
}

/**
 * Generate a JWT token (alias for createToken)
 */
export async function generateToken(payload: { userId: string; email: string }): Promise<string> {
  return createToken(payload)
}

/**
 * Verify token validity without throwing
 */
export async function isTokenValid(token: string): Promise<boolean> {
  return verifyToken(token) !== null
}
