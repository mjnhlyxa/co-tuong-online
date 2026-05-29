// Piece types in Vietnamese Chess (Cờ Tướng)
export type PieceType = 'general' | 'advisor' | 'elephant' | 'chariot' | 'horse' | 'cannon' | 'soldier';
export type Color = 'red' | 'black';

export const BOARD_ROWS = 10;
export const BOARD_COLS = 9;
export const RIVER_ROW = 4;

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
  currentTurn: 0 | 1;
  moveHistory: MoveRecord[];
  players: [Player | null, Player | null];
  status: 'waiting' | 'playing' | 'finished';
  result?: {
    winner: 0 | 1;
    reason: 'checkmate' | 'timeout' | 'resign';
  };
  timeBanks: [number, number];
  lastMove: Move | null;
  checkPosition: Position | null;
}

export interface Player {
  id: string;
  name: string;
  color: Color;
  isConnected: boolean;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  status: 'waiting' | 'playing' | 'finished';
  players: [Player | null, Player | null];
  maxPlayers: number;
  isPrivate: boolean;
  createdAt: string;
}

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
