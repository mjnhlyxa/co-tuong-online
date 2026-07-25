import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Tournament, TournamentParticipant } from '@/models/Tournament'
import { Player } from '@/models/Player'

export async function POST(req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  try {
    await connectDB()
    const { tournamentId } = await params
    const body = await req.json()
    const { deviceId, name } = body

    if (!deviceId) return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
    if (!name || name.trim().length < 2 || name.trim().length > 16) {
      return NextResponse.json({ error: 'Tên 2–16 ký tự' }, { status: 400 })
    }

    const tournament = await Tournament.findOne({ tournamentId })
    if (!tournament) return NextResponse.json({ error: 'TOURNAMENT_NOT_FOUND' }, { status: 404 })
    if (tournament.status !== 'OPEN') {
      return NextResponse.json({ error: 'Giải đấu không còn nhận người' }, { status: 400 })
    }
    if (tournament.participantCount >= tournament.registration.maxPlayers) {
      return NextResponse.json({ error: 'Giải đã đủ người' }, { status: 400 })
    }

    // Get player (create if needed)
    let player = await Player.findOne({ deviceId })
    if (!player) {
      // Auto-create player for tournament
      player = await Player.create({
        deviceId,
        name: name.trim(),
        ranking: { elo: 1500, tier: 'gold', peakElo: 1500 },
      })
    }

    // Check duplicate
    const existing = await TournamentParticipant.findOne({ tournamentId, deviceId })
    if (existing) {
      return NextResponse.json({
        participantId: (existing._id as { toString: () => string }).toString(),
        nameSnapshot: existing.nameSnapshot,
        status: existing.status,
      }, { status: 200 })
    }

    const participant = await TournamentParticipant.create({
      tournamentId,
      deviceId,
      nameSnapshot: name.trim(),
      playerId: (player._id as { toString: () => string }).toString(),
      seed: tournament.participantCount + 1,
      status: 'REGISTERED',
      joinedAt: new Date(),
    })

    tournament.participantCount += 1
    await tournament.save()

    return NextResponse.json({
      participantId: (participant._id as { toString: () => string }).toString(),
      nameSnapshot: participant.nameSnapshot,
      seed: participant.seed,
      status: participant.status,
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/tournaments/[id]/join error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  try {
    await connectDB()
    const { tournamentId } = await params
    const { searchParams } = new URL(req.url)
    const deviceId = searchParams.get('deviceId')

    if (!deviceId) return NextResponse.json({ error: 'deviceId required' }, { status: 400 })

    const tournament = await Tournament.findOne({ tournamentId })
    if (!tournament) return NextResponse.json({ error: 'TOURNAMENT_NOT_FOUND' }, { status: 404 })

    if (tournament.status === 'STARTED') {
      return NextResponse.json({ error: 'Giải đã bắt đầu, không thể rời' }, { status: 400 })
    }

    const participant = await TournamentParticipant.findOneAndDelete({ tournamentId, deviceId })
    if (!participant) return NextResponse.json({ error: 'NOT_JOINED' }, { status: 404 })

    tournament.participantCount = Math.max(0, tournament.participantCount - 1)
    await tournament.save()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/tournaments/[id]/join error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
