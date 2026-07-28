import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Tournament, TournamentMatch, TournamentParticipant } from '@/models/Tournament'

/**
 * Update match result. Allowed:
 * - Host can create OR update the result (for offline play or correction)
 * - Players (player1/player2) can also submit result for their own match
 *   (e.g., if game ended and they want to record a specific score)
 *
 * Updates participant stats accordingly. Idempotent: if already completed with same
 * result, return success without re-incrementing stats.
 */
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

    const match = await TournamentMatch.findOne({ matchId, tournamentId })
    if (!match) return NextResponse.json({ error: 'MATCH_NOT_FOUND' }, { status: 404 })

    // Authorization: host OR either player can update
    const isHost = tournament.hostDeviceId === deviceId
    const isPlayer1 = match.player1?.deviceId === deviceId
    const isPlayer2 = match.player2?.deviceId === deviceId
    if (!isHost && !isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: 'Không có quyền cập nhật kết quả' }, { status: 403 })
    }

    // Idempotency: if already completed with same winner, just return ok
    if (match.status === 'COMPLETED' && match.result.winner === winner) {
      return NextResponse.json({
        ok: true,
        matchId,
        winner,
        status: match.status,
        unchanged: true,
      })
    }

    // If updating existing result, decrement old stats first
    if (match.status === 'COMPLETED' && match.result.winner !== winner) {
      await reverseStats(tournamentId, match, tournament.settings.winPoints, tournament.settings.drawPoints)
    }

    // Also update the underlying game's status to 'finished' if it's a tournament match.
    // This handles the case where the game ended via non-checkmate means (resign, timeout,
    // material decision) and we need to mark it as finished so replay/stats work correctly.
    if (match.gameId) {
      const { Game } = await import('@/models/Game')
      const endReason =
        winner === 'DRAW' ? 'draw_agreement' :
        winner === 'PLAYER1' ? 'tournament_report' :
        'tournament_report'
      const gameWinner =
        winner === 'PLAYER1' ? 'red' :
        winner === 'PLAYER2' ? 'black' :
        'draw'
      await Game.findOneAndUpdate(
        { roomId: match.gameId, status: { $ne: 'finished' } },
        {
          $set: {
            status: 'finished',
            winner: gameWinner,
            endReason,
            finishedAt: new Date(),
          },
        }
      )
    }

    match.status = 'COMPLETED'
    match.completedAt = new Date()
    match.result = {
      winner,
      score1: score1 ?? null,
      score2: score2 ?? null,
      resultType: isHost ? 'HOST_REPORTED' : 'PLAYER_REPORTED',
      endReason: endReason ?? null,
      submittedByDeviceId: deviceId,
      submittedAt: new Date(),
      notes: notes ?? null,
      version: (match.result.version ?? 0) + 1,
    }
    await match.save()

    // Apply new stats
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

async function reverseStats(
  tournamentId: string,
  match: { player1?: { deviceId: string }; player2?: { deviceId: string } | null; result: { winner: 'PLAYER1' | 'PLAYER2' | 'DRAW' | 'NONE' } },
  winPoints: number,
  drawPoints: number
) {
  const p1 = match.player1?.deviceId
  const p2 = match.player2?.deviceId
  const w = match.result.winner
  if (w === 'PLAYER1' && p1) {
    await TournamentParticipant.updateOne(
      { tournamentId, deviceId: p1 },
      { $inc: { 'stats.played': -1, 'stats.wins': -1, 'stats.points': -winPoints } }
    )
    if (p2) {
      await TournamentParticipant.updateOne(
        { tournamentId, deviceId: p2 },
        { $inc: { 'stats.played': -1, 'stats.losses': -1 } }
      )
    }
  } else if (w === 'PLAYER2' && p2) {
    await TournamentParticipant.updateOne(
      { tournamentId, deviceId: p2 },
      { $inc: { 'stats.played': -1, 'stats.wins': -1, 'stats.points': -winPoints } }
    )
    if (p1) {
      await TournamentParticipant.updateOne(
        { tournamentId, deviceId: p1 },
        { $inc: { 'stats.played': -1, 'stats.losses': -1 } }
      )
    }
  } else if (w === 'DRAW') {
    if (p1) {
      await TournamentParticipant.updateOne(
        { tournamentId, deviceId: p1 },
        { $inc: { 'stats.played': -1, 'stats.draws': -1, 'stats.points': -drawPoints } }
      )
    }
    if (p2) {
      await TournamentParticipant.updateOne(
        { tournamentId, deviceId: p2 },
        { $inc: { 'stats.played': -1, 'stats.draws': -1, 'stats.points': -drawPoints } }
      )
    }
  }
}
