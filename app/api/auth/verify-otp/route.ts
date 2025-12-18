import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import OTP from '@/lib/db/models/OTP'
import { validateEmail } from '@/lib/validators/auth'
import { createToken } from '@/lib/middleware/auth'
import { asyncHandler, successResponse } from '@/lib/errors/handlers'
import { ValidationError, ServerError } from '@/lib/errors/ApiError'

export const POST = asyncHandler(async (req: NextRequest) => {
  await connectDB()

  const body = await req.json()
  const { email, otp } = body

  // Validation
  if (!email || !otp) {
    throw new ValidationError('Email and OTP are required')
  }

  if (!validateEmail(email)) {
    throw new ValidationError('Invalid email format')
  }

  if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
    throw new ValidationError('OTP must be 6 digits')
  }

  const normalizedEmail = email.toLowerCase().trim()
  const otpString = otp.toString().trim()

  // Find OTP record
  const otpDoc = await OTP.findOne({ email: normalizedEmail })
    .sort({ createdAt: -1 })

  if (!otpDoc) {
    throw new ValidationError('No OTP found. Please request a new OTP')
  }

  // Check if OTP is expired
  if (otpDoc.isExpired) {
    await OTP.deleteMany({ email: normalizedEmail })
    throw new ValidationError('OTP has expired. Please request a new OTP')
  }

  // Check max attempts
  if (otpDoc.attempts >= 3) {
    await OTP.deleteMany({ email: normalizedEmail })
    throw new ValidationError('Maximum attempts reached. Please request a new OTP')
  }

  // Verify OTP
  const isValid = await otpDoc.verifyOTP(otpString)

  if (!isValid) {
    await otpDoc.incrementAttempts()
    const remainingAttempts = 3 - otpDoc.attempts

    if (remainingAttempts <= 0) {
      await OTP.deleteMany({ email: normalizedEmail })
      throw new ValidationError('Maximum attempts reached. Please request a new OTP')
    }

    throw new ValidationError(`Invalid OTP. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`)
  }

  // OTP is valid, proceed with user creation/login
  let user = await User.findOne({ email: normalizedEmail })

  if (!user) {
    user = await User.create({
      email: normalizedEmail,
      isActive: true,
    })
  }

  // Clean up OTP records
  await OTP.deleteMany({ email: normalizedEmail })

  // Generate token
  const token = createToken({
    userId: user._id.toString(),
    email: user.email,
  })

  // Create success response
  const response = successResponse({
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name || null,
      mobileNumber: user.mobileNumber || null,
      avatar: user.avatar || null,
    },
    requiresMobile: !user.mobileNumber,
  }, 'OTP verified successfully')

  // Set cookie
  const nextResponse = NextResponse.json(response)
  nextResponse.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60,
    path: '/',
  })

  return nextResponse
})