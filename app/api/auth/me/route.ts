import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import { withAuthGET } from '@/lib/middleware/auth'
import { AuthenticationError } from '@/lib/errors/ApiError'
import { NotFoundError } from '@/lib/errors/ApiError'
import { successResponse } from '@/lib/errors/handlers'

export const GET = withAuthGET(async (req) => {
  await connectDB()

  // Get user ID from authenticated request
  const userId = req.userId
  if (!userId) {
    throw new AuthenticationError('User ID not found in token')
  }

  // Find user by ID
  const user = await User.findById(userId)

  if (!user) {
    throw new NotFoundError('User not found')
  }

  // Return user profile
  return successResponse({
    user: {
      id: user._id.toString(),
      email: user.email,
      mobileNumber: user.mobileNumber || undefined,
      name: user.name || undefined,
      avatar: user.avatar || undefined,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  })
})