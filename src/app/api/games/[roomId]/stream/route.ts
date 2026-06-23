import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { Room } from '@/models/Room'

export const dynamic = 'force-dynamic'

// Track ALL mutable game state fields for real-time detection
interface GameStateSignature {
  moveCount: number
  chatCount: number
  spectatorCount: number
  status: string
  currentTurn: string
  takebackRequest: string | null // JSON stringified for comparison
  mutedCount: number
  winner: string | null
}

function getGameSignature(game: {
  moves: unknown[]
  chat: unknown[]
  spectators: unknown[]
  status: string
  currentTurn: string
  takebackRequest: unknown | null
  mutedDeviceIds: string[]
  winner: string | null
}): GameStateSignature {
  return {
    moveCount: game.moves.length,
    chatCount: game.chat.length,
    spectatorCount: game.spectators.length,
    status: game.status,
    currentTurn: game.currentTurn ?? '',
    takebackRequest: game.takebackRequest ? JSON.stringify(game.takebackRequest) : null,
    mutedCount: game.mutedDeviceIds.length,
    winner: game.winner ?? null,
  }
}

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

  // Track previous signature to detect any changes
  let lastSignature: GameStateSignature | null = null

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

          if (game) {
            const currentSignature = getGameSignature(game)

            // Send update if ANY field changed
            const hasChanges =
              !lastSignature ||
              currentSignature.moveCount !== lastSignature.moveCount ||
              currentSignature.chatCount !== lastSignature.chatCount ||
              currentSignature.spectatorCount !== lastSignature.spectatorCount ||
              currentSignature.status !== lastSignature.status ||
              currentSignature.currentTurn !== lastSignature.currentTurn ||
              currentSignature.takebackRequest !== lastSignature.takebackRequest ||
              currentSignature.mutedCount !== lastSignature.mutedCount ||
              currentSignature.winner !== lastSignature.winner

            if (hasChanges) {
              lastSignature = currentSignature

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
            }
          } else if (room) {
            // Room state (waiting for opponent)
            if (!lastSignature || lastSignature.status !== room.status) {
              lastSignature = {
                moveCount: 0,
                chatCount: 0,
                spectatorCount: 0,
                status: room.status,
                currentTurn: '',
                takebackRequest: null,
                mutedCount: 0,
                winner: null,
              }
              await sendEvent({
                type: 'room',
                roomId: room.roomId,
                status: room.status,
                host: { deviceId: room.host.deviceId, name: room.host.name, elo: room.host.elo },
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

      // Initial state immediately
      await poll()

      // Poll every 500ms for real-time updates
      const interval = setInterval(poll, 500)

      // Keep-alive heartbeat
      const heartbeat = setInterval(() => {
        if (!isClosed) {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        }
      }, 15000)

      req.signal.addEventListener('abort', () => {
        isClosed = true
        clearInterval(interval)
        clearInterval(heartbeat)
        try { controller.close() } catch {}
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}