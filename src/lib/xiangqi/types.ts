export type Color = 'red' | 'black'
export type PieceType = 'jiang' | 'shi' | 'xiang' | 'ju' | 'ma' | 'pao' | 'zu'
export type BoardState = (string | null)[][]

export interface Position {
  row: number
  col: number
}

export interface Move {
  from: Position
  to: Position
}

// r-jiang, b-zu, etc.
export function getPieceColor(code: string): Color {
  return code.startsWith('r-') ? 'red' : 'black'
}

export function getPieceType(code: string): PieceType {
  return code.split('-')[1] as PieceType
}

export function isOpponent(code: string, myColor: Color): boolean {
  return getPieceColor(code) !== myColor
}
