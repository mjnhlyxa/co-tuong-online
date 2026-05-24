import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB()
    const { roomId } = await params
    const { deviceId, message } = await req.json()

    if (!deviceId || !message?.trim()) {
      return NextResponse.json({ error: 'deviceId and message required' }, { status: 400 })
    }
    if (message.length > 200) {
      return NextResponse.json({ error: 'Message too long (max 200 chars)' }, { status: 400 })
    }

    const game = await Game.findOne({ roomId })
    if (!game) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })

    if (game.mutedDeviceIds.includes(deviceId)) {
      return NextResponse.json({ error: 'MUTED' }, { status: 403 })
    }

    // Determine if player or spectator
    const isPlayer = deviceId === game.redPlayer.deviceId || deviceId === game.blackPlayer.deviceId
    const isSpectator = game.spectators.some((s: { deviceId: string }) => s.deviceId === deviceId)
    if (!isPlayer && !isSpectator) {
      return NextResponse.json({ error: 'NOT_IN_ROOM' }, { status: 403 })
    }

    let name = 'Unknown'
    if (deviceId === game.redPlayer.deviceId) name = game.redPlayer.name
    else if (deviceId === game.blackPlayer.deviceId) name = game.blackPlayer.name
    else {
      const spec = game.spectators.find((s: { deviceId: string; name: string }) => s.deviceId === deviceId)
      if (spec) name = spec.name
    }

    const messageId = uuidv4()
    const chatEntry = { id: messageId, deviceId, name, isPlayer, message: message.trim(), timestamp: new Date() }

    // Push and trim to last 100 messages
    await Game.findOneAndUpdate({ roomId }, {
      $push: {
        chat: {
          $each: [chatEntry],
          $slice: -100,
        }
      }
    })

    return NextResponse.json({ success: true, messageId }, { status: 201 })
  } catch (err) {
    console.error('POST chat error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
