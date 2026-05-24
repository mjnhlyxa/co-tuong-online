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
    const { deviceId } = await req.json()

    const game = await Game.findOne({ roomId })
    if (!game) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })
    if (game.status === 'finished') return NextResponse.json({ success: true })

    let color: 'red' | 'black' | null = null
    if (deviceId === game.redPlayer.deviceId) color = 'red'
    else if (deviceId === game.blackPlayer.deviceId) color = 'black'
    if (!color) return NextResponse.json({ success: true }) // spectator heartbeat - ignore

    await Game.findOneAndUpdate({ roomId }, { $set: { [`lastSeen.${color}`]: new Date() } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST heartbeat error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
