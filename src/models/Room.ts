import mongoose, { Schema, Document } from 'mongoose'

export interface IRoom extends Document {
  roomId: string
  type: 'public' | 'private'
  status: 'waiting' | 'playing' | 'finished'
  host: { deviceId: string; name: string; elo: number; tier: string; color: 'red' }
  guest: { deviceId: string | null; name: string | null; elo: number | null; tier: string | null; color: 'black' | null }
  timeControl: number | null
  allowSpectators: boolean
  allowTakeback: boolean
  createdAt: Date
  startedAt: Date | null
  finishedAt: Date | null
}

const RoomSchema = new Schema<IRoom>({
  roomId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['public', 'private'], required: true },
  status: { type: String, enum: ['waiting', 'playing', 'finished'], default: 'waiting' },
  host: {
    deviceId: String,
    name: String,
    elo: Number,
    tier: String,
    color: { type: String, default: 'red' },
  },
  guest: {
    deviceId: { type: String, default: null },
    name: { type: String, default: null },
    elo: { type: Number, default: null },
    tier: { type: String, default: null },
    color: { type: String, default: null },
  },
  timeControl: { type: Number, default: null },
  allowSpectators: { type: Boolean, default: true },
  allowTakeback: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null },
})

RoomSchema.index({ roomId: 1 }, { unique: true })
RoomSchema.index({ status: 1, type: 1 })
RoomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 })

export const Room = mongoose.models.Room ?? mongoose.model<IRoom>('Room', RoomSchema)
