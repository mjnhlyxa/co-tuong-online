import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB()
    const { roomId } = await params
    const { hostDeviceId, targetDeviceId, action } = await req.json()

    const game = await Game.findOne({ roomId })
    if (!game) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })

    // Only host (redPlayer = room creator) can mute
    if (hostDeviceId !== game.redPlayer.deviceId) {
      return NextResponse.json({ error: 'NOT_HOST' }, { status: 403 })
    }

    if (action === 'mute') {
      await Game.findOneAndUpdate({ roomId }, {
        $addToSet: { mutedDeviceIds: targetDeviceId }
      })
    } else if (action === 'unmute') {
      await Game.findOneAndUpdate({ roomId }, {
        $pull: { mutedDeviceIds: targetDeviceId }
      })
    } else {
      return NextResponse.json({ error: 'action must be mute or unmute' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST mute error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
