import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { connectDB } from '@/lib/mongodb'
import { Tournament, TournamentParticipant } from '@/models/Tournament'
import { Player } from '@/models/Player'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const format = searchParams.get('format')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

    const query: Record<string, unknown> = {}
    if (status) query.status = status
    if (format) query.format = format

    const tournaments = await Tournament.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({
      tournaments: tournaments.map(t => ({
        tournamentId: t.tournamentId,
        name: t.name,
        description: t.description,
        hostName: t.hostNameSnapshot,
        status: t.status,
        format: t.format,
        participantCount: t.participantCount,
        maxPlayers: t.registration.maxPlayers,
        minPlayers: t.registration.minPlayers,
        timeControlMinutes: t.settings.timeControlMinutes,
        drawPoints: t.settings.drawPoints,
        createdAt: t.createdAt,
        startedAt: t.startedAt,
        finishedAt: t.finishedAt,
        registrationDeadline: t.registration.registrationDeadline,
      })),
    })
  } catch (err) {
    console.error('GET /api/tournaments error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()
    const { deviceId, name, tournamentName, format = 'ROUND_ROBIN', timeControlMinutes = 20, drawPoints = 1, maxPlayers = 32, minPlayers = 3 } = body

    if (!deviceId) return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
    if (!name || name.trim().length < 2) return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 })
    if (!tournamentName || tournamentName.trim().length < 3 || tournamentName.length > 60) {
      return NextResponse.json({ error: 'Tên giải đấu 3–60 ký tự' }, { status: 400 })
    }
    if (!['ROUND_ROBIN', 'GROUP_KNOCKOUT'].includes(format)) {
      return NextResponse.json({ error: 'format không hợp lệ' }, { status: 400 })
    }
    if (![0, 1].includes(drawPoints)) {
      return NextResponse.json({ error: 'drawPoints phải là 0 hoặc 1' }, { status: 400 })
    }

    const player = await Player.findOne({ deviceId }).lean()
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const tournamentId = uuidv4()

    const tournament = await Tournament.create({
      tournamentId,
      name: tournamentName.trim(),
      description: '',
      hostDeviceId: deviceId,
      hostNameSnapshot: player.name,
      status: 'OPEN',
      format,
      settings: {
        timeControlMinutes,
        drawPoints,
        winPoints: 3,
        groupCount: format === 'GROUP_KNOCKOUT' ? null : null,
        groupSizeTarget: 4,
        qualifiersPerGroup: 1,
        wildcardCount: 0,
        knockoutBestOf: 1,
        allowLateJoin: false,
        allowSpectators: true,
        allowTakeback: true,
        sideAssignment: 'RANDOM',
        noShowPolicy: 'FORFEIT',
      },
      registration: {
        minPlayers: format === 'GROUP_KNOCKOUT' ? Math.max(4, minPlayers) : Math.max(2, minPlayers),
        maxPlayers,
        registrationDeadline: null,
        scheduledStartAt: null,
      },
      phase: {
        number: 0,
        name: format === 'GROUP_KNOCKOUT' ? 'GROUP_STAGE' : 'ROUND_ROBIN',
        startedAt: null,
        completedAt: null,
      },
      participantCount: 0,
      version: 0,
    })

    // Auto-register host as first participant
    await TournamentParticipant.create({
      tournamentId,
      deviceId,
      nameSnapshot: player.name,
      playerId: (player._id as { toString: () => string }).toString(),
      seed: 1,
      status: 'REGISTERED',
      groupId: null,
      groupSeed: null,
      joinedAt: new Date(),
    })
    tournament.participantCount = 1
    await tournament.save()

    return NextResponse.json({
      tournamentId,
      shareLink: `/tournament/${tournamentId}`,
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/tournaments error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
