import bcrypt from 'bcryptjs'
import { sendEmail } from './send'

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 12)
}

export async function sendOTPEmail(email: string, otp: string): Promise<void> {
  const subject = 'Your Email Verification Code'
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 24px;">Email Verification</h2>
          <p style="color: #666; margin-bottom: 16px;">Your verification code is:</p>
          <div style="background-color: #f0f0f0; padding: 16px; border-radius: 4px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: bold; color: #333; letter-spacing: 4px;">${otp}</span>
          </div>
          <p style="color: #999; font-size: 14px;">This code will expire in 5 minutes.</p>
          <p style="color: #999; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 12px; margin: 0;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </body>
    </html>
  `

  const text = `Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this code, you can safely ignore this email.`

  await sendEmail({
    to: email,
    subject,
    text,
    html,
  })
}
