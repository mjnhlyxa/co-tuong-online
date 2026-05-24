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
    const { deviceId } = await req.json()

    const game = await Game.findOne({ roomId })
    if (!game) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })
    if (game.status === 'finished') return NextResponse.json({ error: 'GAME_FINISHED' }, { status: 400 })

    if (!game.allowTakeback) {
      return NextResponse.json({ error: 'TAKEBACK_DISABLED' }, { status: 400 })
    }

    let myColor: 'red' | 'black' | null = null
    if (deviceId === game.redPlayer.deviceId) myColor = 'red'
    else if (deviceId === game.blackPlayer.deviceId) myColor = 'black'
    if (!myColor) return NextResponse.json({ error: 'NOT_A_PLAYER' }, { status: 403 })

    // Can only request after own move (not their turn anymore)
    if (game.currentTurn === myColor) {
      return NextResponse.json({ error: 'CAN_ONLY_REQUEST_AFTER_YOUR_MOVE' }, { status: 400 })
    }

    if (game.takebackRequest?.status === 'pending') {
      return NextResponse.json({ error: 'ALREADY_PENDING' }, { status: 400 })
    }

    const used = game.takebacksUsed[myColor]
    if (used >= 3) {
      return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 400 })
    }

    if (game.currentMoveNumber === 0) {
      return NextResponse.json({ error: 'NO_MOVES_YET' }, { status: 400 })
    }

    await Game.findOneAndUpdate({ roomId }, {
      $set: {
        takebackRequest: {
          fromColor: myColor,
          moveNumber: game.currentMoveNumber,
          status: 'pending',
          requestedAt: new Date(),
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST takeback-request error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
