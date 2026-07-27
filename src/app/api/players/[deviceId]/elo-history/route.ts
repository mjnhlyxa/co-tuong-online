import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    await connectDB()
    const { deviceId } = await params
    const mongoose = await import('mongoose')
    const db = mongoose.default.connection.db
    if (!db) return NextResponse.json({ history: [] })
    // Read game history with ELO-related fields
    const games = await db.collection('games')
      .find({
        status: 'finished',
        $or: [
          { 'redPlayer.deviceId': deviceId },
          { 'blackPlayer.deviceId': deviceId },
        ],
      })
      .sort({ finishedAt: 1 })
      .project({
        finishedAt: 1,
        'redPlayer.eloAtStart': 1,
        'blackPlayer.eloAtStart': 1,
        'redPlayer.deviceId': 1,
        'blackPlayer.deviceId': 1,
        winner: 1,
      })
      .limit(50)
      .toArray()

    // For ELO history, use a simple approach: walk through games
    // and estimate ELO from wins/losses. Better: server-side store ELO history in Player model.
    // For now, we'll use the eloAtStart of subsequent games.
    const eloHistory: Array<{ date: string; elo: number }> = []
    for (const g of games) {
      const isRed = g.redPlayer?.deviceId === deviceId
      const eloAtStart = isRed ? g.redPlayer?.eloAtStart : g.blackPlayer?.eloAtStart
      if (eloAtStart && g.finishedAt) {
        eloHistory.push({
          date: new Date(g.finishedAt).toISOString(),
          elo: eloAtStart,
        })
      }
    }

    return NextResponse.json({ history: eloHistory })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error', history: [] }, { status: 500 })
  }
}
