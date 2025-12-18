import { NextRequest, NextResponse } from 'next/server'
import { withAuthPOST } from '@/lib/middleware/auth'
import Call from '@/lib/db/models/Call'
import { connectDB } from '@/lib/db'
import { createSupabaseClient } from '@/lib/realtime/supabase'

interface SendSdpRequest {
  callId: string
  type: 'offer' | 'answer'
  sdp: string
}

interface GetSdpRequest {
  callId: string
  type: 'offer' | 'answer'
}

async function handlePost(req: NextRequest & { userId?: string }) {
  try {
    await connectDB()

    const { callId, type, sdp } = (await req.json()) as SendSdpRequest

    if (!callId || !type || !sdp) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['offer', 'answer'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid SDP type' },
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

    // Update SDP
    await (Call as any).updateSDP(callId, type, sdp)

    // Send notification to the other participant via Supabase
    try {
      const supabaseClient = createSupabaseClient()
      if (supabaseClient) {
        const otherUserId = call.initiatorId.toString() === userId 
          ? call.recipientId.toString() 
          : call.initiatorId.toString()

        await supabaseClient
          .channel(`user-calls-${otherUserId}`)
          .send('broadcast', {
            event: `sdp_${type}`,
            payload: {
              callId,
              type,
              sdp,
            },
          })
      }
    } catch (error) {
      console.warn('Failed to send SDP notification:', error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending SDP:', error)
    return NextResponse.json(
      { error: 'Failed to send SDP' },
      { status: 500 }
    )
  }
}

async function handleGet(req: NextRequest & { userId?: string }) {
  try {
    await connectDB()

    const searchParams = req.nextUrl.searchParams
    const callId = searchParams.get('callId')
    const type = searchParams.get('type') as 'offer' | 'answer' | null

    if (!callId || !type || !['offer', 'answer'].includes(type)) {
      return NextResponse.json(
        { error: 'Missing or invalid parameters' },
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

    const sdpField = type === 'offer' ? 'offerSDP' : 'answerSDP'
    const sdp = call[sdpField]

    if (!sdp) {
      return NextResponse.json(
        { error: `${type} SDP not available yet` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      type,
      sdp,
    })
  } catch (error) {
    console.error('Error getting SDP:', error)
    return NextResponse.json(
      { error: 'Failed to get SDP' },
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
