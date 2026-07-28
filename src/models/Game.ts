import mongoose, { Schema, Document } from 'mongoose'

export interface IGame extends Document {
  roomId: string
  redPlayer: { deviceId: string; name: string; eloAtStart: number }
  blackPlayer: { deviceId: string; name: string; eloAtStart: number }
  status: 'waiting' | 'playing' | 'finished'
  currentTurn: 'red' | 'black'
  currentMoveNumber: number
  boardState: (string | null)[][]
  moves: Array<{
    moveNumber: number
    color: string
    from: { row: number; col: number }
    to: { row: number; col: number }
    piece: string
    captured: string | null
    notation: string
    timestamp: Date
    isCheck: boolean
    boardSnapshot?: (string | null)[][]
    boardAfter?: (string | null)[][]
  }>
  lastSeen: { red: Date; black: Date }
  timeControl: number | null
  incrementMs: number
  timeRemaining: { red: number; black: number }
  lastMoveAt: Date | null
  drawOffer: { fromColor: 'red' | 'black'; status: 'pending'; offeredAt: Date } | null
  allowSpectators: boolean
  allowTakeback: boolean
  spectators: Array<{ deviceId: string; name: string; joinedAt: Date }>
  mutedDeviceIds: string[]
  chat: Array<{
    id: string
    deviceId: string
    name: string
    isPlayer: boolean
    message: string
    timestamp: Date
  }>
  takebackRequest: {
    fromColor: 'red' | 'black'
    moveNumber: number
    status: 'pending' | 'accepted' | 'rejected'
    requestedAt: Date
  } | null
  takebacksUsed: { red: number; black: number }
  winner: 'red' | 'black' | 'draw' | null
  endReason: 'checkmate' | 'resign' | 'draw_agreement' | 'abandoned' | 'timeout' | null
  startedAt: Date
  finishedAt: Date | null
}

const MoveSchema = new Schema({
  moveNumber: Number,
  color: String,
  from: { row: Number, col: Number },
  to: { row: Number, col: Number },
  piece: String,
  captured: { type: String, default: null },
  notation: String,
  timestamp: { type: Date, default: Date.now },
  isCheck: { type: Boolean, default: false },
  boardSnapshot: { type: [[Schema.Types.Mixed]], default: undefined },
  boardAfter: { type: [[Schema.Types.Mixed]], default: undefined },
}, { _id: false })

const GameSchema = new Schema<IGame>({
  roomId: { type: String, required: true, unique: true },
  redPlayer: { deviceId: String, name: String, eloAtStart: Number },
  blackPlayer: { deviceId: String, name: String, eloAtStart: Number },
  status: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'playing' },
  currentTurn: { type: String, enum: ['red', 'black'], default: 'red' },
  currentMoveNumber: { type: Number, default: 0 },
  boardState: { type: [[Schema.Types.Mixed]], required: true },
  moves: [MoveSchema],
  lastSeen: {
    red: { type: Date, default: Date.now },
    black: { type: Date, default: Date.now },
  },
  timeControl: { type: Number, default: null },
  incrementMs: { type: Number, default: 0 },
  timeRemaining: {
    red: { type: Number, default: 0 },
    black: { type: Number, default: 0 },
  },
  lastMoveAt: { type: Date, default: null },
  drawOffer: {
    fromColor: { type: String, enum: ['red', 'black'] },
    status: { type: String, enum: ['pending'], default: 'pending' },
    offeredAt: { type: Date, default: Date.now },
    _id: false,
  },
  allowSpectators: { type: Boolean, default: true },
  allowTakeback: { type: Boolean, default: true },
  spectators: [{
    deviceId: String,
    name: String,
    joinedAt: { type: Date, default: Date.now },
    _id: false,
  }],
  mutedDeviceIds: [String],
  chat: [{
    id: String,
    deviceId: String,
    name: String,
    isPlayer: { type: Boolean, default: true },
    message: String,
    timestamp: { type: Date, default: Date.now },
    _id: false,
  }],
  takebackRequest: {
    type: {
      fromColor: String,
      moveNumber: Number,
      status: { type: String, enum: ['pending', 'accepted', 'rejected'] },
      requestedAt: Date,
    },
    default: null,
  },
  takebacksUsed: {
    red: { type: Number, default: 0 },
    black: { type: Number, default: 0 },
  },
  winner: { type: String, default: null },
  endReason: { type: String, default: null },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date, default: null },
})

GameSchema.index({ roomId: 1 }, { unique: true })
GameSchema.index({ status: 1, startedAt: -1 })

export const Game = mongoose.models.Game ?? mongoose.model<IGame>('Game', GameSchema)
