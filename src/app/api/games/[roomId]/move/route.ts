import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { Room } from '@/models/Room'
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

    // Check if OPPONENT has run out of time (before allowing this move)
    if (game.timeControl && game.lastMoveAt) {
      const opponentColor: 'red' | 'black' = myColor === 'red' ? 'black' : 'red'
      const timeRemainingObj = game.timeRemaining?.toObject?.() ?? game.timeRemaining
      const opponentTimeRemaining = timeRemainingObj[opponentColor]
      const elapsed = Date.now() - game.lastMoveAt.getTime()
      const actualRemaining = opponentTimeRemaining - elapsed
      if (actualRemaining <= 0) {
        // Opponent loses by timeout
        await Game.findOneAndUpdate({ roomId }, {
          $set: { winner: myColor, endReason: 'timeout', status: 'finished', finishedAt: new Date() }
        })
        await Room.findOneAndUpdate({ roomId }, { status: 'finished' })
        await updateElo(game.redPlayer.deviceId, game.blackPlayer.deviceId, myColor, game)
        return NextResponse.json({ error: 'OPPONENT_TIMEOUT' }, { status: 400 })
      }
    }

    const board = (game.boardState as unknown[][]).map(row =>
      row.map(cell => (cell ?? null) as string | null)
    )
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

    // Apply time increment: add to OPPONENT's clock (since it's their turn after this move)
    if (game.incrementMs && game.timeControl) {
      const opponentColor: 'red' | 'black' = myColor === 'red' ? 'black' : 'red'
      timeRemaining[opponentColor] = (timeRemaining[opponentColor] ?? 0) + game.incrementMs
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
      boardSnapshot: board, // pre-move for takeback
      boardAfter: newBoard, // post-move for replay (already computed above)
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
      await Room.findOneAndUpdate({ roomId }, { status: 'finished' })
      // Auto-submit result to tournament if this game is a tournament match
      await submitTournamentResult(roomId, winner, endReason, deviceId)
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

/**
 * If this game is a tournament match, submit the result to the tournament and update
 * participant stats. Idempotent: if already submitted with same winner, skip.
 */
async function submitTournamentResult(
  roomId: string,
  winner: 'red' | 'black' | 'draw',
  endReason: string | null,
  submittedByDeviceId: string
) {
  try {
    const { Tournament, TournamentMatch, TournamentParticipant } = await import('@/models/Tournament')
    const match = await TournamentMatch.findOne({ gameId: roomId })
    if (!match) return
    if (match.status === 'COMPLETED' && match.result.winner !== 'NONE') return

    const tournament = await Tournament.findOne({ tournamentId: match.tournamentId }).lean()
    if (!tournament) return

    const winnerSide = winner === 'red' ? 'PLAYER1' : winner === 'black' ? 'PLAYER2' : 'DRAW'

    match.status = 'COMPLETED'
    match.completedAt = new Date()
    match.result = {
      winner: winnerSide,
      score1: null,
      score2: null,
      resultType: 'GAME_ENDED',
      endReason: endReason ?? null,
      submittedByDeviceId,
      submittedAt: new Date(),
      version: (match.result.version ?? 0) + 1,
    }
    await match.save()

    const winPoints = tournament.settings.winPoints
    const drawPoints = tournament.settings.drawPoints
    const p1 = match.player1?.deviceId
    const p2 = match.player2?.deviceId

    if (winnerSide === 'PLAYER1' && p1) {
      await TournamentParticipant.updateOne(
        { tournamentId: match.tournamentId, deviceId: p1 },
        { $inc: { 'stats.played': 1, 'stats.wins': 1, 'stats.points': winPoints } }
      )
      if (p2) {
        await TournamentParticipant.updateOne(
          { tournamentId: match.tournamentId, deviceId: p2 },
          { $inc: { 'stats.played': 1, 'stats.losses': 1 } }
        )
      }
    } else if (winnerSide === 'PLAYER2' && p2) {
      await TournamentParticipant.updateOne(
        { tournamentId: match.tournamentId, deviceId: p2 },
        { $inc: { 'stats.played': 1, 'stats.wins': 1, 'stats.points': winPoints } }
      )
      if (p1) {
        await TournamentParticipant.updateOne(
          { tournamentId: match.tournamentId, deviceId: p1 },
          { $inc: { 'stats.played': 1, 'stats.losses': 1 } }
        )
      }
    } else if (winnerSide === 'DRAW') {
      if (p1) {
        await TournamentParticipant.updateOne(
          { tournamentId: match.tournamentId, deviceId: p1 },
          { $inc: { 'stats.played': 1, 'stats.draws': 1, 'stats.points': drawPoints } }
        )
      }
      if (p2) {
        await TournamentParticipant.updateOne(
          { tournamentId: match.tournamentId, deviceId: p2 },
          { $inc: { 'stats.played': 1, 'stats.draws': 1, 'stats.points': drawPoints } }
        )
      }
    }
  } catch (err) {
    console.error('submitTournamentResult error:', err)
  }
}
