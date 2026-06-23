import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Player } from '@/models/Player'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0'), 0)

    const [players, total] = await Promise.all([
      Player.find({})
        .sort({ 'ranking.elo': -1 })
        .skip(offset)
        .limit(limit)
        .select('name ranking.elo ranking.tier stats.totalGames stats.wins')
        .lean(),
      Player.countDocuments({}),
    ])

    const leaderboard = players.map((p, idx) => ({
      rank: offset + idx + 1,
      name: p.name,
      elo: p.ranking.elo,
      tier: p.ranking.tier,
      totalGames: p.stats.totalGames,
      wins: p.stats.wins,
      winRate: p.stats.totalGames > 0
        ? Math.round((p.stats.wins / p.stats.totalGames) * 100)
        : 0,
    }))

    return NextResponse.json({
      leaderboard,
      total,
      hasMore: offset + leaderboard.length < total,
    })
  } catch (err) {
    console.error('GET /api/leaderboard error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}