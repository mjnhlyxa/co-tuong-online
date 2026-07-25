import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Tournament, TournamentParticipant } from '@/models/Tournament'

export async function GET(req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  try {
    await connectDB()
    const { tournamentId } = await params
    const { searchParams } = new URL(req.url)
    const groupId = searchParams.get('groupId')

    const tournament = await Tournament.findOne({ tournamentId }).lean()
    if (!tournament) return NextResponse.json({ error: 'TOURNAMENT_NOT_FOUND' }, { status: 404 })

    const query: Record<string, unknown> = { tournamentId }
    if (groupId) query.groupId = groupId

    const participants = await TournamentParticipant.find(query)
      .sort({ 'stats.points': -1, 'stats.wins': -1, seed: 1 })
      .lean()

    const standings = participants.map((p, idx) => ({
      rank: idx + 1,
      participantId: (p._id as { toString: () => string }).toString(),
      nameSnapshot: p.nameSnapshot,
      seed: p.seed,
      groupId: p.groupId,
      groupSeed: p.groupSeed,
      status: p.status,
      stats: p.stats,
    }))

    // If tournament has finished, mark champion
    if (tournament.status === 'FINISHED' && standings.length > 0) {
      standings[0].rank = 1
      ;(standings[0] as { isChampion?: boolean }).isChampion = true
    }

    return NextResponse.json({
      standings,
      format: tournament.format,
      settings: tournament.settings,
      status: tournament.status,
    })
  } catch (err) {
    console.error('GET /api/tournaments/[id]/standings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
