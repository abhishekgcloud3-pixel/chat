import { NextRequest, NextResponse } from 'next/server'
import { withDBPOST } from '@/lib/db/middleware'
import { connectDB } from '@/lib/db/connection'
import { validateEmail } from '@/lib/validators/auth'
import { findUserByEmail, createOrUpdateUser, OTP } from '@/lib/db'
import { generateToken } from '@/lib/auth/jwt'

async function handler(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, otp } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!otp) {
      return NextResponse.json(
        { success: false, error: 'OTP is required' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP format' },
        { status: 400 }
      )
    }

    await connectDB()

    const emailLower = email.toLowerCase()

    const otpRecord = await OTP.findOne({ email: emailLower })

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: 'OTP not found or expired' },
        { status: 400 }
      )
    }

    if (otpRecord.isExpired) {
      await OTP.deleteOne({ _id: otpRecord._id })
      return NextResponse.json(
        { success: false, error: 'OTP has expired' },
        { status: 400 }
      )
    }

    if (otpRecord.attempts >= 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum OTP verification attempts exceeded',
        },
        { status: 400 }
      )
    }

    const isValidOTP = await otpRecord.verifyOTP(otp)

    if (!isValidOTP) {
      await otpRecord.incrementAttempts()
      const remaining = 3 - otpRecord.attempts
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid OTP',
          attemptsRemaining: remaining,
        },
        { status: 400 }
      )
    }

    let user = await findUserByEmail(emailLower)

    if (!user) {
      user = await createOrUpdateUser({
        email: emailLower,
      })
    }

    await OTP.deleteOne({ _id: otpRecord._id })

    const token = generateToken(user._id.toString(), user.email)

    const response = {
      success: true,
      message: 'OTP verified successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name || null,
        mobileNumber: user.mobileNumber || null,
        avatar: user.avatar || null,
      },
      nextStep: user.mobileNumber ? 'dashboard' : 'add-mobile',
    }

    const res = NextResponse.json(response, { status: 200 })

    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })

    return res
  } catch (error: any) {
    console.error('Error in verify-otp route:', error)

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
