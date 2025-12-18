import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import { verifyAuth } from '@/lib/middleware/auth'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // Verify authentication
    const payload = await verifyAuth(req)
    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing authentication token' },
        { status: 401 }
      )
    }

    // Ensure database connection
    await connectDB()

    // Get user ID from token payload
    const userId = payload.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in token' },
        { status: 401 }
      )
    }

    // Find user by ID
    const user = await User.findById(userId)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Return user profile
    return NextResponse.json({
      success: true,
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
  } catch (error) {
    console.error('Error fetching user profile:', error)

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch user profile' },
      { status: 500 }
    )
  }
}
