import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || ''

if (!JWT_SECRET) {
  console.warn('JWT_SECRET is not defined. Please set it in your environment variables.')
}

export interface JWTPayload {
  userId: string
  email: string
  iat: number
  exp: number
}

function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64urlDecode(str: string): string {
  let s = str + '=='.slice(0, (4 - (str.length % 4)) % 4)
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
}

function createSignature(message: string, secret: string): string {
  return base64urlEncode(
    crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('base64')
  )
}

export function generateToken(userId: string, email: string, expiryDays: number = 30): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const expiresIn = expiryDays * 24 * 60 * 60

  const payload: JWTPayload = {
    userId,
    email,
    iat: now,
    exp: now + expiresIn,
  }

  const headerEncoded = base64urlEncode(JSON.stringify(header))
  const payloadEncoded = base64urlEncode(JSON.stringify(payload))
  const message = `${headerEncoded}.${payloadEncoded}`
  const signature = createSignature(message, JWT_SECRET)

  return `${message}.${signature}`
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const [headerEncoded, payloadEncoded, signatureProvided] = parts
    const message = `${headerEncoded}.${payloadEncoded}`
    const signature = createSignature(message, JWT_SECRET)

    if (signature !== signatureProvided) {
      return null
    }

    const payloadJson = base64urlDecode(payloadEncoded)
    const payload: JWTPayload = JSON.parse(payloadJson)

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) {
      return null
    }

    return payload
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payloadJson = base64urlDecode(parts[1])
    return JSON.parse(payloadJson)
  } catch (error) {
    return null
  }
}
