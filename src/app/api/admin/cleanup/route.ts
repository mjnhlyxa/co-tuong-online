import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Player } from '@/models/Player'
import { Tournament, TournamentParticipant, TournamentMatch } from '@/models/Tournament'
import { Room } from '@/models/Room'
import { Game } from '@/models/Game'

/**
 * ONE-TIME cleanup endpoint
 * POST /api/admin/cleanup?days=3&confirm=yes
 * Deletes Players, Tournaments, Rooms, Games, Participants, Matches
 * created in the last N days. Use ?dryRun=1 to preview.
 *
 * SECURITY: requires ?confirm=yes
 */
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const confirm = url.searchParams.get('confirm')
    if (confirm !== 'yes') {
      return NextResponse.json({
        error: 'Refusing to run without ?confirm=yes',
        usage: 'POST /api/admin/cleanup?days=3&confirm=yes[&dryRun=1]',
      }, { status: 400 })
    }
    const days = parseFloat(url.searchParams.get('days') ?? '3')
    const dryRun = url.searchParams.get('dryRun') === '1'
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    await connectDB()
    const PlayerM = (await import('mongoose')).default.connection.collection('players')
    const TournamentM = (await import('mongoose')).default.connection.collection('tournaments')
    const TPM = (await import('mongoose')).default.connection.collection('tournamentparticipants')
    const TMM = (await import('mongoose')).default.connection.collection('tournamentmatches')
    const RoomM = (await import('mongoose')).default.connection.collection('rooms')
    const GameM = (await import('mongoose')).default.connection.collection('games')

    const recentPlayers = await PlayerM.find({ createdAt: { $gte: cutoff } }).project({ deviceId: 1, name: 1, createdAt: 1 }).toArray()
    const recentTournaments = await TournamentM.find({ createdAt: { $gte: cutoff } }).project({ tournamentId: 1, name: 1, createdAt: 1 }).toArray()

    const recentDeviceIds = recentPlayers.map(p => p.deviceId)
    const recentTournamentIds = recentTournaments.map(t => t.tournamentId)

    const summary = {
      cutoff: cutoff.toISOString(),
      dryRun,
      counts: {
        players: recentPlayers.length,
        tournaments: recentTournaments.length,
        deviceIds: recentDeviceIds.slice(0, 5),
        tournamentIds: recentTournamentIds.slice(0, 5),
      },
    }

    if (dryRun) {
      return NextResponse.json({
        ...summary,
        message: 'DRY RUN - nothing deleted',
        playerNames: recentPlayers.map(p => `${p.name} (${p.deviceId})`).slice(0, 10),
        tournamentNames: recentTournaments.map(t => `${t.name} (${t.tournamentId})`),
      })
    }

    // Cascade delete related data
    const results: Record<string, number> = {}
    if (recentDeviceIds.length > 0) {
      results.rooms = await RoomM.deleteMany({ 'host.deviceId': { $in: recentDeviceIds } }).then(r => r.deletedCount)
      const guestRooms = await RoomM.deleteMany({ 'guest.deviceId': { $in: recentDeviceIds } })
      results.rooms += guestRooms.deletedCount
      const games = await GameM.deleteMany({
        $or: [
          { 'redPlayer.deviceId': { $in: recentDeviceIds } },
          { 'blackPlayer.deviceId': { $in: recentDeviceIds } },
        ]
      })
      results.games = games.deletedCount
    }
    if (recentTournamentIds.length > 0) {
      results.tournamentParticipants = await TPM.deleteMany({ tournamentId: { $in: recentTournamentIds } }).then(r => r.deletedCount)
      results.tournamentMatches = await TMM.deleteMany({ tournamentId: { $in: recentTournamentIds } }).then(r => r.deletedCount)
    }
    results.players = await PlayerM.deleteMany({ deviceId: { $in: recentDeviceIds } }).then(r => r.deletedCount)
    results.tournaments = await TournamentM.deleteMany({ tournamentId: { $in: recentTournamentIds } }).then(r => r.deletedCount)

    return NextResponse.json({
      ...summary,
      message: 'Cleanup complete',
      deleted: results,
      total: Object.values(results).reduce((a, b) => a + b, 0),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 })
  }
}
