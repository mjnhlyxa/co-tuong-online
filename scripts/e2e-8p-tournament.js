#!/usr/bin/env node
/**
 * E2E 8-Player Tournament Test — REAL GAMES (server-side legal moves)
 * Uses /api/games/[id]/legal-moves to get all valid moves quickly.
 */

const API = process.env.API_BASE || 'https://co-tuong-online.vercel.app'

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}

async function makeSmartMove(gameId, deviceId) {
  // Get all legal moves
  const lr = await api(`/api/games/${gameId}/legal-moves`)
  if (lr.status !== 200 || !lr.data.moves?.length) return { ok: false, reason: 'no moves' }
  const moves = lr.data.moves
  const moveNumber = lr.data.moveNumber
  // Pick random move
  const move = moves[Math.floor(Math.random() * moves.length)]
  const r = await api(`/api/games/${gameId}/move`, {
    method: 'POST',
    body: JSON.stringify({ deviceId, moveNumber, from: move.from, to: move.to }),
  })
  if (r.status === 200) {
    return { ok: true, winner: r.data.winner, moveNumber: r.data.moveNumber }
  }
  return { ok: false, reason: `move failed ${r.status}` }
}

async function playFullGame(gameId, redDeviceId, blackDeviceId) {
  const maxMoves = 80
  for (let i = 0; i < maxMoves; i++) {
    const gr = await api(`/api/games/${gameId}`)
    if (gr.status !== 200) return { error: 'get failed' }
    if (gr.data.status === 'finished') {
      return { completed: true, moves: i, winner: gr.data.winner, endReason: gr.data.endReason }
    }
    const deviceId = gr.data.currentTurn === 'red' ? redDeviceId : blackDeviceId
    // Heartbeat
    await api(`/api/games/${gameId}/heartbeat`, {
      method: 'POST', body: JSON.stringify({ deviceId }),
    }).catch(() => {})
    const r = await makeSmartMove(gameId, deviceId)
    if (!r.ok) return { error: r.reason, moveCount: i }
    if (r.winner) {
      return { completed: true, moves: i + 1, winner: r.winner, endReason: 'checkmate' }
    }
  }
  return { error: 'max moves', moves: maxMoves }
}

async function runE2E() {
  const N = 8
  const ts = Date.now()
  const players = Array.from({ length: N }, (_, i) => `P${i+1}-${ts}`.slice(0, 16))
  const deviceIds = players.map((_, i) => `real-${ts}-${i+1}`)

  console.log('\n=== E2E 8-Player Tournament (REAL GAMES via /legal-moves) ===\n')
  for (let i = 0; i < N; i++) {
    await api('/api/players', {
      method: 'POST', body: JSON.stringify({ deviceId: deviceIds[i], name: players[i] }),
    })
  }
  console.log('Step 1: 8 players registered')

  const t = await api('/api/tournaments', {
    method: 'POST', body: JSON.stringify({
      deviceId: deviceIds[0], name: players[0],
      tournamentName: `Real ${ts}`,
      format: 'ROUND_ROBIN', timeControlMinutes: 20, drawPoints: 1, minPlayers: 3,
    }),
  })
  const tournamentId = t.data.tournamentId
  for (let i = 1; i < N; i++) {
    await api(`/api/tournaments/${tournamentId}/join`, {
      method: 'POST', body: JSON.stringify({ deviceId: deviceIds[i], name: players[i] }),
    })
  }
  await api(`/api/tournaments/${tournamentId}/start`, {
    method: 'POST', body: JSON.stringify({ deviceId: deviceIds[0] }),
  })
  console.log('Step 2-3: Tournament started')

  const tData = await api(`/api/tournaments/${tournamentId}?deviceId=${deviceIds[0]}`)
  const matches = (tData.data.matches || []).filter(m => m.player1 && m.player2)
  console.log(`Step 4: ${matches.length} matches`)

  console.log(`\nStep 5: Play all ${matches.length} matches with REAL games...`)
  let completed = 0, totalMoves = 0, errors = 0
  const startTime = Date.now()
  const winnerCount = { PLAYER1: 0, PLAYER2: 0, DRAW: 0, UNKNOWN: 0 }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    try {
      await api(`/api/tournaments/${tournamentId}/match/${match.matchId}/start`, {
        method: 'POST', body: JSON.stringify({ deviceId: match.player1.deviceId }),
      })
      const c2 = await api(`/api/tournaments/${tournamentId}/match/${match.matchId}/start`, {
        method: 'POST', body: JSON.stringify({ deviceId: match.player2.deviceId }),
      })
      if (!c2.data?.gameId) { errors++; continue }
      const gameId = c2.data.gameId
      const result = await playFullGame(gameId, match.player1.deviceId, match.player2.deviceId)
      if (result.completed) {
        const winner = result.winner === 'red' ? 'PLAYER1' : result.winner === 'black' ? 'PLAYER2' : 'DRAW'
        await api(`/api/tournaments/${tournamentId}/match/${match.matchId}/result`, {
          method: 'POST', body: JSON.stringify({ deviceId: deviceIds[0], winner }),
        })
        completed++
        totalMoves += result.moves
        winnerCount[winner] = (winnerCount[winner] || 0) + 1
        const winnerName = winner === 'DRAW' ? 'hòa' : (winner === 'PLAYER1' ? match.player1.nameSnapshot : match.player2.nameSnapshot)
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(`  ${String(i+1).padStart(2)}/${matches.length}: ${String(result.moves).padStart(3)} moves → ${winnerName} (${result.endReason || 'normal'}) [${elapsed}s]`)
      } else {
        errors++
        console.log(`  ${String(i+1).padStart(2)}/${matches.length}: ERROR ${result.error}`)
      }
    } catch (e) {
      errors++
      console.log(`  ${String(i+1).padStart(2)}/${matches.length}: EXC ${e.message?.slice(0, 60)}`)
    }
  }

  const finalData = await api(`/api/tournaments/${tournamentId}/standings`)
  const standings = finalData.data.standings || []

  console.log(`\n=== RESULTS ===`)
  console.log(`Completed: ${completed}/28 (errors: ${errors})`)
  console.log(`Total moves: ${totalMoves} (avg ${(totalMoves / Math.max(completed, 1)).toFixed(1)}/game)`)
  console.log(`Outcomes: P1=${winnerCount.PLAYER1}, P2=${winnerCount.PLAYER2}, Draw=${winnerCount.DRAW}`)
  console.log(`Time: ${((Date.now() - startTime) / 1000).toFixed(1)}s\n`)
  console.log('Final Standings:')
  standings.forEach(s => {
    const total = s.stats.wins + s.stats.draws + s.stats.losses
    const pct = total > 0 ? Math.round((s.stats.wins / total) * 100) : 0
    console.log(`  #${s.rank} ${s.nameSnapshot.padEnd(15)} ${String(s.stats.points).padStart(3)}pts (${s.stats.wins}W ${s.stats.draws}D ${s.stats.losses}L, ${pct}%)`)
  })
  console.log(`\nTournament: ${API}/tournament/${tournamentId}`)
}

runE2E().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
