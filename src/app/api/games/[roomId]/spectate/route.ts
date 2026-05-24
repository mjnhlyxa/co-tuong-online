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
    const { deviceId, name } = await req.json()

    const game = await Game.findOne({ roomId })
    if (!game) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })

    // If already a player, return player role
    if (deviceId === game.redPlayer.deviceId) return NextResponse.json({ role: 'player', color: 'red' })
    if (deviceId === game.blackPlayer.deviceId) return NextResponse.json({ role: 'player', color: 'black' })

    if (!game.allowSpectators) {
      return NextResponse.json({ error: 'SPECTATORS_DISABLED' }, { status: 403 })
    }

    // Add as spectator if not already in list
    const alreadySpectating = game.spectators.some((s: { deviceId: string }) => s.deviceId === deviceId)
    if (!alreadySpectating) {
      await Game.findOneAndUpdate({ roomId }, {
        $push: { spectators: { deviceId, name: name || 'Người xem', joinedAt: new Date() } }
      })
    }

    return NextResponse.json({ success: true, role: 'spectator' })
  } catch (err) {
    console.error('POST spectate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
