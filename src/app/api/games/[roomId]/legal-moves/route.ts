import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { getAllLegalMoves } from '@/lib/xiangqi/rules'

/** DEBUG: returns all legal moves for testing AI */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB()
    const { roomId } = await params
    const game = await Game.findOne({ roomId }).lean()
    if (!game) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    const board = (game.boardState as unknown[][]).map(row =>
      row.map(cell => (cell ?? null) as string | null)
    ) as Parameters<typeof getAllLegalMoves>[0]
    const color = game.currentTurn as 'red' | 'black'
    const movesMap = getAllLegalMoves(board, color)
    const moves: Array<{ from: { row: number; col: number }; to: { row: number; col: number } }> = []
    movesMap.forEach((targets, key) => {
      const [row, col] = key.split(',').map(Number)
      targets.forEach(to => {
        moves.push({ from: { row, col }, to })
      })
    })
    return NextResponse.json({ moves, currentTurn: color, moveNumber: game.currentMoveNumber })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
