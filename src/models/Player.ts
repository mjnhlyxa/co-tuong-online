import mongoose, { Schema, Document } from 'mongoose'

export interface IPlayer extends Document {
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
    tier: string
    peakElo: number
  }
  preferences: { language: string }
  recoveryCode: string | null
  createdAt: Date
  lastSeenAt: Date
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 31 chars (no I, O, 0, 1 for clarity)

/** Generate a 12-char recovery code like "K7H2-N8P3-9M4Q" */
export function generateRecoveryCode(): string {
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    if (i === 3 || i === 7) code += '-'
  }
  return code
}

const PlayerSchema = new Schema<IPlayer>({
  deviceId: { type: String, required: true, unique: true },
  name: { type: String, required: true, minlength: 2, maxlength: 16 },
  stats: {
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    abandonedWins: { type: Number, default: 0 },
    abandonedLosses: { type: Number, default: 0 },
    totalGames: { type: Number, default: 0 },
  },
  ranking: {
    elo: { type: Number, default: 1500 },
    tier: { type: String, default: 'gold' },
    peakElo: { type: Number, default: 1500 },
  },
  preferences: { language: { type: String, default: 'vi' } },
  recoveryCode: { type: String, default: null, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
})

PlayerSchema.index({ deviceId: 1 }, { unique: true })
PlayerSchema.index({ 'ranking.elo': -1 })
PlayerSchema.index({ recoveryCode: 1 }, { unique: true, sparse: true })

export const Player = mongoose.models.Player ?? mongoose.model<IPlayer>('Player', PlayerSchema)
