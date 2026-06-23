import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { Room } from '@/models/Room'
import { updateElo } from '../route'

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

    // Update last seen
    await Game.findOneAndUpdate({ roomId }, { $set: { [`lastSeen.${color}`]: new Date() } })

    // Check timeout - if opponent has run out of time, they lose
    if (game.timeControl && game.lastMoveAt && game.status === 'playing') {
      const opponent = color === 'red' ? 'black' : 'red'
      const timeRemainingObj = game.timeRemaining?.toObject?.() ?? game.timeRemaining
      const opponentTime = timeRemainingObj[opponent]
      const elapsed = Date.now() - game.lastMoveAt.getTime()
      const actualRemaining = opponentTime - elapsed

      if (actualRemaining <= 0) {
        // Opponent loses by timeout
        await Game.findOneAndUpdate({ roomId }, {
          $set: { winner: color, endReason: 'timeout', status: 'finished', finishedAt: new Date() }
        })
        await Room.findOneAndUpdate({ roomId }, { status: 'finished' })
        await updateElo(game.redPlayer.deviceId, game.blackPlayer.deviceId, color, game)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST heartbeat error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}