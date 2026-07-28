import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { Player } from '@/models/Player'
import { Room } from '@/models/Room'
import { calculateElo, getTier } from '@/lib/elo'

const ABANDONED_TIMEOUT_MS = 90_000

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB()
    const { roomId } = await params
    const { searchParams } = new URL(req.url)
    const deviceId = searchParams.get('deviceId')

    let game = await Game.findOne({ roomId })
    if (!game) {
      // Check if room exists but game hasn't been created yet (waiting for opponent)
      const { Room } = await import('@/models/Room')
      const room = await Room.findOne({ roomId }).lean()
      if (room) {
        return NextResponse.json({
          roomId,
          status: 'waiting',
          message: 'Waiting for opponent to join',
          host: room.host,
        })
      }
      return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })
    }

    // Helper to mark room as finished
    async function markRoomFinished() {
      await Room.findOneAndUpdate({ roomId }, { status: 'finished' })
    }

    // Note: abandoned detection and timeout are now handled by POST /heartbeat only.
    // GET is a read-only endpoint — it must not mutate game state, otherwise an opponent's
    // poll could end the game while the active player is still thinking.
    // (Previously the abandoned check ran on every GET, which caused spurious resigns when
    // the 30s threshold raced against the 20s heartbeat interval.)

    // Reload in case we mutated
    game = await Game.findOne({ roomId })
    if (!game) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })

    // Determine viewer role
    let myColor: string | null = null
    if (deviceId === game.redPlayer.deviceId) myColor = 'red'
    else if (deviceId === game.blackPlayer.deviceId) myColor = 'black'

    // If this game is a tournament match, update lastSeen for the viewer and
    // transition the match from READY to STARTED when both players are present.
    // Also transition game status from 'waiting' to 'playing' when both
    // players are detected.
    if (deviceId && myColor) {
      const color = myColor as 'red' | 'black'
      const now = new Date()
      await Game.findOneAndUpdate({ roomId }, { $set: { [`lastSeen.${color}`]: now } })

      // Transition 'waiting' -> 'playing' when BOTH players have a recent lastSeen
      const fresh = await Game.findOne({ roomId })
      if (fresh && fresh.status === 'waiting') {
        const redSeen = fresh.lastSeen?.red
        const blackSeen = fresh.lastSeen?.black
        const RECENT_MS = 5 * 60 * 1000 // 5 min — players just joined, so they ARE online
        if (
          redSeen && blackSeen &&
          now.getTime() - new Date(redSeen).getTime() < RECENT_MS &&
          now.getTime() - new Date(blackSeen).getTime() < RECENT_MS
        ) {
          await Game.findOneAndUpdate({ roomId }, { $set: { status: 'playing', startedAt: fresh.startedAt ?? now } })
        }
      }

      await maybeAdvanceTournamentMatch(roomId, color)
    }

    // If game is finished, ensure tournament result is submitted (handles edge cases
    // like resign-via-heartbeat-timeout where the move route didn't run).
    if (game.status === 'finished' && game.winner) {
      const { TournamentMatch } = await import('@/models/Tournament')
      const tm = await TournamentMatch.findOne({ gameId: roomId })
      if (tm && tm.status !== 'COMPLETED') {
        await submitTournamentResultOnFinish(roomId, game.winner, game.endReason, deviceId ?? game.redPlayer.deviceId)
      }
    }

    const timeRemaining = game.timeRemaining.toObject?.() ?? game.timeRemaining

    return NextResponse.json({
      roomId: game.roomId,
      status: game.status,
      currentTurn: game.currentTurn,
      currentMoveNumber: game.currentMoveNumber,
      boardState: game.boardState,
      moves: game.moves.map((m: {
        moveNumber: number; color: string; from: object; to: object;
        piece: string; captured: string | null; notation: string; isCheck: boolean; timestamp: Date
      }) => ({
        moveNumber: m.moveNumber,
        color: m.color,
        from: m.from,
        to: m.to,
        piece: m.piece,
        captured: m.captured,
        notation: m.notation,
        isCheck: m.isCheck,
        timestamp: m.timestamp,
      })),
      redPlayer: { deviceId: game.redPlayer.deviceId, name: game.redPlayer.name, eloAtStart: game.redPlayer.eloAtStart },
      blackPlayer: { deviceId: game.blackPlayer.deviceId, name: game.blackPlayer.name, eloAtStart: game.blackPlayer.eloAtStart },
      winner: game.winner,
      endReason: game.endReason,
      myColor,
      timeControl: game.timeControl,
      timeRemaining,
      lastMoveAt: game.lastMoveAt,
      allowSpectators: game.allowSpectators,
      allowTakeback: game.allowTakeback,
      spectators: game.spectators,
      chat: game.chat.slice(-50),
      mutedDeviceIds: game.mutedDeviceIds,
      takebackRequest: game.takebackRequest,
      takebacksUsed: game.takebacksUsed,
      startedAt: game.startedAt,
      finishedAt: game.finishedAt,
    })
  } catch (err) {
    console.error('GET /api/games/[roomId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function updateElo(
  redDeviceId: string,
  blackDeviceId: string,
  winner: 'red' | 'black' | 'draw',
  game: { redPlayer: { eloAtStart: number }; blackPlayer: { eloAtStart: number } }
) {
  try {
    const [redPlayer, blackPlayer] = await Promise.all([
      Player.findOne({ deviceId: redDeviceId }),
      Player.findOne({ deviceId: blackDeviceId }),
    ])
    if (!redPlayer || !blackPlayer) return

    const redResult: 1 | 0.5 | 0 = winner === 'red' ? 1 : winner === 'draw' ? 0.5 : 0
    const blackResult: 1 | 0.5 | 0 = winner === 'black' ? 1 : winner === 'draw' ? 0.5 : 0

    const newRedElo = calculateElo(game.redPlayer.eloAtStart, game.blackPlayer.eloAtStart, redResult, redPlayer.stats.totalGames)
    const newBlackElo = calculateElo(game.blackPlayer.eloAtStart, game.redPlayer.eloAtStart, blackResult, blackPlayer.stats.totalGames)

    await Promise.all([
      Player.findOneAndUpdate({ deviceId: redDeviceId }, {
        $set: {
          'ranking.elo': newRedElo,
          'ranking.tier': getTier(newRedElo),
          'ranking.peakElo': Math.max(redPlayer.ranking.peakElo, newRedElo),
        },
        $inc: {
          'stats.totalGames': 1,
          'stats.wins': winner === 'red' ? 1 : 0,
          'stats.losses': winner === 'black' ? 1 : 0,
          'stats.draws': winner === 'draw' ? 1 : 0,
        },
      }),
      Player.findOneAndUpdate({ deviceId: blackDeviceId }, {
        $set: {
          'ranking.elo': newBlackElo,
          'ranking.tier': getTier(newBlackElo),
          'ranking.peakElo': Math.max(blackPlayer.ranking.peakElo, newBlackElo),
        },
        $inc: {
          'stats.totalGames': 1,
          'stats.wins': winner === 'black' ? 1 : 0,
          'stats.losses': winner === 'red' ? 1 : 0,
          'stats.draws': winner === 'draw' ? 1 : 0,
        },
      }),
    ])
  } catch (err) {
    console.error('ELO update error:', err)
  }
}

/**
 * If this game is a tournament match and currently READY, check if both players have
 * a recent heartbeat. If yes, transition the match to STARTED.
 */
async function maybeAdvanceTournamentMatch(roomId: string, viewerColor: 'red' | 'black') {
  try {
    const { TournamentMatch } = await import('@/models/Tournament')
    const match = await TournamentMatch.findOne({ gameId: roomId })
    if (!match || match.status !== 'READY') return

    const game = await Game.findOne({ roomId })
    if (!game) return

    const now = Date.now()
    const redSeen = game.lastSeen?.red?.getTime?.() ?? game.lastSeen?.red
    const blackSeen = game.lastSeen?.black?.getTime?.() ?? game.lastSeen?.black
    const RECENT_MS = 60_000
    const bothPresent =
      redSeen && now - new Date(redSeen).getTime() < RECENT_MS &&
      blackSeen && now - new Date(blackSeen).getTime() < RECENT_MS

    if (bothPresent) {
      match.status = 'STARTED'
      match.startedAt = match.startedAt ?? new Date()
      await match.save()
    }
  } catch (err) {
    console.error('maybeAdvanceTournamentMatch error:', err)
  }
}

async function submitTournamentResultOnFinish(
  roomId: string,
  winner: 'red' | 'black' | 'draw',
  endReason: string | null,
  submittedByDeviceId: string
) {
  try {
    const { Tournament, TournamentMatch, TournamentParticipant } = await import('@/models/Tournament')
    const match = await TournamentMatch.findOne({ gameId: roomId })
    if (!match || match.status === 'COMPLETED') return
    const tournament = await Tournament.findOne({ tournamentId: match.tournamentId }).lean()
    if (!tournament) return

    const winnerSide = winner === 'red' ? 'PLAYER1' : winner === 'black' ? 'PLAYER2' : 'DRAW'
    match.status = 'COMPLETED'
    match.completedAt = new Date()
    match.result = {
      winner: winnerSide,
      score1: null,
      score2: null,
      resultType: 'GAME_ENDED',
      endReason: endReason ?? null,
      submittedByDeviceId,
      submittedAt: new Date(),
      version: (match.result.version ?? 0) + 1,
    }
    await match.save()

    const winPoints = tournament.settings.winPoints
    const drawPoints = tournament.settings.drawPoints
    const p1 = match.player1?.deviceId
    const p2 = match.player2?.deviceId

    if (winnerSide === 'PLAYER1' && p1) {
      await TournamentParticipant.updateOne(
        { tournamentId: match.tournamentId, deviceId: p1 },
        { $inc: { 'stats.played': 1, 'stats.wins': 1, 'stats.points': winPoints } }
      )
      if (p2) {
        await TournamentParticipant.updateOne(
          { tournamentId: match.tournamentId, deviceId: p2 },
          { $inc: { 'stats.played': 1, 'stats.losses': 1 } }
        )
      }
    } else if (winnerSide === 'PLAYER2' && p2) {
      await TournamentParticipant.updateOne(
        { tournamentId: match.tournamentId, deviceId: p2 },
        { $inc: { 'stats.played': 1, 'stats.wins': 1, 'stats.points': winPoints } }
      )
      if (p1) {
        await TournamentParticipant.updateOne(
          { tournamentId: match.tournamentId, deviceId: p1 },
          { $inc: { 'stats.played': 1, 'stats.losses': 1 } }
        )
      }
    } else if (winnerSide === 'DRAW') {
      if (p1) {
        await TournamentParticipant.updateOne(
          { tournamentId: match.tournamentId, deviceId: p1 },
          { $inc: { 'stats.played': 1, 'stats.draws': 1, 'stats.points': drawPoints } }
        )
      }
      if (p2) {
        await TournamentParticipant.updateOne(
          { tournamentId: match.tournamentId, deviceId: p2 },
          { $inc: { 'stats.played': 1, 'stats.draws': 1, 'stats.points': drawPoints } }
        )
      }
    }
  } catch (err) {
    console.error('submitTournamentResultOnFinish error:', err)
  }
}

export { updateElo, maybeAdvanceTournamentMatch, submitTournamentResultOnFinish }
