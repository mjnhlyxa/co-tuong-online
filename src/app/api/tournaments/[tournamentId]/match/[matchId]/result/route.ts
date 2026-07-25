import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Tournament, TournamentMatch, TournamentParticipant } from '@/models/Tournament'

export async function POST(req: NextRequest, { params }: { params: Promise<{ tournamentId: string; matchId: string }> }) {
  try {
    await connectDB()
    const { tournamentId, matchId } = await params
    const body = await req.json()
    const { deviceId, winner, score1, score2, endReason, notes } = body

    if (!deviceId) return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
    if (!['PLAYER1', 'PLAYER2', 'DRAW'].includes(winner)) {
      return NextResponse.json({ error: 'winner phải là PLAYER1, PLAYER2 hoặc DRAW' }, { status: 400 })
    }

    const tournament = await Tournament.findOne({ tournamentId }).lean()
    if (!tournament) return NextResponse.json({ error: 'TOURNAMENT_NOT_FOUND' }, { status: 404 })
    if (tournament.hostDeviceId !== deviceId) {
      return NextResponse.json({ error: 'Chỉ host mới có thể cập nhật kết quả' }, { status: 403 })
    }

    const match = await TournamentMatch.findOne({ matchId, tournamentId })
    if (!match) return NextResponse.json({ error: 'MATCH_NOT_FOUND' }, { status: 404 })
    if (match.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Trận đã có kết quả', current: { winner: match.result.winner } }, { status: 400 })
    }

    // Update match result
    match.status = 'COMPLETED'
    match.completedAt = new Date()
    match.result = {
      winner,
      score1: score1 ?? null,
      score2: score2 ?? null,
      resultType: 'HOST_REPORTED',
      endReason: endReason ?? null,
      submittedByDeviceId: deviceId,
      submittedAt: new Date(),
      notes: notes ?? null,
      version: match.result.version + 1,
    }
    await match.save()

    // Update participant stats
    const p1DeviceId = match.player1?.deviceId
    const p2DeviceId = match.player2?.deviceId
    const winPoints = tournament.settings.winPoints
    const drawPoints = tournament.settings.drawPoints

    if (winner === 'PLAYER1' && p1DeviceId) {
      await TournamentParticipant.updateOne(
        { tournamentId, deviceId: p1DeviceId },
        { $inc: { 'stats.played': 1, 'stats.wins': 1, 'stats.points': winPoints } }
      )
      if (p2DeviceId) {
        await TournamentParticipant.updateOne(
          { tournamentId, deviceId: p2DeviceId },
          { $inc: { 'stats.played': 1, 'stats.losses': 1 } }
        )
      }
    } else if (winner === 'PLAYER2' && p2DeviceId) {
      await TournamentParticipant.updateOne(
        { tournamentId, deviceId: p2DeviceId },
        { $inc: { 'stats.played': 1, 'stats.wins': 1, 'stats.points': winPoints } }
      )
      if (p1DeviceId) {
        await TournamentParticipant.updateOne(
          { tournamentId, deviceId: p1DeviceId },
          { $inc: { 'stats.played': 1, 'stats.losses': 1 } }
        )
      }
    } else if (winner === 'DRAW') {
      if (p1DeviceId) {
        await TournamentParticipant.updateOne(
          { tournamentId, deviceId: p1DeviceId },
          { $inc: { 'stats.played': 1, 'stats.draws': 1, 'stats.points': drawPoints } }
        )
      }
      if (p2DeviceId) {
        await TournamentParticipant.updateOne(
          { tournamentId, deviceId: p2DeviceId },
          { $inc: { 'stats.played': 1, 'stats.draws': 1, 'stats.points': drawPoints } }
        )
      }
    }

    return NextResponse.json({
      ok: true,
      matchId,
      winner,
      status: match.status,
    })
  } catch (err) {
    console.error('POST /api/tournaments/[id]/match/[matchId]/result error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
