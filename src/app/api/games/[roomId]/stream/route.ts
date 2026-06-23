import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { Room } from '@/models/Room'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params
  const { searchParams } = new URL(req.url)
  const deviceId = searchParams.get('deviceId')

  if (!deviceId) {
    return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 })
  }

  const encoder = new TextEncoder()
  let isClosed = false
  let lastGameState: string | null = null

  const stream = new ReadableStream({
    async start(controller) {
      async function sendEvent(data: object, event: string = 'update') {
        if (isClosed) return
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      async function poll() {
        if (isClosed) return

        try {
          await connectDB()

          // Check if room/game exists
          let game = await Game.findOne({ roomId }).lean()
          let room = null

          if (!game) {
            room = await Room.findOne({ roomId }).lean()
            if (!room) {
              await sendEvent({ error: 'ROOM_NOT_FOUND' }, 'error')
              controller.close()
              isClosed = true
              return
            }
          }

          const currentState = JSON.stringify(game?._id ?? room?._id ?? null)
          if (currentState !== lastGameState) {
            lastGameState = currentState

            if (game) {
              // Determine viewer role
              let myColor: string | null = null
              if (deviceId === game.redPlayer?.deviceId) myColor = 'red'
              else if (deviceId === game.blackPlayer?.deviceId) myColor = 'black'

              await sendEvent({
                type: 'game',
                roomId: game.roomId,
                status: game.status,
                currentTurn: game.currentTurn,
                currentMoveNumber: game.currentMoveNumber,
                boardState: game.boardState,
                moves: game.moves.slice(-50).map((m: {
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
                redPlayer: game.redPlayer ? {
                  deviceId: game.redPlayer.deviceId,
                  name: game.redPlayer.name,
                  eloAtStart: game.redPlayer.eloAtStart
                } : null,
                blackPlayer: game.blackPlayer ? {
                  deviceId: game.blackPlayer.deviceId,
                  name: game.blackPlayer.name,
                  eloAtStart: game.blackPlayer.eloAtStart
                } : null,
                winner: game.winner,
                endReason: game.endReason,
                myColor,
                timeControl: game.timeControl,
                timeRemaining: game.timeRemaining?.toObject?.() ?? game.timeRemaining,
                lastMoveAt: game.lastMoveAt,
                allowSpectators: game.allowSpectators,
                allowTakeback: game.allowTakeback,
                spectators: game.spectators,
                chat: game.chat?.slice(-50) ?? [],
                mutedDeviceIds: game.mutedDeviceIds,
                takebackRequest: game.takebackRequest,
                takebacksUsed: game.takebacksUsed,
                startedAt: game.startedAt,
                finishedAt: game.finishedAt,
              })
            } else if (room) {
              await sendEvent({
                type: 'room',
                roomId: room.roomId,
                status: room.status,
                host: room.host,
                guest: room.guest,
                timeControl: room.timeControl,
                allowSpectators: room.allowSpectators,
                allowTakeback: room.allowTakeback,
              })
            }
          }
        } catch (err) {
          console.error('SSE poll error:', err)
        }
      }

      // Send initial state immediately
      await poll()

      // Then poll every 500ms (much faster than SWR's 1.5s)
      const interval = setInterval(poll, 500)

      // Send heartbeat comment every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        if (!isClosed) {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        }
      }, 15000)

      // Cleanup on close
      req.signal.addEventListener('abort', () => {
        isClosed = true
        clearInterval(interval)
        clearInterval(heartbeat)
        try {
          controller.close()
        } catch {}
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering for SSE
    },
  })
}