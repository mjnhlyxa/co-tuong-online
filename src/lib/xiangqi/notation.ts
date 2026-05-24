import type { BoardState, Color, Position } from './types'

const PIECE_NAMES: Record<string, Record<'vi' | 'zh', string>> = {
  'jiang': { vi: 'Tướng', zh: '將/帥' },
  'shi':   { vi: 'Sĩ',    zh: '士/仕' },
  'xiang': { vi: 'Tượng', zh: '象/相' },
  'ju':    { vi: 'Xe',    zh: '車' },
  'ma':    { vi: 'Mã',    zh: '馬' },
  'pao':   { vi: 'Pháo',  zh: '炮' },
  'zu':    { vi: 'Tốt',   zh: '卒/兵' },
}

export const PIECE_CHARS: Record<string, string> = {
  'r-jiang': '帥',
  'b-jiang': '將',
  'r-shi':   '仕',
  'b-shi':   '士',
  'r-xiang': '相',
  'b-xiang': '象',
  'r-ju':    '車',
  'b-ju':    '車',
  'r-ma':    '馬',
  'b-ma':    '馬',
  'r-pao':   '炮',
  'b-pao':   '砲',
  'r-zu':    '兵',
  'b-zu':    '卒',
}

export function getMoveNotation(
  _board: BoardState,
  from: Position,
  to: Position,
  piece: string,
  _color: Color
): string {
  const type = piece.split('-')[1]
  const pieceName = PIECE_NAMES[type]?.vi ?? type
  const colorLabel = piece.startsWith('r-') ? 'đỏ' : 'đen'
  return `${pieceName} ${colorLabel} (${from.row},${from.col})→(${to.row},${to.col})`
}
