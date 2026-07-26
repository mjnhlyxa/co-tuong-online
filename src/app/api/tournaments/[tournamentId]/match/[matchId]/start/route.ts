import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { connectDB } from '@/lib/mongodb'
import { Tournament, TournamentMatch } from '@/models/Tournament'
import { Room } from '@/models/Room'
import { Game } from '@/models/Game'
import { getInitialBoard } from '@/lib/xiangqi/board'

/**
 * Match start flow (NEW):
 * - First call from either player: mark match as 'READY', record claim
 * - Second call from the other player: create Room+Game, set match to 'STARTED', return gameId
 * - Subsequent calls: idempotent, return existing gameId
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ tournamentId: string; matchId: string }> }) {
  try {
    await connectDB()
    const { tournamentId, matchId } = await params
    const body = await req.json()
    const { deviceId } = body

    if (!deviceId) return NextResponse.json({ error: 'deviceId required' }, { status: 400 })

    const tournament = await Tournament.findOne({ tournamentId }).lean()
    if (!tournament) return NextResponse.json({ error: 'TOURNAMENT_NOT_FOUND' }, { status: 404 })
    if (tournament.status !== 'STARTED') {
      return NextResponse.json({ error: 'Giải chưa bắt đầu' }, { status: 400 })
    }

    const match = await TournamentMatch.findOne({ matchId, tournamentId })
    if (!match) return NextResponse.json({ error: 'MATCH_NOT_FOUND' }, { status: 404 })
    if (match.status === 'COMPLETED') return NextResponse.json({ error: 'Trận đã kết thúc' }, { status: 400 })
    if (match.status === 'STARTED') {
      return NextResponse.json({
        matchId,
        gameId: match.gameId,
        roomId: match.gameId,
        status: 'STARTED',
        alreadyStarted: true,
        roomUrl: `/game/${match.gameId}`,
      })
    }

    // Authorization: only player1 or player2 can start
    const isPlayer1 = match.player1?.deviceId === deviceId
    const isPlayer2 = match.player2?.deviceId === deviceId
    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: 'Chỉ 2 người chơi trong trận mới có thể bắt đầu' }, { status: 403 })
    }

    // BYE matches: cannot be started
    if (!match.player2) {
      return NextResponse.json({ error: 'Trận BYE không thể bắt đầu' }, { status: 400 })
    }

    // Idempotent: if this player already claimed, return current state
    if (match.status === 'READY') {
      const claimedBy1 = match.startClaimedBy === match.player1?.deviceId
      const claimedBy2 = match.startClaimedBy === match.player2?.deviceId
      if ((claimedBy1 && isPlayer1) || (claimedBy2 && isPlayer2)) {
        return NextResponse.json({
          matchId,
          status: 'READY',
          waitingForOpponent: true,
          opponentName: isPlayer1 ? match.player2?.nameSnapshot : match.player1?.nameSnapshot,
        })
      }
    }

    // First claim from one of the players: mark READY
    if (match.status === 'SCHEDULED') {
      match.status = 'READY'
      match.openedAt = new Date()
      match.startClaimedBy = deviceId
      await match.save()
      return NextResponse.json({
        matchId,
        status: 'READY',
        waitingForOpponent: true,
        opponentName: isPlayer1 ? match.player2?.nameSnapshot : match.player1?.nameSnapshot,
      })
    }

    // match.status === 'READY' and other player is claiming now
    if (match.status === 'READY' && match.startClaimedBy && match.startClaimedBy !== deviceId) {
      // Both players have now claimed: create the game
      const roomId = uuidv4()
      const timeControlMs = tournament.settings.timeControlMinutes
        ? tournament.settings.timeControlMinutes * 60 * 1000
        : null

      const redDeviceId = match.player1?.deviceId ?? ''
      const redName = match.player1?.nameSnapshot ?? ''
      const redElo = 1500
      const blackDeviceId = match.player2?.deviceId ?? ''
      const blackName = match.player2?.nameSnapshot ?? ''
      const blackElo = 1500

      await Room.create({
        roomId,
        type: 'private',
        status: 'playing',
        host: { deviceId: redDeviceId, name: redName, elo: redElo, tier: 'gold', color: 'red' },
        guest: { deviceId: blackDeviceId, name: blackName, elo: blackElo, tier: 'gold', color: 'black' },
        timeControl: timeControlMs,
        allowSpectators: tournament.settings.allowSpectators,
        allowTakeback: tournament.settings.allowTakeback,
        createdAt: new Date(),
        startedAt: new Date(),
      })

      await Game.create({
        roomId,
        redPlayer: { deviceId: redDeviceId, name: redName, eloAtStart: redElo },
        blackPlayer: { deviceId: blackDeviceId, name: blackName, eloAtStart: blackElo },
        status: 'playing',
        currentTurn: 'red',
        currentMoveNumber: 0,
        boardState: getInitialBoard(),
        moves: [],
        timeControl: timeControlMs,
        timeRemaining: { red: timeControlMs ?? 0, black: timeControlMs ?? 0 },
        lastMoveAt: new Date(),
        allowSpectators: tournament.settings.allowSpectators,
        allowTakeback: tournament.settings.allowTakeback,
        spectators: [],
        mutedDeviceIds: [],
        chat: [],
        winner: null,
        startedAt: new Date(),
      })

      match.gameId = roomId
      match.status = 'STARTED'
      match.startedAt = new Date()
      await match.save()

      return NextResponse.json({
        matchId,
        status: 'STARTED',
        gameId: roomId,
        roomId,
        roomUrl: `/game/${roomId}`,
      })
    }

    return NextResponse.json({ error: 'Trạng thái trận không hợp lệ' }, { status: 400 })
  } catch (err) {
    console.error('POST /api/tournaments/[id]/match/[matchId]/start error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
