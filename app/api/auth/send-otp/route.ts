import { NextRequest, NextResponse } from 'next/server'
import { withDBPOST } from '@/lib/db/middleware'
import { connectDB } from '@/lib/db/connection'
import { generateOTP, sendOTPEmail } from '@/lib/email/otp'
import { validateEmail } from '@/lib/validators/auth'
import { findUserByEmail, OTP } from '@/lib/db'
import mongoose from 'mongoose'

const OTP_RATE_LIMIT_ATTEMPTS = 3
const OTP_RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour

interface RateLimitStore {
  [email: string]: {
    count: number
    resetTime: number
  }
}

const rateLimitStore: RateLimitStore = {}

function checkRateLimit(email: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const emailLower = email.toLowerCase()

  if (!rateLimitStore[emailLower]) {
    rateLimitStore[emailLower] = {
      count: 1,
      resetTime: now + OTP_RATE_LIMIT_WINDOW,
    }
    return { allowed: true, remaining: OTP_RATE_LIMIT_ATTEMPTS - 1 }
  }

  const record = rateLimitStore[emailLower]

  if (now > record.resetTime) {
    record.count = 1
    record.resetTime = now + OTP_RATE_LIMIT_WINDOW
    return { allowed: true, remaining: OTP_RATE_LIMIT_ATTEMPTS - 1 }
  }

  record.count += 1

  if (record.count > OTP_RATE_LIMIT_ATTEMPTS) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: OTP_RATE_LIMIT_ATTEMPTS - record.count }
}

async function handler(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const rateLimit = checkRateLimit(email)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many OTP requests. Please try again later.',
          retryAfter: 3600,
        },
        { status: 429 }
      )
    }

    await connectDB()

    const user = await findUserByEmail(email)

    const otp = generateOTP()

    try {
      await (OTP as any).createOTP(email, otp)
    } catch (error: any) {
      console.error('Error creating OTP:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create OTP' },
        { status: 500 }
      )
    }

    try {
      await sendOTPEmail(email, otp)
    } catch (error: any) {
      console.error('Error sending OTP email:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send OTP email. Please try again.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'OTP sent successfully',
        userExists: !!user,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in send-otp route:', error)

    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, error: 'Invalid request' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withDBPOST(handler)
