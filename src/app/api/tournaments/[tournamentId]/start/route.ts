import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { connectDB } from '@/lib/mongodb'
import { Tournament, TournamentParticipant, TournamentMatch } from '@/models/Tournament'
import {
  generateRoundRobinPairings,
  splitIntoGroups,
  generateKnockoutBracket,
  type ParticipantSeed,
} from '@/lib/tournament'

export async function POST(req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  try {
    await connectDB()
    const { tournamentId } = await params
    const body = await req.json()
    const { deviceId } = body

    if (!deviceId) return NextResponse.json({ error: 'deviceId required' }, { status: 400 })

    const tournament = await Tournament.findOne({ tournamentId })
    if (!tournament) return NextResponse.json({ error: 'TOURNAMENT_NOT_FOUND' }, { status: 404 })
    if (tournament.hostDeviceId !== deviceId) {
      return NextResponse.json({ error: 'Chỉ host mới có thể bắt đầu giải' }, { status: 403 })
    }
    if (tournament.status !== 'OPEN') {
      return NextResponse.json({ error: 'Giải đã bắt đầu hoặc kết thúc' }, { status: 400 })
    }
    if (tournament.participantCount < tournament.registration.minPlayers) {
      return NextResponse.json({ error: `Cần tối thiểu ${tournament.registration.minPlayers} người chơi` }, { status: 400 })
    }

    const participants = await TournamentParticipant.find({ tournamentId, status: 'REGISTERED' }).sort({ seed: 1 }).lean()
    const seeds: ParticipantSeed[] = participants.map(p => ({
      deviceId: p.deviceId,
      nameSnapshot: p.nameSnapshot,
      seed: p.seed ?? 1,
    }))

    if (tournament.format === 'ROUND_ROBIN') {
      const rounds = generateRoundRobinPairings(seeds)
      const matches: Array<{ matchId: string; tournamentId: string; phase: 'ROUND_ROBIN'; roundNumber: number; roundLabel: string; player1: { deviceId: string; nameSnapshot: string; seed: number; color: 'RED' | 'BLACK' }; player2: { deviceId: string; nameSnapshot: string; seed: number; color: 'RED' | 'BLACK' } | null; status: 'SCHEDULED' | 'BYE' }> = []

      rounds.forEach((round, rIdx) => {
        round.forEach((pairing) => {
          const matchId = uuidv4()
          matches.push({
            matchId,
            tournamentId,
            phase: 'ROUND_ROBIN',
            roundNumber: rIdx + 1,
            roundLabel: `Vòng ${rIdx + 1}`,
            player1: { deviceId: pairing.player1.deviceId, nameSnapshot: pairing.player1.nameSnapshot, seed: pairing.player1.seed, color: 'RED' },
            player2: pairing.player2
              ? { deviceId: pairing.player2.deviceId, nameSnapshot: pairing.player2.nameSnapshot, seed: pairing.player2.seed, color: 'BLACK' }
              : null,
            status: pairing.isBye ? 'BYE' : 'SCHEDULED',
          })
        })
      })

      await TournamentMatch.insertMany(matches)
    } else if (tournament.format === 'GROUP_KNOCKOUT') {
      const groups = splitIntoGroups(seeds, tournament.settings.groupCount)
      const matches: Array<{ matchId: string; tournamentId: string; phase: 'GROUP_STAGE'; roundNumber: number; roundLabel: string; groupId: string; player1: { deviceId: string; nameSnapshot: string; seed: number; color: 'RED' | 'BLACK' }; player2: { deviceId: string; nameSnapshot: string; seed: number; color: 'RED' | 'BLACK' } | null; status: 'SCHEDULED' | 'BYE' }> = []

      for (const group of groups) {
        const participantUpdates = group.participants.map((p, idx) => ({
          deviceId: p.deviceId,
          groupId: group.groupId,
          groupSeed: idx + 1,
        }))
        for (const u of participantUpdates) {
          await TournamentParticipant.updateOne(
            { tournamentId, deviceId: u.deviceId },
            { $set: { groupId: u.groupId, groupSeed: u.groupSeed } }
          )
        }

        const rounds = generateRoundRobinPairings(group.participants)
        rounds.forEach((round, rIdx) => {
          round.forEach(pairing => {
            const matchId = uuidv4()
            matches.push({
              matchId,
              tournamentId,
              phase: 'GROUP_STAGE',
              roundNumber: rIdx + 1,
              roundLabel: `Bảng ${group.groupId} - Vòng ${rIdx + 1}`,
              groupId: group.groupId,
              player1: { deviceId: pairing.player1.deviceId, nameSnapshot: pairing.player1.nameSnapshot, seed: pairing.player1.seed, color: 'RED' },
              player2: pairing.player2
                ? { deviceId: pairing.player2.deviceId, nameSnapshot: pairing.player2.nameSnapshot, seed: pairing.player2.seed, color: 'BLACK' }
                : null,
              status: 'SCHEDULED',
            })
          })
        })
      }

      await TournamentMatch.insertMany(matches)
    }

    tournament.status = 'STARTED'
    tournament.startedAt = new Date()
    tournament.phase.startedAt = new Date()
    tournament.version += 1
    await tournament.save()

    return NextResponse.json({
      ok: true,
      status: tournament.status,
      participantCount: tournament.participantCount,
    })
  } catch (err) {
    console.error('POST /api/tournaments/[id]/start error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 })
  }
}
