import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Room } from '@/models/Room'
import { Game } from '@/models/Game'
import { Player } from '@/models/Player'
import { getInitialBoard } from '@/lib/xiangqi/board'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB()
    const { roomId } = await params
    const { searchParams } = new URL(req.url)
    const deviceId = searchParams.get('deviceId')

    const room = await Room.findOne({ roomId })
    if (!room) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })

    // Auto-join as guest if room is waiting and this is a new player
    if (
      room.status === 'waiting' &&
      deviceId &&
      deviceId !== room.host.deviceId &&
      !room.guest.deviceId
    ) {
      const player = await Player.findOne({ deviceId }).lean()
      if (player) {
        const timeControlMs = room.timeControl ?? 0
        const board = getInitialBoard()

        // Create game document
        await Game.create({
          roomId,
          redPlayer: { deviceId: room.host.deviceId, name: room.host.name, eloAtStart: room.host.elo },
          blackPlayer: { deviceId, name: player.name, eloAtStart: player.ranking.elo },
          status: 'playing',
          currentTurn: 'red',
          currentMoveNumber: 0,
          boardState: board,
          moves: [],
          lastSeen: { red: new Date(), black: new Date() },
          timeControl: room.timeControl,
          timeRemaining: { red: timeControlMs, black: timeControlMs },
          lastMoveAt: new Date(),
          allowSpectators: room.allowSpectators,
          allowTakeback: room.allowTakeback,
          spectators: [],
          mutedDeviceIds: [],
          chat: [],
          takebackRequest: null,
          takebacksUsed: { red: 0, black: 0 },
          winner: null,
          endReason: null,
        })

        // Update room
        room.guest = { deviceId, name: player.name, elo: player.ranking.elo, tier: player.ranking.tier, color: 'black' }
        room.status = 'playing'
        room.startedAt = new Date()
        await room.save()
      }
    }

    const freshRoom = await Room.findOne({ roomId }).lean()
    if (!freshRoom) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })

    return NextResponse.json({
      roomId: freshRoom.roomId,
      type: freshRoom.type,
      status: freshRoom.status,
      host: freshRoom.host,
      guest: freshRoom.guest,
      timeControl: freshRoom.timeControl,
      allowSpectators: freshRoom.allowSpectators,
      allowTakeback: freshRoom.allowTakeback,
      createdAt: freshRoom.createdAt,
    })
  } catch (err) {
    console.error('GET /api/rooms/[roomId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
