import { NextRequest, NextResponse } from 'next/server'
import { withAuthPOST } from '@/lib/middleware/auth'
import Call from '@/lib/db/models/Call'
import { connectDB } from '@/lib/db'
import { createSupabaseClient } from '@/lib/realtime/supabase'

interface SendIceCandidateRequest {
  callId: string
  candidate: string
  sdpMLineIndex?: number
  sdpMid?: string
}

interface GetIceCandidatesRequest {
  callId: string
}

async function handlePost(req: NextRequest & { userId?: string }) {
  try {
    await connectDB()

    const { callId, candidate, sdpMLineIndex, sdpMid } = (await req.json()) as SendIceCandidateRequest

    if (!callId || !candidate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const userId = req.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find the call
    const call = await (Call as any).getCallById(callId)
    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      )
    }

    // Add ICE candidate
    await (Call as any).addIceCandidate(callId, candidate, sdpMLineIndex, sdpMid)

    // Send the ICE candidate to the other participant via Supabase
    try {
      const supabaseClient = createSupabaseClient()
      if (supabaseClient) {
        const otherUserId = call.initiatorId.toString() === userId 
          ? call.recipientId.toString() 
          : call.initiatorId.toString()

        await supabaseClient
          .channel(`user-calls-${otherUserId}`)
          .send('broadcast', {
            event: 'ice_candidate',
            payload: {
              callId,
              candidate,
              sdpMLineIndex,
              sdpMid,
            },
          })
      }
    } catch (error) {
      console.warn('Failed to send ICE candidate:', error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending ICE candidate:', error)
    return NextResponse.json(
      { error: 'Failed to send ICE candidate' },
      { status: 500 }
    )
  }
}

async function handleGet(req: NextRequest & { userId?: string }) {
  try {
    await connectDB()

    const searchParams = req.nextUrl.searchParams
    const callId = searchParams.get('callId')

    if (!callId) {
      return NextResponse.json(
        { error: 'Missing callId' },
        { status: 400 }
      )
    }

    const userId = req.userId
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find the call
    const call = await (Call as any).getCallById(callId)
    if (!call) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      iceCandidates: call.iceCandidates || [],
    })
  } catch (error) {
    console.error('Error getting ICE candidates:', error)
    return NextResponse.json(
      { error: 'Failed to get ICE candidates' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest & { userId?: string }) {
  return withAuthPOST(async (authReq: NextRequest & { userId?: string }) => {
    return handlePost(authReq)
  })(req)
}

export async function GET(req: NextRequest & { userId?: string }) {
  const payload = await require('@/lib/middleware/auth').verifyAuth(req)
  if (!payload) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const authReq = req as NextRequest & { userId?: string }
  authReq.userId = payload.userId

  return handleGet(authReq)
}
