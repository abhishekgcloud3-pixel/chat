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
        { success: false, error: 'Invalid email format' },
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP format' },
    const otpString = otp.toString().trim()
    if (!/^\d{6}$/.test(otpString)) {
      return NextResponse.json(
        { error: 'OTP must be 6 digits' },
        { status: 400 }
      )
    }

    await connectDB()

    const emailLower = email.toLowerCase()

    const otpRecord = await OTP.findOne({ email: emailLower })

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: 'OTP not found or expired' },
    const normalizedEmail = email.toLowerCase().trim()

    const otpDoc = await OTP.findOne({ email: normalizedEmail })
      .sort({ createdAt: -1 })

    if (!otpDoc) {
      return NextResponse.json(
        { error: 'No OTP found', message: 'Please request a new OTP' },
        { status: 400 }
      )
    }

    if (otpRecord.isExpired) {
      await OTP.deleteOne({ _id: otpRecord._id })
      return NextResponse.json(
        { success: false, error: 'OTP has expired' },
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

    if (otpRecord.attempts >= 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum OTP verification attempts exceeded',
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

    const isValidOTP = await otpRecord.verifyOTP(otp)

    if (!isValidOTP) {
      await otpRecord.incrementAttempts()
      const remaining = 3 - otpRecord.attempts
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid OTP',
          attemptsRemaining: remaining,
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

    let user = await findUserByEmail(emailLower)

    if (!user) {
      user = await createOrUpdateUser({
        email: emailLower,
      })
    }

    await OTP.deleteOne({ _id: otpRecord._id })

    const token = generateToken(user._id.toString(), user.email)

    const response = {
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
      { success: false, error: 'Internal server error' },
      { error: 'Failed to verify OTP', message: 'Please try again later' },
      { status: 500 }
    )
  }
}

export const POST = withDBPOST(handler)
