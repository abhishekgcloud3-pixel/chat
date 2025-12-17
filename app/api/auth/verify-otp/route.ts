import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import OTP from '@/lib/db/models/OTP'
import { validateEmail } from '@/lib/validators/auth'
import { createToken } from '@/lib/middleware/auth'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await connectDB()

    const body = await req.json()
    const { email, otp } = body

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const otpString = otp.toString().trim()
    if (!/^\d{6}$/.test(otpString)) {
      return NextResponse.json(
        { error: 'OTP must be 6 digits' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    const otpDoc = await OTP.findOne({ email: normalizedEmail })
      .sort({ createdAt: -1 })

    if (!otpDoc) {
      return NextResponse.json(
        { error: 'No OTP found', message: 'Please request a new OTP' },
        { status: 400 }
      )
    }

    if (otpDoc.isExpired) {
      return NextResponse.json(
        { 
          error: 'OTP expired', 
          message: 'Please request a new OTP',
          expired: true,
        },
        { status: 400 }
      )
    }

    if (otpDoc.attempts >= 3) {
      return NextResponse.json(
        { 
          error: 'Maximum attempts reached', 
          message: 'Please request a new OTP',
          maxAttemptsReached: true,
        },
        { status: 400 }
      )
    }

    const isValid = await otpDoc.verifyOTP(otpString)

    if (!isValid) {
      await otpDoc.incrementAttempts()
      const remainingAttempts = 3 - otpDoc.attempts

      return NextResponse.json(
        { 
          error: 'Invalid OTP', 
          message: `Incorrect OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`,
          remainingAttempts,
        },
        { status: 400 }
      )
    }

    await OTP.deleteMany({ email: normalizedEmail })

    const user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const token = createToken({
      userId: user._id.toString(),
      email: user.email,
    })

    const response = NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        mobileNumber: user.mobileNumber,
        name: user.name,
        avatar: user.avatar,
      },
      requiresMobile: !user.mobileNumber,
    })

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error verifying OTP:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to verify OTP', message: 'Please try again later' },
      { status: 500 }
    )
  }
}
