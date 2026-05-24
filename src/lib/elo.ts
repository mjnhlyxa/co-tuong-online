export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export function getTier(elo: number): Tier {
  if (elo < 1200) return 'bronze'
  if (elo < 1400) return 'silver'
  if (elo < 1600) return 'gold'
  if (elo < 1900) return 'platinum'
  return 'diamond'
}

// S: 1=win, 0.5=draw, 0=loss
export function calculateElo(playerElo: number, opponentElo: number, result: 1 | 0.5 | 0, totalGames: number): number {
  const K = totalGames < 20 ? 32 : 16
  const E = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
  const newElo = Math.round(playerElo + K * (result - E))
  return Math.max(100, newElo) // floor at 100
}
