import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connection'
import User from '@/lib/db/models/User'
import { verifyAuth, AuthenticatedRequest } from '@/lib/middleware/auth'
import { validateMobileNumber, normalizeMobileNumber } from '@/lib/validators/mobile'
import { validateName } from '@/lib/validators/auth'

export async function POST(req: NextRequest): Promise<NextResponse> {
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

    const body = await req.json()
    const { mobileNumber, name, avatar } = body

    // Validate mobile number
    if (!mobileNumber) {
      return NextResponse.json(
        { error: 'Mobile number is required' },
        { status: 400 }
      )
    }

    if (!validateMobileNumber(mobileNumber)) {
      return NextResponse.json(
        { error: 'Invalid mobile number format (must be 10-15 digits)' },
        { status: 400 }
      )
    }

    // Validate optional name
    if (name !== undefined && name !== null && name.trim() !== '') {
      if (!validateName(name)) {
        return NextResponse.json(
          { error: 'Name must be at least 2 characters' },
          { status: 400 }
        )
      }
    }

    // Validate optional avatar URL
    if (avatar !== undefined && avatar !== null) {
      const urlRegex = /^https?:\/\/.+/
      if (!urlRegex.test(avatar)) {
        return NextResponse.json(
          { error: 'Avatar must be a valid URL' },
          { status: 400 }
        )
      }
    }

    // Get user ID from token payload
    const userId = payload.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in token' },
        { status: 401 }
      )
    }

    // Normalize mobile number
    const normalizedMobileNumber = normalizeMobileNumber(mobileNumber)

    // Prepare update data
    const updateData: any = {
      mobileNumber: normalizedMobileNumber,
    }

    if (name !== undefined && name !== null && name.trim() !== '') {
      updateData.name = name.trim()
    }

    if (avatar !== undefined && avatar !== null) {
      updateData.avatar = avatar
    }

    // Update user with new mobile number
    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )

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
        email: user.email,
        mobileNumber: user.mobileNumber,
        name: user.name || undefined,
        avatar: user.avatar || undefined,
      },
    })
  } catch (error) {
    console.error('Error adding mobile number:', error)
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update user profile' },
      { status: 500 }
    )
  }
}
