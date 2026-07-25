import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Tournament, TournamentParticipant, TournamentMatch } from '@/models/Tournament'
import { Player } from '@/models/Player'

export async function GET(req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  try {
    await connectDB()
    const { tournamentId } = await params
    const { searchParams } = new URL(req.url)
    const deviceId = searchParams.get('deviceId')

    const tournament = await Tournament.findOne({ tournamentId }).lean()
    if (!tournament) return NextResponse.json({ error: 'TOURNAMENT_NOT_FOUND' }, { status: 404 })

    const participants = await TournamentParticipant.find({ tournamentId })
      .sort({ seed: 1 })
      .lean()

    const matches = await TournamentMatch.find({ tournamentId })
      .sort({ phase: 1, roundNumber: 1, groupId: 1 })
      .lean()

    // Determine viewer role
    let viewerRole: 'HOST' | 'PARTICIPANT' | 'SPECTATOR' = 'SPECTATOR'
    const isHost = deviceId === tournament.hostDeviceId
    const isParticipant = deviceId ? participants.some(p => p.deviceId === deviceId) : false
    if (isHost) viewerRole = 'HOST'
    else if (isParticipant) viewerRole = 'PARTICIPANT'

    return NextResponse.json({
      tournament: {
        tournamentId: tournament.tournamentId,
        name: tournament.name,
        description: tournament.description,
        hostName: tournament.hostNameSnapshot,
        hostDeviceId: isHost ? tournament.hostDeviceId : undefined, // only send to host
        status: tournament.status,
        format: tournament.format,
        settings: tournament.settings,
        registration: tournament.registration,
        phase: tournament.phase,
        participantCount: tournament.participantCount,
        createdAt: tournament.createdAt,
        startedAt: tournament.startedAt,
        finishedAt: tournament.finishedAt,
        cancelledAt: tournament.cancelledAt,
        cancelReason: tournament.cancelReason,
      },
      participants: participants.map(p => ({
        participantId: (p._id as { toString: () => string }).toString(),
        deviceId: isHost || p.deviceId === deviceId ? p.deviceId : undefined,
        nameSnapshot: p.nameSnapshot,
        seed: p.seed,
        status: p.status,
        groupId: p.groupId,
        groupSeed: p.groupSeed,
        stats: p.stats,
        joinedAt: p.joinedAt,
      })),
      matches: matches.map(m => ({
        matchId: m.matchId,
        phase: m.phase,
        roundNumber: m.roundNumber,
        roundLabel: m.roundLabel,
        groupId: m.groupId,
        bracketSlot: m.bracketSlot,
        player1: m.player1,
        player2: m.player2,
        status: m.status,
        scheduledAt: m.scheduledAt,
        startedAt: m.startedAt,
        completedAt: m.completedAt,
        gameId: m.gameId,
        result: m.result,
        nextMatchId: m.nextMatchId,
      })),
      viewerRole,
    })
  } catch (err) {
    console.error('GET /api/tournaments/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
