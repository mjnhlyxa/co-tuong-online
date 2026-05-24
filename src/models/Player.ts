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
  createdAt: Date
  lastSeenAt: Date
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
  createdAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
})

PlayerSchema.index({ deviceId: 1 }, { unique: true })
PlayerSchema.index({ 'ranking.elo': -1 })

export const Player = mongoose.models.Player ?? mongoose.model<IPlayer>('Player', PlayerSchema)
