import type { BoardState, Color, Position, Move } from './types'
import { getPieceColor, getPieceType } from './types'
import { inBounds, inPalace, findKing, cloneBoard, getPiece } from './board'

// Get all pseudo-legal moves for a piece (ignoring whether own king ends up in check)
function getPseudoMoves(board: BoardState, from: Position, color: Color): Position[] {
  const piece = board[from.row][from.col]
  if (!piece) return []
  const type = getPieceType(piece)
  const targets: Position[] = []

  const canCapture = (r: number, c: number): boolean => {
    if (!inBounds(r, c)) return false
    const target = board[r][c]
    if (!target) return true
    return getPieceColor(target) !== color
  }

  const isEmpty = (r: number, c: number): boolean => inBounds(r, c) && !board[r][c]

  switch (type) {
    case 'jiang': {
      // Moves 1 orthogonal step within palace
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]]
      for (const [dr, dc] of dirs) {
        const nr = from.row + dr, nc = from.col + dc
        if (inPalace(nr, nc, color) && canCapture(nr, nc)) {
          targets.push({ row: nr, col: nc })
        }
      }
      break
    }
    case 'shi': {
      // Moves 1 diagonal step within palace
      const dirs = [[-1,-1],[-1,1],[1,-1],[1,1]]
      for (const [dr, dc] of dirs) {
        const nr = from.row + dr, nc = from.col + dc
        if (inPalace(nr, nc, color) && canCapture(nr, nc)) {
          targets.push({ row: nr, col: nc })
        }
      }
      break
    }
    case 'xiang': {
      // Moves exactly 2 diagonal, cannot cross river, blocked by piece on midpoint
      const dirs = [[-2,-2],[-2,2],[2,-2],[2,2]]
      for (const [dr, dc] of dirs) {
        const nr = from.row + dr, nc = from.col + dc
        const mr = from.row + dr/2, mc = from.col + dc/2
        if (!inBounds(nr, nc)) continue
        // Cannot cross river
        if (color === 'red' && nr < 5) continue
        if (color === 'black' && nr > 4) continue
        if (!isEmpty(mr, mc)) continue // blocked
        if (canCapture(nr, nc)) targets.push({ row: nr, col: nc })
      }
      break
    }
    case 'ma': {
      // 1 orthogonal + 1 diagonal, blocked by piece on first step
      const steps = [
        [[-1,0],[-2,-1]],[[-1,0],[-2,1]],
        [[1,0],[2,-1]],[[1,0],[2,1]],
        [[0,-1],[-1,-2]],[[0,-1],[1,-2]],
        [[0,1],[-1,2]],[[0,1],[1,2]],
      ]
      for (const [block, dest] of steps) {
        const br = from.row + block[0], bc = from.col + block[1]
        const nr = from.row + dest[0], nc = from.col + dest[1]
        if (!isEmpty(br, bc)) continue // blocked
        if (inBounds(nr, nc) && canCapture(nr, nc)) targets.push({ row: nr, col: nc })
      }
      break
    }
    case 'ju': {
      // Any number of orthogonal steps, blocked by pieces
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]]
      for (const [dr, dc] of dirs) {
        let r = from.row + dr, c = from.col + dc
        while (inBounds(r, c)) {
          const target = board[r][c]
          if (!target) {
            targets.push({ row: r, col: c })
          } else {
            if (getPieceColor(target) !== color) targets.push({ row: r, col: c })
            break
          }
          r += dr; c += dc
        }
      }
      break
    }
    case 'pao': {
      // Like ju but captures by jumping exactly 1 piece
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]]
      for (const [dr, dc] of dirs) {
        let r = from.row + dr, c = from.col + dc
        let jumped = false
        while (inBounds(r, c)) {
          const target = board[r][c]
          if (!jumped) {
            if (!target) {
              targets.push({ row: r, col: c })
            } else {
              jumped = true
            }
          } else {
            if (target) {
              if (getPieceColor(target) !== color) targets.push({ row: r, col: c })
              break
            }
          }
          r += dr; c += dc
        }
      }
      break
    }
    case 'zu': {
      // Forward only before river, forward + sideways after river
      const forward = color === 'red' ? -1 : 1
      const crossedRiver = color === 'red' ? from.row <= 4 : from.row >= 5
      const moves: [number,number][] = [[forward, 0]]
      if (crossedRiver) {
        moves.push([0, -1], [0, 1])
      }
      for (const [dr, dc] of moves) {
        const nr = from.row + dr, nc = from.col + dc
        if (inBounds(nr, nc) && canCapture(nr, nc)) targets.push({ row: nr, col: nc })
      }
      break
    }
  }

  return targets
}

// Check if the given color's king is in check on this board
export function isInCheck(board: BoardState, color: Color): boolean {
  const king = findKing(board, color)
  if (!king) return false

  const opponent: Color = color === 'red' ? 'black' : 'red'

  // Also check flying general (kings facing each other)
  const opponentKing = findKing(board, opponent)
  if (opponentKing && opponentKing.col === king.col) {
    const minRow = Math.min(king.row, opponentKing.row)
    const maxRow = Math.max(king.row, opponentKing.row)
    let blocked = false
    for (let r = minRow + 1; r < maxRow; r++) {
      if (board[r][king.col]) { blocked = true; break }
    }
    if (!blocked) return true
  }

  // Check if any opponent piece attacks the king
  for (let r = 0; r <= 9; r++) {
    for (let c = 0; c <= 8; c++) {
      const p = board[r][c]
      if (p && getPieceColor(p) === opponent) {
        const moves = getPseudoMoves(board, { row: r, col: c }, opponent)
        if (moves.some(m => m.row === king.row && m.col === king.col)) return true
      }
    }
  }

  return false
}

// Get all legal moves for a piece (moves that don't leave own king in check)
export function getLegalMoves(board: BoardState, from: Position, color: Color): Position[] {
  const piece = board[from.row][from.col]
  if (!piece || getPieceColor(piece) !== color) return []

  const pseudoMoves = getPseudoMoves(board, from, color)
  return pseudoMoves.filter(to => {
    const next = cloneBoard(board)
    next[to.row][to.col] = next[from.row][from.col]
    next[from.row][from.col] = null
    return !isInCheck(next, color)
  })
}

// Check if a specific move is legal
export function isLegalMove(board: BoardState, move: Move, color: Color): boolean {
  const piece = board[move.from.row][move.from.col]
  if (!piece || getPieceColor(piece) !== color) return false
  const legal = getLegalMoves(board, move.from, color)
  return legal.some(m => m.row === move.to.row && m.col === move.to.col)
}

// Apply a move and return new board state
export function applyMove(board: BoardState, move: Move): BoardState {
  const next = cloneBoard(board)
  next[move.to.row][move.to.col] = next[move.from.row][move.from.col]
  next[move.from.row][move.from.col] = null
  return next
}

// Check if the given color has no legal moves (checkmate or stalemate)
export function hasNoLegalMoves(board: BoardState, color: Color): boolean {
  for (let r = 0; r <= 9; r++) {
    for (let c = 0; c <= 8; c++) {
      const p = board[r][c]
      if (p && getPieceColor(p) === color) {
        if (getLegalMoves(board, { row: r, col: c }, color).length > 0) return false
      }
    }
  }
  return true
}

// Returns 'checkmate' if current player loses, null otherwise
export function getGameResult(board: BoardState, currentTurn: Color): 'checkmate' | null {
  if (hasNoLegalMoves(board, currentTurn)) return 'checkmate'
  return null
}

// Get all valid moves for entire side (for highlighting)
export function getAllLegalMoves(board: BoardState, color: Color): Map<string, Position[]> {
  const result = new Map<string, Position[]>()
  for (let r = 0; r <= 9; r++) {
    for (let c = 0; c <= 8; c++) {
      const p = board[r][c]
      if (p && getPieceColor(p) === color) {
        const moves = getLegalMoves(board, { row: r, col: c }, color)
        if (moves.length > 0) result.set(`${r},${c}`, moves)
      }
    }
  }
  return result
}

export { getPseudoMoves }
