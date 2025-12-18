import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import OTP from '@/lib/db/models/OTP'
import { validateEmail } from '@/lib/validators/auth'
import { sendEmail } from '@/lib/email/send'
import { asyncHandler, successResponse } from '@/lib/errors/handlers'
import { ValidationError, ServerError } from '@/lib/errors/ApiError'

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const POST = asyncHandler(async (req: NextRequest) => {
  await connectDB()

  const body = await req.json()
  const { email } = body

  // Validation
  if (!email) {
    throw new ValidationError('Email is required')
  }

  if (!validateEmail(email)) {
    throw new ValidationError('Invalid email format')
  }

  const normalizedEmail = email.toLowerCase().trim()

  // Create or get user
  let user = await User.findOne({ email: normalizedEmail })
  if (!user) {
    user = await User.create({
      email: normalizedEmail,
      isActive: true,
    })
  }

  // Generate and store OTP
  const otp = generateOTP()

  await (OTP as any).createOTP(normalizedEmail, otp)

  // Send email
  await sendEmail({
    to: normalizedEmail,
    subject: 'Your Login OTP',
    text: `Your OTP is: ${otp}. It will expire in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Your Login OTP</h2>
        <p>Your OTP is: <strong style="font-size: 24px; letter-spacing: 2px;">${otp}</strong></p>
        <p>This OTP will expire in 5 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  })

  return successResponse({
    email: normalizedEmail,
  }, 'OTP sent to your email')
})