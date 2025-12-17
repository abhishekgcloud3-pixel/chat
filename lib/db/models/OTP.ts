import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IOTP extends Document {
  email: string
  otpHash: string
  expiresAt: Date
  attempts: number
  createdAt: Date
  isExpired: boolean
  isUsed: boolean
  verifyOTP(otp: string): Promise<boolean>
  incrementAttempts(): Promise<void>
}

const OTPSchema = new Schema<IOTP>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration time is required'],
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: [3, 'Maximum 3 attempts allowed'],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only createdAt timestamp
  }
)

// Indexes
OTPSchema.index({ email: 1 })
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }) // TTL index - auto-delete after expiration

// Virtual for checking if OTP is expired
OTPSchema.virtual('isExpired').get(function () {
  return new Date() > this.expiresAt
})

// Virtual for checking if OTP is used (not explicitly tracked but can be derived from attempts)
// If attempts >= 3 or is expired, consider it used
OTPSchema.virtual('isUsed').get(function () {
  return this.attempts >= 3 || this.isExpired
})

// Instance method to verify OTP
OTPSchema.methods.verifyOTP = async function (otp: string): Promise<boolean> {
  // If already expired or max attempts reached, return false
  if (this.isExpired || this.attempts >= 3) {
    return false
  }

  const isValid = await bcrypt.compare(otp, this.otpHash)
  return isValid
}

// Instance method to increment attempts
OTPSchema.methods.incrementAttempts = async function (): Promise<void> {
  if (this.attempts < 3) {
    this.attempts += 1
    await this.save()
  }
}

// Static method to create new OTP
OTPSchema.statics.createOTP = async function (email: string, otp: string): Promise<IOTP> {
  const hashedOTP = await bcrypt.hash(otp, 12) // High cost factor for security
  
  // Create expiration time (5 minutes from now)
  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + 5)

  // Delete any existing OTPs for this email
  await this.deleteMany({ email })

  // Create new OTP
  const otpDoc = new this({
    email,
    otpHash: hashedOTP,
    expiresAt,
    attempts: 0,
  })

  return otpDoc.save()
}

export default mongoose.models.OTP || mongoose.model<IOTP>('OTP', OTPSchema)