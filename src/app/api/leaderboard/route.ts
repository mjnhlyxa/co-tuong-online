import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Player } from '@/models/Player'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50)

    const players = await Player.find({})
      .sort({ 'ranking.elo': -1 })
      .limit(limit)
      .select('name ranking.elo ranking.tier stats.totalGames stats.wins')
      .lean()

    const leaderboard = players.map((p, idx) => ({
      rank: idx + 1,
      name: p.name,
      elo: p.ranking.elo,
      tier: p.ranking.tier,
      totalGames: p.stats.totalGames,
      wins: p.stats.wins,
      winRate: p.stats.totalGames > 0
        ? Math.round((p.stats.wins / p.stats.totalGames) * 100)
        : 0,
    }))

    return NextResponse.json({ leaderboard })
  } catch (err) {
    console.error('GET /api/leaderboard error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}