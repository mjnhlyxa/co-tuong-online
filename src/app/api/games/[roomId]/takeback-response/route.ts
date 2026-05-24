import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB()
    const { roomId } = await params
    const { deviceId, accept } = await req.json()

    const game = await Game.findOne({ roomId })
    if (!game) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })

    if (!game.takebackRequest || game.takebackRequest.status !== 'pending') {
      return NextResponse.json({ error: 'NO_PENDING_REQUEST' }, { status: 400 })
    }

    const requesterColor = game.takebackRequest.fromColor as 'red' | 'black'
    const responderColor: 'red' | 'black' = requesterColor === 'red' ? 'black' : 'red'

    // Only the opponent of the requester can respond
    const responderDeviceId = responderColor === 'red' ? game.redPlayer.deviceId : game.blackPlayer.deviceId
    if (deviceId !== responderDeviceId) {
      return NextResponse.json({ error: 'NOT_THE_OPPONENT' }, { status: 403 })
    }

    if (!accept) {
      await Game.findOneAndUpdate({ roomId }, {
        $set: { 'takebackRequest.status': 'rejected' }
      })
      return NextResponse.json({ success: true, accepted: false })
    }

    // Accept: restore board to before the last move
    const lastMove = game.moves[game.moves.length - 1]
    if (!lastMove) return NextResponse.json({ error: 'NO_MOVES_TO_UNDO' }, { status: 400 })

    const previousBoard = lastMove.boardSnapshot
    if (!previousBoard) return NextResponse.json({ error: 'NO_SNAPSHOT' }, { status: 400 })

    const newMoveNumber = game.currentMoveNumber - 1
    const incrementKey = `takebacksUsed.${requesterColor}` as const

    await Game.findOneAndUpdate({ roomId }, {
      $set: {
        boardState: previousBoard,
        currentTurn: requesterColor,
        currentMoveNumber: newMoveNumber,
        lastMoveAt: new Date(),
        takebackRequest: null,
      },
      $pop: { moves: 1 },
      $inc: { [incrementKey]: 1 },
    })

    const updated = await Game.findOne({ roomId })
    return NextResponse.json({
      success: true,
      accepted: true,
      boardState: updated?.boardState,
      currentTurn: requesterColor,
      currentMoveNumber: newMoveNumber,
    })
  } catch (err) {
    console.error('POST takeback-response error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
