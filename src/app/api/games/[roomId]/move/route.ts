import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { isLegalMove, applyMove, isInCheck, getGameResult } from '@/lib/xiangqi/rules'
import { getMoveNotation } from '@/lib/xiangqi/notation'
import { v4 as uuidv4 } from 'uuid'
import { updateElo } from '../route'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB()
    const { roomId } = await params
    const body = await req.json()
    const { deviceId, moveNumber, from, to } = body

    if (!deviceId || from == null || to == null || moveNumber == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const game = await Game.findOne({ roomId })
    if (!game) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })
    if (game.status === 'finished') return NextResponse.json({ error: 'GAME_FINISHED' }, { status: 400 })

    // Determine color
    let myColor: 'red' | 'black' | null = null
    if (deviceId === game.redPlayer.deviceId) myColor = 'red'
    else if (deviceId === game.blackPlayer.deviceId) myColor = 'black'

    if (!myColor) return NextResponse.json({ error: 'NOT_A_PLAYER' }, { status: 403 })
    if (myColor !== game.currentTurn) return NextResponse.json({ error: 'WRONG_TURN' }, { status: 400 })
    if (moveNumber !== game.currentMoveNumber) return NextResponse.json({ error: 'STALE_MOVE_NUMBER' }, { status: 409 })

    const board = game.boardState as (string | null)[][]
    const move = { from, to }

    if (!isLegalMove(board, move, myColor)) {
      return NextResponse.json({ error: 'INVALID_MOVE' }, { status: 400 })
    }

    const piece = board[from.row][from.col]!
    const captured = board[to.row][to.col] ?? null
    const newBoard = applyMove(board, move)
    const opponent: 'red' | 'black' = myColor === 'red' ? 'black' : 'red'
    const check = isInCheck(newBoard, opponent)
    const notation = getMoveNotation(board, from, to, piece, myColor)
    const result = getGameResult(newBoard, opponent)

    // Time control: update remaining for current turn
    let timeRemaining = { ...game.timeRemaining.toObject?.() ?? game.timeRemaining }
    if (game.timeControl && game.lastMoveAt) {
      const elapsed = Date.now() - game.lastMoveAt.getTime()
      const remaining = Math.max(0, timeRemaining[myColor] - elapsed)
      timeRemaining[myColor] = remaining
    }

    const newMoveNumber = game.currentMoveNumber + 1
    const newMove = {
      moveNumber: newMoveNumber,
      color: myColor,
      from,
      to,
      piece,
      captured,
      notation,
      timestamp: new Date(),
      isCheck: check,
      boardSnapshot: board, // save pre-move board for takeback
    }

    let winner: 'red' | 'black' | null = null
    let endReason: string | null = null
    let finishedAt: Date | null = null

    if (result === 'checkmate') {
      winner = myColor
      endReason = 'checkmate'
      finishedAt = new Date()
    }

    const updateResult = await Game.findOneAndUpdate(
      { roomId, currentMoveNumber: game.currentMoveNumber },
      {
        $set: {
          boardState: newBoard,
          currentTurn: opponent,
          currentMoveNumber: newMoveNumber,
          lastMoveAt: new Date(),
          [`lastSeen.${myColor}`]: new Date(),
          timeRemaining,
          ...(winner ? { winner, endReason, status: 'finished', finishedAt } : {}),
          // Clear any pending takeback request since a new move was made
          takebackRequest: null,
        },
        $push: { moves: newMove },
      },
      { new: true }
    )

    if (!updateResult) {
      return NextResponse.json({ error: 'STALE_MOVE_NUMBER' }, { status: 409 })
    }

    if (winner) {
      await updateElo(game.redPlayer.deviceId, game.blackPlayer.deviceId, winner, game)
    }

    return NextResponse.json({
      success: true,
      moveNumber: newMoveNumber,
      notation,
      isCheck: check,
      winner,
      endReason,
    })
  } catch (err) {
    console.error('POST /api/games/[roomId]/move error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
