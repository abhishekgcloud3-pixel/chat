import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import OTP from '@/lib/db/models/OTP'
import { validateEmail } from '@/lib/validators/auth'
import { sendEmail } from '@/lib/email/send'

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await connectDB()

    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    let user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      user = await User.create({
        email: normalizedEmail,
        isActive: true,
      })
    }

    const otp = generateOTP()

    await (OTP as any).createOTP(normalizedEmail, otp)

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

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
      email: normalizedEmail,
    })
  } catch (error) {
    console.error('Error sending OTP:', error)

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to send OTP', message: 'Please try again later' },
      { status: 500 }
    )
  }
}
