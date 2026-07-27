import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    await connectDB()
    const { deviceId } = await params
    const games = await Game.find({
      status: 'finished',
      $or: [
        { 'redPlayer.deviceId': deviceId },
        { 'blackPlayer.deviceId': deviceId },
      ],
    })
      .sort({ finishedAt: -1 })
      .limit(30)
      .lean()

    const history = games.map(g => {
      const isRed = g.redPlayer?.deviceId === deviceId
      const myColor = isRed ? 'red' : 'black'
      const opponent = isRed ? g.blackPlayer : g.redPlayer
      let result: 'win' | 'loss' | 'draw' | null = null
      if (g.winner === 'draw') result = 'draw'
      else if (g.winner === myColor) result = 'win'
      else if (g.winner && g.winner !== 'draw') result = 'loss'
      const duration = g.finishedAt && g.startedAt
        ? (new Date(g.finishedAt).getTime() - new Date(g.startedAt).getTime()) / 1000
        : 0
      return {
        roomId: g.roomId,
        startedAt: g.startedAt,
        finishedAt: g.finishedAt,
        status: g.status,
        winner: g.winner,
        endReason: g.endReason,
        myColor,
        opponent: opponent ? { name: opponent.name, deviceId: opponent.deviceId } : null,
        moves: g.moves?.length ?? 0,
        duration,
        result,
      }
    })

    return NextResponse.json({ games: history })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error', games: [] }, { status: 500 })
  }
}
