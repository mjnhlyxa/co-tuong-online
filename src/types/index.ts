export type Color = 'red' | 'black'
export type PieceCode = string // e.g. "r-ju", "b-jiang"
export type BoardState = (PieceCode | null)[][]

export interface Position {
  row: number
  col: number
}

export interface Move {
  from: Position
  to: Position
}

export interface MoveRecord {
  moveNumber: number
  color: Color
  from: Position
  to: Position
  piece: string
  captured: string | null
  notation: string
  timestamp: string
  isCheck: boolean
}

export interface PlayerInfo {
  deviceId: string
  name: string
  eloAtStart: number
}

export interface TakebackRequest {
  fromColor: Color
  moveNumber: number
  status: 'pending' | 'accepted' | 'rejected'
  requestedAt: string
}

export interface ChatMessage {
  id: string
  deviceId: string
  name: string
  isPlayer: boolean
  message: string
  timestamp: string
}

export interface SpectatorInfo {
  deviceId: string
  name: string
  joinedAt: string
}

export interface GameState {
  roomId: string
  status: 'waiting' | 'playing' | 'finished'
  host?: { deviceId: string; name: string; elo: number }
  currentTurn?: Color
  currentMoveNumber?: number
  boardState?: BoardState
  moves?: MoveRecord[]
  redPlayer?: PlayerInfo & { name: string }
  blackPlayer?: PlayerInfo & { name: string }
  winner?: Color | 'draw' | null
  endReason?: 'checkmate' | 'resign' | 'draw_agreement' | 'abandoned' | 'timeout' | null
  myColor?: Color | null
  timeControl?: number | null
  timeRemaining?: { red: number; black: number }
  lastMoveAt?: string | null
  allowSpectators?: boolean
  allowTakeback?: boolean
  spectators?: SpectatorInfo[]
  chat?: ChatMessage[]
  mutedDeviceIds?: string[]
  takebackRequest?: TakebackRequest | null
  takebacksUsed?: { red: number; black: number }
  message?: string // For waiting status
}

export type Language = 'vi' | 'en' | 'zh' | 'ko' | 'ru' | 'fr' | 'de' | 'pt'

export interface PlayerProfile {
  deviceId: string
  name: string
  stats: {
    wins: number
    losses: number
    draws: number
    abandonedWins: number
    abandonedLosses: number
    totalGames: number
  }
  ranking: {
    elo: number
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
    peakElo: number
  }
  preferences: { language: Language }
}

export interface RoomInfo {
  roomId: string
  type: 'public' | 'private'
  status: 'waiting' | 'playing' | 'finished'
  host: { name: string; elo: number; tier: string }
  guest?: { name: string | null; elo: number | null }
  timeControl: number | null
  allowSpectators: boolean
  createdAt: string
}
