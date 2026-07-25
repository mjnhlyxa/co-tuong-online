import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { connectDB } from '@/lib/mongodb'
import { Tournament, TournamentMatch } from '@/models/Tournament'
import { Player } from '@/models/Player'
import { Room } from '@/models/Room'
import { Game } from '@/models/Game'

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
      // Idempotent: return existing gameId
      return NextResponse.json({
        matchId,
        gameId: match.gameId,
        roomId: match.gameId,
        alreadyStarted: true,
      })
    }
    if (match.status !== 'SCHEDULED' && match.status !== 'READY') {
      return NextResponse.json({ error: 'Trận không thể bắt đầu' }, { status: 400 })
    }

    // Authorization: only player1 or player2 can start
    const isPlayer1 = match.player1?.deviceId === deviceId
    const isPlayer2 = match.player2?.deviceId === deviceId
    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: 'Chỉ 2 người chơi trong trận mới có thể bắt đầu' }, { status: 403 })
    }

    // Get player info
    const player = await Player.findOne({ deviceId }).lean()
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    // Create private Room and Game
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
      host: {
        deviceId: redDeviceId,
        name: redName,
        elo: redElo,
        tier: 'gold',
        color: 'red',
      },
      guest: {
        deviceId: blackDeviceId,
        name: blackName,
        elo: blackElo,
        tier: 'gold',
        color: 'black',
      },
      timeControl: timeControlMs,
      allowSpectators: tournament.settings.allowSpectators,
      allowTakeback: tournament.settings.allowTakeback,
      createdAt: new Date(),
      startedAt: new Date(),
    })

    // Initial board (10x9, standard)
    const initialBoard = [
      ['br', null, null, 'bp', 'ba', 'bk', 'bp', null, null, 'br'],
      [null, null, null, null, null, null, null, null, null, null],
      [null, 'bc', null, null, null, null, null, 'bc', null, null],
      ['bs', null, 'bs', null, 'bs', null, 'bs', null, 'bs', null],
      [null, null, null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null, null, null],
      ['rs', null, 'rs', null, 'rs', null, 'rs', null, 'rs', null],
      [null, 'rc', null, null, null, null, null, 'rc', null, null],
      [null, null, null, null, null, null, null, null, null, null],
      ['rr', null, null, 'rp', 'ra', 'rk', 'rp', null, null, 'rr'],
    ]

    await Game.create({
      roomId,
      redPlayer: { deviceId: redDeviceId, name: redName, eloAtStart: redElo },
      blackPlayer: { deviceId: blackDeviceId, name: blackName, eloAtStart: blackElo },
      status: 'playing',
      currentTurn: 'red',
      currentMoveNumber: 0,
      boardState: initialBoard,
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
    match.openedAt = new Date()
    match.startClaimedBy = deviceId
    await match.save()

    return NextResponse.json({
      matchId,
      gameId: roomId,
      roomId,
      roomUrl: `/game/${roomId}`,
    })
  } catch (err) {
    console.error('POST /api/tournaments/[id]/match/[matchId]/start error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
