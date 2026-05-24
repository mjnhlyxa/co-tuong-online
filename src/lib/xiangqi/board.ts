import type { BoardState } from './types'

export function getInitialBoard(): BoardState {
  return [
    ['b-ju','b-ma','b-xiang','b-shi','b-jiang','b-shi','b-xiang','b-ma','b-ju'],
    [null,null,null,null,null,null,null,null,null],
    [null,'b-pao',null,null,null,null,null,'b-pao',null],
    ['b-zu',null,'b-zu',null,'b-zu',null,'b-zu',null,'b-zu'],
    [null,null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null,null],
    ['r-zu',null,'r-zu',null,'r-zu',null,'r-zu',null,'r-zu'],
    [null,'r-pao',null,null,null,null,null,'r-pao',null],
    [null,null,null,null,null,null,null,null,null],
    ['r-ju','r-ma','r-xiang','r-shi','r-jiang','r-shi','r-xiang','r-ma','r-ju'],
  ]
}

export function cloneBoard(board: BoardState): BoardState {
  return board.map(row => [...row])
}

export function inBounds(row: number, col: number): boolean {
  return row >= 0 && row <= 9 && col >= 0 && col <= 8
}

export function isRedSide(row: number): boolean {
  return row >= 5
}

export function isBlackSide(row: number): boolean {
  return row <= 4
}

// Palace: rows 0-2 cols 3-5 (black), rows 7-9 cols 3-5 (red)
export function inPalace(row: number, col: number, color: 'red' | 'black'): boolean {
  if (col < 3 || col > 5) return false
  if (color === 'red') return row >= 7 && row <= 9
  return row >= 0 && row <= 2
}

export function getPiece(board: BoardState, row: number, col: number): string | null {
  if (!inBounds(row, col)) return null
  return board[row][col]
}

export function findKing(board: BoardState, color: 'red' | 'black'): { row: number; col: number } | null {
  const code = color === 'red' ? 'r-jiang' : 'b-jiang'
  for (let r = 0; r <= 9; r++) {
    for (let c = 0; c <= 8; c++) {
      if (board[r][c] === code) return { row: r, col: c }
    }
  }
  return null
}
