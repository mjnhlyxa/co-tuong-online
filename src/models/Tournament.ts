import mongoose, { Schema, Document } from 'mongoose'

export type TournamentFormat = 'ROUND_ROBIN' | 'GROUP_KNOCKOUT'
export type TournamentStatus = 'DRAFT' | 'OPEN' | 'STARTED' | 'FINISHED' | 'CANCELLED'
export type TournamentPhaseName = 'GROUP_STAGE' | 'ROUND_ROBIN' | 'KNOCKOUT'
export type ParticipantStatus = 'REGISTERED' | 'ACTIVE' | 'WITHDRAWN' | 'DISQUALIFIED' | 'ELIMINATED' | 'CHAMPION'
export type MatchStatus = 'SCHEDULED' | 'READY' | 'STARTED' | 'COMPLETED' | 'BYE' | 'FORFEIT' | 'CANCELLED'

export interface ITournament extends Document {
  tournamentId: string
  name: string
  description: string
  hostDeviceId: string
  hostNameSnapshot: string
  status: TournamentStatus
  format: TournamentFormat
  settings: {
    timeControlMinutes: number | null
    drawPoints: 0 | 1
    winPoints: number
    groupCount: number | null
    groupSizeTarget: number | null
    qualifiersPerGroup: number
    wildcardCount: number
    knockoutBestOf: 1 | 3
    allowLateJoin: boolean
    allowSpectators: boolean
    allowTakeback: boolean
    sideAssignment: 'RANDOM' | 'SEEDED_BALANCE'
    noShowPolicy: 'FORFEIT' | 'BYE' | 'HOST_DECISION'
  }
  registration: {
    minPlayers: number
    maxPlayers: number
    registrationDeadline: Date | null
    scheduledStartAt: Date | null
  }
  phase: {
    number: number
    name: TournamentPhaseName
    startedAt: Date | null
    completedAt: Date | null
  }
  participantCount: number
  version: number
  createdAt: Date
  updatedAt: Date
  startedAt: Date | null
  finishedAt: Date | null
  cancelledAt: Date | null
  cancelReason: string | null
}

const TournamentSchema = new Schema<ITournament>({
  tournamentId: { type: String, required: true, unique: true },
  name: { type: String, required: true, minlength: 3, maxlength: 60 },
  description: { type: String, default: '' },
  hostDeviceId: { type: String, required: true, index: true },
  hostNameSnapshot: { type: String, required: true },
  status: { type: String, enum: ['DRAFT', 'OPEN', 'STARTED', 'FINISHED', 'CANCELLED'], default: 'OPEN', index: true },
  format: { type: String, enum: ['ROUND_ROBIN', 'GROUP_KNOCKOUT'], default: 'ROUND_ROBIN' },
  settings: {
    timeControlMinutes: { type: Number, default: 20 },
    drawPoints: { type: Number, enum: [0, 1], default: 1 },
    winPoints: { type: Number, default: 3 },
    groupCount: { type: Number, default: null },
    groupSizeTarget: { type: Number, default: 4 },
    qualifiersPerGroup: { type: Number, default: 1 },
    wildcardCount: { type: Number, default: 0 },
    knockoutBestOf: { type: Number, enum: [1, 3], default: 1 },
    allowLateJoin: { type: Boolean, default: false },
    allowSpectators: { type: Boolean, default: true },
    allowTakeback: { type: Boolean, default: true },
    sideAssignment: { type: String, enum: ['RANDOM', 'SEEDED_BALANCE'], default: 'RANDOM' },
    noShowPolicy: { type: String, enum: ['FORFEIT', 'BYE', 'HOST_DECISION'], default: 'FORFEIT' },
  },
  registration: {
    minPlayers: { type: Number, default: 3 },
    maxPlayers: { type: Number, default: 32 },
    registrationDeadline: { type: Date, default: null },
    scheduledStartAt: { type: Date, default: null },
  },
  phase: {
    number: { type: Number, default: 0 },
    name: { type: String, enum: ['GROUP_STAGE', 'ROUND_ROBIN', 'KNOCKOUT'], default: 'ROUND_ROBIN' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  participantCount: { type: Number, default: 0 },
  version: { type: Number, default: 0 },
  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: null },
}, { timestamps: true })

TournamentSchema.index({ tournamentId: 1 }, { unique: true })
TournamentSchema.index({ status: 1, createdAt: -1 })
TournamentSchema.index({ hostDeviceId: 1, status: 1, createdAt: -1 })

export const Tournament = mongoose.models.Tournament ?? mongoose.model<ITournament>('Tournament', TournamentSchema)

// ─── TournamentParticipant ────────────────────────────────────────────────────

export interface ITournamentParticipant extends Document {
  tournamentId: string
  deviceId: string
  nameSnapshot: string
  playerId: string | null
  seed: number | null
  status: ParticipantStatus
  groupId: string | null
  groupSeed: number | null
  stats: {
    played: number
    wins: number
    draws: number
    losses: number
    points: number
    pointsFor: number
    pointsAgainst: number
    pointDiff: number
    byes: number
    forfeits: number
  }
  joinedAt: Date
  lastActiveAt: Date
  eliminatedAt: Date | null
  withdrawalReason: string | null
}

const ParticipantSchema = new Schema<ITournamentParticipant>({
  tournamentId: { type: String, required: true, index: true },
  deviceId: { type: String, required: true },
  nameSnapshot: { type: String, required: true },
  playerId: { type: String, default: null },
  seed: { type: Number, default: null },
  status: { type: String, enum: ['REGISTERED', 'ACTIVE', 'WITHDRAWN', 'DISQUALIFIED', 'ELIMINATED', 'CHAMPION'], default: 'REGISTERED' },
  groupId: { type: String, default: null },
  groupSeed: { type: Number, default: null },
  stats: {
    played: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    draws: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    pointsFor: { type: Number, default: 0 },
    pointsAgainst: { type: Number, default: 0 },
    pointDiff: { type: Number, default: 0 },
    byes: { type: Number, default: 0 },
    forfeits: { type: Number, default: 0 },
  },
  joinedAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },
  eliminatedAt: { type: Date, default: null },
  withdrawalReason: { type: String, default: null },
}, { timestamps: true })

ParticipantSchema.index({ tournamentId: 1, deviceId: 1 }, { unique: true })
ParticipantSchema.index({ tournamentId: 1, groupId: 1, 'stats.points': -1 })

export const TournamentParticipant = mongoose.models.TournamentParticipant ??
  mongoose.model<ITournamentParticipant>('TournamentParticipant', ParticipantSchema)

// ─── TournamentMatch ─────────────────────────────────────────────────────────

export interface ITournamentMatch extends Document {
  matchId: string
  tournamentId: string
  phase: TournamentPhaseName
  roundNumber: number
  roundLabel: string
  groupId: string | null
  bracketSlot: string | null
  player1: { deviceId: string; nameSnapshot: string; seed: number | null; color: 'RED' | 'BLACK' } | null
  player2: { deviceId: string; nameSnapshot: string; seed: number | null; color: 'RED' | 'BLACK' } | null
  status: MatchStatus
  scheduledAt: Date | null
  openedAt: Date | null
  startedAt: Date | null
  completedAt: Date | null
  startClaimedBy: string | null
  gameId: string | null
  result: {
    winner: 'PLAYER1' | 'PLAYER2' | 'DRAW' | 'NONE'
    score1: number | null
    score2: number | null
    resultType: 'ONLINE' | 'HOST_REPORTED' | 'FORFEIT' | 'BYE' | 'TIMEOUT'
    endReason: string | null
    submittedByDeviceId: string | null
    submittedAt: Date | null
    notes: string | null
    version: number
  }
  nextMatchId: string | null
  sourceMatchIds: string[]
  createdAt: Date
  updatedAt: Date
}

const MatchSchema = new Schema<ITournamentMatch>({
  matchId: { type: String, required: true, unique: true },
  tournamentId: { type: String, required: true, index: true },
  phase: { type: String, enum: ['GROUP_STAGE', 'ROUND_ROBIN', 'KNOCKOUT'], default: 'ROUND_ROBIN' },
  roundNumber: { type: Number, required: true },
  roundLabel: { type: String, default: '' },
  groupId: { type: String, default: null },
  bracketSlot: { type: String, default: null },
  player1: { deviceId: String, nameSnapshot: String, seed: Number, color: { type: String, enum: ['RED', 'BLACK'] } },
  player2: { deviceId: String, nameSnapshot: String, seed: Number, color: { type: String, enum: ['RED', 'BLACK'] } },
  status: { type: String, enum: ['SCHEDULED', 'READY', 'STARTED', 'COMPLETED', 'BYE', 'FORFEIT', 'CANCELLED'], default: 'SCHEDULED' },
  scheduledAt: { type: Date, default: null },
  openedAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  startClaimedBy: { type: String, default: null },
  gameId: { type: String, default: null },
  result: {
    winner: { type: String, enum: ['PLAYER1', 'PLAYER2', 'DRAW', 'NONE'], default: 'NONE' },
    score1: { type: Number, default: null },
    score2: { type: Number, default: null },
    resultType: { type: String, enum: ['ONLINE', 'HOST_REPORTED', 'FORFEIT', 'BYE', 'TIMEOUT'], default: 'ONLINE' },
    endReason: { type: String, default: null },
    submittedByDeviceId: { type: String, default: null },
    submittedAt: { type: Date, default: null },
    notes: { type: String, default: null },
    version: { type: Number, default: 0 },
  },
  nextMatchId: { type: String, default: null },
  sourceMatchIds: { type: [String], default: [] },
}, { timestamps: true })

MatchSchema.index({ matchId: 1 }, { unique: true })
MatchSchema.index({ tournamentId: 1, phase: 1, roundNumber: 1, groupId: 1 })
MatchSchema.index({ tournamentId: 1, status: 1, scheduledAt: 1 })
MatchSchema.index({ 'player1.deviceId': 1, tournamentId: 1 })
MatchSchema.index({ 'player2.deviceId': 1, tournamentId: 1 })

export const TournamentMatch = mongoose.models.TournamentMatch ??
  mongoose.model<ITournamentMatch>('TournamentMatch', MatchSchema)
