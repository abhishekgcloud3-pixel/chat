import { NextRequest, NextResponse } from 'next/server'
import User from '@/lib/db/models/User'
import { connectDB } from '@/lib/db'
import { Types } from 'mongoose'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const userId = params.id

    if (!userId || !Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    const user = await User.findById(new Types.ObjectId(userId)).select(
      'id email name avatar mobileNumber createdAt'
    )

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        mobileNumber: user.mobileNumber,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}
