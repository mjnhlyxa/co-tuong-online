/**
 * Tournament bracket generation algorithms.
 * Pure functions, no DB access. Returns pairings for round-robin and group+knockout.
 */

export interface ParticipantSeed {
  deviceId: string
  nameSnapshot: string
  seed: number
}

export interface MatchPairing {
  player1: { deviceId: string; nameSnapshot: string; seed: number }
  player2: { deviceId: string; nameSnapshot: string; seed: number } | null // null = BYE
  isBye: boolean
}

/**
 * Generate round-robin pairings using circle (round-robin) method.
 * Each pair of players meets exactly once.
 *
 * For N players (even): N-1 rounds, N/2 matches per round. Total: N(N-1)/2 matches.
 * For N players (odd): N rounds, (N-1)/2 matches per round, 1 player rests each round.
 *   Total: N(N-1)/2 matches, no BYE matches.
 *
 * No BYE matches are created. If a player has no opponent in a slot, we just skip that slot.
 */
export function generateRoundRobinPairings(participants: ParticipantSeed[]): MatchPairing[][] {
  const n = participants.length
  if (n < 2) return []

  const isOdd = n % 2 === 1
  const rounds = isOdd ? n : n - 1
  const matchesPerRound = Math.floor(n / 2)

  // For odd N, the "fixed" player rotates through who rests each round.
  // We use a fixed index 0, and rotate indices 1..n-1.
  const indices = Array.from({ length: n }, (_, i) => i)
  const fixed = indices[0]
  const rotating = indices.slice(1)

  const result: MatchPairing[][] = []
  for (let r = 0; r < rounds; r++) {
    const ordered = [fixed, ...rotating]
    const round: MatchPairing[] = []
    for (let i = 0; i < matchesPerRound; i++) {
      const a = ordered[i]
      const b = ordered[ordered.length - 1 - i]
      const pA = participants[a]
      const pB = participants[b]
      if (!pA || !pB) continue
      round.push({ player1: pA, player2: pB, isBye: false })
    }
    result.push(round)
    // Rotate: move last of rotating to front
    rotating.unshift(rotating.pop()!)
  }

  return result
}

export interface GroupAssignment {
  groupId: string
  participants: ParticipantSeed[]
}

export interface KnockoutPairing {
  bracketSlot: string
  roundNumber: number
  player1: { deviceId: string; nameSnapshot: string; seed: number } | null
  player2: { deviceId: string; nameSnapshot: string; seed: number } | null
  sourceMatchIds: string[] // empty if first round
}

/**
 * Split participants into groups. Strategy: pick groupCount so that all groups have size 4-8.
 * If odd number of participants, some groups will have size+1.
 * Seeds are distributed via snake draft to balance strong players.
 */
export function splitIntoGroups(participants: ParticipantSeed[], requestedGroupCount: number | null): GroupAssignment[] {
  const n = participants.length
  if (n < 4) throw new Error('Group stage requires at least 4 participants')

  // Determine group count
  let g: number
  if (requestedGroupCount && requestedGroupCount >= 2 && requestedGroupCount <= Math.floor(n / 2)) {
    g = requestedGroupCount
  } else {
    // Aim for group size 4-6
    const target = 4
    g = Math.max(2, Math.round(n / target))
  }

  // Sort by seed (best first)
  const sorted = [...participants].sort((a, b) => a.seed - b.seed)

  // Snake draft: assign to groups A, B, C, ..., then back C, B, A, repeating
  const groups: ParticipantSeed[][] = Array.from({ length: g }, () => [])
  let direction = 1
  let idx = 0
  for (const p of sorted) {
    groups[idx].push(p)
    idx += direction
    if (idx >= g) {
      direction = -1
      idx = g - 1
    } else if (idx < 0) {
      direction = 1
      idx = 0
    }
  }

  return groups.map((participants, i) => ({
    groupId: String.fromCharCode(65 + i), // A, B, C, ...
    participants,
  }))
}

/**
 * Generate knockout bracket pairings from qualified players.
 * Returns rounds 1..N where total rounds = ceil(log2(qualifiedCount)).
 * Byes are placed strategically (top seeds get byes).
 */
export function generateKnockoutBracket(qualified: ParticipantSeed[], roundOffset: number): KnockoutPairing[][] {
  const n = qualified.length
  if (n < 2) return []

  // Total slots = next power of 2
  let totalSlots = 1
  while (totalSlots < n) totalSlots *= 2
  const byes = totalSlots - n

  // Pad with nulls (BYEs)
  const slots: (ParticipantSeed | null)[] = [...qualified]
  while (slots.length < totalSlots) slots.push(null)

  // Top seeds get byes (positions 1, 2, then maybe 4, 8...)
  // Standard bracket placement: seed 1 vs worst, seed 2 vs second-worst, etc.
  // But give byes to top seeds so they rest first round.
  const seeded: (ParticipantSeed | null)[] = new Array(totalSlots).fill(null)

  // Place top seeds with byes (at positions 0 and totalSlots/2 for round 1)
  if (byes > 0) {
    const seededSlots = [0, totalSlots / 2]
    let i = 0
    for (const p of qualified) {
      if (i < byes && seededSlots[i] !== undefined) {
        seeded[seededSlots[i]] = p
      } else {
        // Find next empty slot
        const next = seeded.findIndex((s, idx) => s === null && idx >= (i - byes) * 2 && !seededSlots.includes(idx))
        // Simpler: place remaining players in remaining slots in order
        for (let k = 0; k < totalSlots; k++) {
          if (seeded[k] === null && !seededSlots.includes(k)) {
            seeded[k] = p
            break
          }
        }
      }
      i++
    }
  } else {
    for (let k = 0; k < totalSlots; k++) seeded[k] = slots[k]
  }

  // Generate round 1 pairings
  const rounds: KnockoutPairing[][] = []
  const round1: KnockoutPairing[] = []
  for (let i = 0; i < totalSlots / 2; i++) {
    const a = seeded[i]
    const b = seeded[totalSlots - 1 - i]
    round1.push({
      bracketSlot: getBracketSlotName(0, i, totalSlots),
      roundNumber: roundOffset + 1,
      player1: a,
      player2: b,
      sourceMatchIds: [],
    })
  }
  rounds.push(round1)

  // Pre-generate subsequent rounds (placeholders)
  let prevRoundSize = totalSlots / 2
  let roundNum = roundOffset + 2
  while (prevRoundSize > 1) {
    const round: KnockoutPairing[] = []
    for (let i = 0; i < prevRoundSize / 2; i++) {
      round.push({
        bracketSlot: getBracketSlotName(rounds.length, i, prevRoundSize),
        roundNumber: roundNum,
        player1: null,
        player2: null,
        sourceMatchIds: getSourceMatchIds(rounds.length, i, prevRoundSize),
      })
    }
    rounds.push(round)
    prevRoundSize = prevRoundSize / 2
    roundNum++
  }

  return rounds
}

function getBracketSlotName(roundIdx: number, idx: number, totalSlots: number): string {
  const totalRounds = Math.log2(totalSlots)
  const currentRound = totalRounds - roundIdx
  const names = ['Chung kết', 'Bán kết', 'Tứ kết', 'Vòng 1/8', 'Vòng 1/16', 'Vòng 1/32']
  const baseName = names[currentRound - 1] ?? `Vòng ${currentRound}`
  return `${baseName} - Trận ${idx + 1}`
}

function getSourceMatchIds(roundIdx: number, idx: number, totalSlots: number): string[] {
  // Recursive placeholder - actual matchIds are assigned when previous round completes
  return []
}
