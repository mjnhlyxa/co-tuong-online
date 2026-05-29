// Piece types in Vietnamese Chess (Cờ Tướng)
export type PieceType = 'general' | 'advisor' | 'elephant' | 'chariot' | 'horse' | 'cannon' | 'soldier';
export type Color = 'red' | 'black';

// Board dimensions
export const BOARD_ROWS = 10;
export const BOARD_COLS = 9;

// River is between rows 4 and 5 (0-indexed from red's perspective)
export const RIVER_ROW = 4;

// Palace boundaries for each side
export const RED_PALACE = {
  minRow: 0, maxRow: 2,
  minCol: 3, maxCol: 5
};

export const BLACK_PALACE = {
  minRow: 7, maxRow: 9,
  minCol: 3, maxCol: 5
};

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  type: PieceType;
  color: Color;
}

export type Cell = Piece | null;

export type Board = Cell[][];

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece;
  notation?: string;
  timestamp?: number;
}

export interface MoveRecord extends Move {
  moveNumber: number;
  notation: string;
  timestamp: number;
}

export interface GameState {
  board: Board;
  currentTurn: 0 | 1; // 0 = red, 1 = black
  moveHistory: MoveRecord[];
  players: [Player | null, Player | null];
  status: 'waiting' | 'playing' | 'finished';
  result?: {
    winner: 0 | 1;
    reason: 'checkmate' | 'timeout' | 'resign';
  };
  timeBanks: [number, number]; // seconds remaining for each player
  lastMove: Move | null;
  checkPosition: Position | null;
}

export interface Player {
  id: string;
  name: string;
  color: Color;
  isConnected: boolean;
}

// Chinese characters for pieces
export const PIECE_CHARS: Record<Color, Record<PieceType, string>> = {
  red: {
    general: '帥',
    advisor: '仕',
    elephant: '相',
    chariot: '車',
    horse: '馬',
    cannon: '炮',
    soldier: '兵'
  },
  black: {
    general: '將',
    advisor: '士',
    elephant: '象',
    chariot: '車',
    horse: '馬',
    cannon: '炮',
    soldier: '卒'
  }
};

// Standard notation piece names
export const PIECE_NOTATION: Record<Color, Record<PieceType, string>> = {
  red: {
    general: 'S',
    advisor: 'S',
    elephant: 'X',
    chariot: 'X',
    horse: 'M',
    cannon: 'P',
    soldier: 'T'
  },
  black: {
    general: 'T',
    advisor: 'S',
    elephant: 'X',
    chariot: 'X',
    horse: 'M',
    cannon: 'P',
    soldier: 'T'
  }
};
