import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { Player } from '@/models/Player'
import { Room } from '@/models/Room'
import { calculateElo, getTier } from '@/lib/elo'

const ABANDONED_TIMEOUT_MS = 30_000

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

    // Abandoned detection: if playing and current player hasn't sent heartbeat in 30s
    if (game.status === 'playing') {
      const now = Date.now()
      const lastSeenCurrent = game.lastSeen[game.currentTurn as 'red' | 'black']
      if (lastSeenCurrent && now - lastSeenCurrent.getTime() > ABANDONED_TIMEOUT_MS) {
        const winner = game.currentTurn === 'red' ? 'black' : 'red'
        game.winner = winner
        game.endReason = 'abandoned'
        game.status = 'finished'
        game.finishedAt = new Date()
        await game.save()
        await markRoomFinished()
        await updateElo(game.redPlayer.deviceId, game.blackPlayer.deviceId, winner, game)
      }
    }

    // Timeout check
    if (game.status === 'playing' && game.timeControl && game.lastMoveAt) {
      const elapsed = Date.now() - game.lastMoveAt.getTime()
      const turn = game.currentTurn as 'red' | 'black'
      const remaining = game.timeRemaining[turn] - elapsed
      if (remaining <= 0) {
        const winner = turn === 'red' ? 'black' : 'red'
        game.winner = winner
        game.endReason = 'timeout'
        game.status = 'finished'
        game.finishedAt = new Date()
        await game.save()
        await markRoomFinished()
        await updateElo(game.redPlayer.deviceId, game.blackPlayer.deviceId, winner, game)
      }
    }

    // Reload in case we mutated
    game = await Game.findOne({ roomId })
    if (!game) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })

    // Determine viewer role
    let myColor: string | null = null
    if (deviceId === game.redPlayer.deviceId) myColor = 'red'
    else if (deviceId === game.blackPlayer.deviceId) myColor = 'black'

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

export { updateElo }
