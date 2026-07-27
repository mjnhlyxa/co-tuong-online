#!/usr/bin/env node
/**
 * Cleanup recent test data
 * Deletes players, tournaments, and related data created in the last N days.
 *
 * Usage: node scripts/cleanup-recent.js [days] [--dry-run]
 *   days: number of days back (default 3)
 *   --dry-run: show what would be deleted without actually deleting
 */

const mongoose = require('mongoose')

const days = parseFloat(process.argv[2]) || 3
const isDryRun = process.argv.includes('--dry-run')

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('Error: MONGODB_URI env var not set')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log(`Connected. ${isDryRun ? 'DRY RUN - ' : ''}Deleting data from last ${days} days\n`)

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Get all collections
  const db = mongoose.connection.db
  const collections = await db.listCollections().toArray()
  console.log('Available collections:', collections.map(c => c.name).join(', '))

  // Find and delete recent Players
  const Player = mongoose.connection.collection('players')
  const recentPlayers = await Player.find({ createdAt: { $gte: cutoff } }).toArray()
  console.log(`\nPlayers to delete: ${recentPlayers.length}`)
  recentPlayers.slice(0, 5).forEach(p => console.log(`  - ${p.deviceId} "${p.name}" (${p.createdAt?.toISOString()})`))
  if (recentPlayers.length > 5) console.log(`  ... and ${recentPlayers.length - 5} more`)

  // Get deviceIds of recent players (for cascade delete)
  const recentDeviceIds = recentPlayers.map(p => p.deviceId)

  // Find and delete recent Tournaments
  const Tournament = mongoose.connection.collection('tournaments')
  const recentTournaments = await Tournament.find({ createdAt: { $gte: cutoff } }).toArray()
  console.log(`\nTournaments to delete: ${recentTournaments.length}`)
  recentTournaments.forEach(t => console.log(`  - ${t.tournamentId} "${t.name}" (${t.createdAt?.toISOString()})`))

  const recentTournamentIds = recentTournaments.map(t => t.tournamentId)

  if (isDryRun) {
    console.log('\nDRY RUN - no actual deletion')
    await mongoose.disconnect()
    return
  }

  // Cascade delete related data
  let deleted = 0

  // Delete rooms where host is recent player (or gameId matches tournament)
  const Room = mongoose.connection.collection('rooms')
  if (recentDeviceIds.length > 0) {
    const roomResult = await Room.deleteMany({ 'host.deviceId': { $in: recentDeviceIds } })
    deleted += roomResult.deletedCount
    console.log(`  Deleted rooms (host): ${roomResult.deletedCount}`)
    const guestResult = await Room.deleteMany({ 'guest.deviceId': { $in: recentDeviceIds } })
    deleted += guestResult.deletedCount
    console.log(`  Deleted rooms (guest): ${guestResult.deletedCount}`)
  }

  // Delete games where deviceId matches recent
  if (recentDeviceIds.length > 0) {
    const Game = mongoose.connection.collection('games')
    const gameResult = await Game.deleteMany({
      $or: [
        { 'redPlayer.deviceId': { $in: recentDeviceIds } },
        { 'blackPlayer.deviceId': { $in: recentDeviceIds } },
      ]
    })
    deleted += gameResult.deletedCount
    console.log(`  Deleted games: ${gameResult.deletedCount}`)
  }

  // Delete tournament participants
  if (recentTournamentIds.length > 0) {
    const TP = mongoose.connection.collection('tournamentparticipants')
    const tpResult = await TP.deleteMany({ tournamentId: { $in: recentTournamentIds } })
    deleted += tpResult.deletedCount
    console.log(`  Deleted tournament participants: ${tpResult.deletedCount}`)

    const TM = mongoose.connection.collection('tournamentmatches')
    const tmResult = await TM.deleteMany({ tournamentId: { $in: recentTournamentIds } })
    deleted += tmResult.deletedCount
    console.log(`  Deleted tournament matches: ${tmResult.deletedCount}`)
  }

  // Delete the players and tournaments themselves
  if (recentDeviceIds.length > 0) {
    const pResult = await Player.deleteMany({ deviceId: { $in: recentDeviceIds } })
    deleted += pResult.deletedCount
    console.log(`  Deleted players: ${pResult.deletedCount}`)
  }
  if (recentTournamentIds.length > 0) {
    const tResult = await Tournament.deleteMany({ tournamentId: { $in: recentTournamentIds } })
    deleted += tResult.deletedCount
    console.log(`  Deleted tournaments: ${tResult.deletedCount}`)
  }

  console.log(`\nTotal records deleted: ${deleted}`)
  await mongoose.disconnect()
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
