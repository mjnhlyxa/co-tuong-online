import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { Room } from '@/models/Room'
import { updateElo } from '../route'

const ABANDONED_TIMEOUT_MS = 90_000

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

    // Reload game to get fresh state after lastSeen update
    const freshGame = await Game.findOne({ roomId })
    if (!freshGame || freshGame.status !== 'playing') return NextResponse.json({ success: true })

    // Abandoned detection: if the OPPONENT of the heartbeating player hasn't sent a heartbeat
    // in 90s, they lose. The heartbeating player wins.
    // (We only check the opponent, not self — self just heartbeated, so they're definitely online.)
    const opponent = color === 'red' ? 'black' : 'red'
    const now = Date.now()
    const opponentLastSeen = freshGame.lastSeen?.[opponent]
    if (opponentLastSeen && now - new Date(opponentLastSeen).getTime() > ABANDONED_TIMEOUT_MS) {
      await Game.findOneAndUpdate({ roomId }, {
        $set: { winner: color, endReason: 'abandoned', status: 'finished', finishedAt: new Date() }
      })
      await Room.findOneAndUpdate({ roomId }, { status: 'finished' })
      await updateElo(freshGame.redPlayer.deviceId, freshGame.blackPlayer.deviceId, color, freshGame)
      return NextResponse.json({ success: true })
    }

    // Check timeout - if opponent has run out of time, they lose
    if (freshGame.timeControl && freshGame.lastMoveAt) {
      const timeRemainingObj = freshGame.timeRemaining?.toObject?.() ?? freshGame.timeRemaining
      const opponentTime = timeRemainingObj[opponent]
      const elapsed = Date.now() - freshGame.lastMoveAt.getTime()
      const actualRemaining = opponentTime - elapsed

      if (actualRemaining <= 0) {
        // Opponent loses by timeout
        await Game.findOneAndUpdate({ roomId }, {
          $set: { winner: color, endReason: 'timeout', status: 'finished', finishedAt: new Date() }
        })
        await Room.findOneAndUpdate({ roomId }, { status: 'finished' })
        await updateElo(freshGame.redPlayer.deviceId, freshGame.blackPlayer.deviceId, color, freshGame)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST heartbeat error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}