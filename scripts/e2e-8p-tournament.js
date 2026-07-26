#!/usr/bin/env node
/**
 * E2E 8-Player Tournament — REAL GAMES (practical version)
 * Plays 15 real moves per game, then picks winner by material.
 */

const API = process.env.API_BASE || 'https://co-tuong-online.vercel.app'

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}

const PIECE_VALUE = { jiang: 100, ju: 90, pao: 45, ma: 40, xiang: 20, shi: 20, zu: 10 }

function materialCount(board, color) {
  let total = 0
  for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) {
    const p = board[r][c]
    if (!p) continue
    const isRed = p.startsWith('r-')
    if ((color === 'red' && isRed) || (color === 'black' && !isRed)) {
      const type = p.split('-')[1]
      total += PIECE_VALUE[type] ?? 0
    }
  }
  return total
}

async function playQuickGame(gameId, redDeviceId, blackDeviceId) {
  const maxMoves = 15
  for (let i = 0; i < maxMoves; i++) {
    const gr = await api(`/api/games/${gameId}`)
    if (gr.status !== 200) return { error: 'get' }
    if (gr.data.status === 'finished') {
      return { completed: true, moves: i, winner: gr.data.winner, endReason: gr.data.endReason }
    }
    const deviceId = gr.data.currentTurn === 'red' ? redDeviceId : blackDeviceId
    await api(`/api/games/${gameId}/heartbeat`, {
      method: 'POST', body: JSON.stringify({ deviceId }),
    }).catch(() => {})
    const lr = await api(`/api/games/${gameId}/legal-moves`)
    if (lr.status !== 200 || !lr.data.moves?.length) {
      return { error: 'no moves' }
    }
    const moves = lr.data.moves
    const move = moves[Math.floor(Math.random() * moves.length)]
    const r = await api(`/api/games/${gameId}/move`, {
      method: 'POST', body: JSON.stringify({ deviceId, moveNumber: lr.data.moveNumber, from: move.from, to: move.to }),
    })
    if (r.status !== 200) return { error: `move ${r.status}` }
    if (r.data.winner) {
      return { completed: true, moves: i + 1, winner: r.data.winner, endReason: 'checkmate' }
    }
  }
  // No checkmate — pick winner by material
  const gr = await api(`/api/games/${gameId}`)
  const board = gr.data.boardState
  const redM = materialCount(board, 'red')
  const blackM = materialCount(board, 'black')
  const winner = redM >= blackM ? 'red' : 'black'
  return { completed: true, moves: maxMoves, winner, endReason: 'material' }
}

async function runE2E() {
  const N = 8
  const ts = Date.now()
  const players = Array.from({ length: N }, (_, i) => `P${i+1}-${ts}`.slice(0, 16))
  const deviceIds = players.map((_, i) => `real-${ts}-${i+1}`)

  console.log('\n=== E2E 8-Player Tournament (REAL GAMES) ===\n')
  for (let i = 0; i < N; i++) {
    await api('/api/players', { method: 'POST', body: JSON.stringify({ deviceId: deviceIds[i], name: players[i] }) })
  }
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
  const tData = await api(`/api/tournaments/${tournamentId}?deviceId=${deviceIds[0]}`)
  const matches = (tData.data.matches || []).filter(m => m.player1 && m.player2)
  console.log(`Tournament: ${tournamentId} (${matches.length} matches)\n`)

  let completed = 0, totalMoves = 0, errors = 0
  const startTime = Date.now()
  const outcomes = { checkmate: 0, material: 0 }

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
      const result = await playQuickGame(c2.data.gameId, match.player1.deviceId, match.player2.deviceId)
      if (result.completed) {
        const winner = result.winner === 'red' ? 'PLAYER1' : 'PLAYER2'
        await api(`/api/tournaments/${tournamentId}/match/${match.matchId}/result`, {
          method: 'POST', body: JSON.stringify({ deviceId: deviceIds[0], winner }),
        })
        completed++
        totalMoves += result.moves
        outcomes[result.endReason] = (outcomes[result.endReason] || 0) + 1
        const winnerName = winner === 'PLAYER1' ? match.player1.nameSnapshot : match.player2.nameSnapshot
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        console.log(`  ${String(i+1).padStart(2)}/28: ${String(result.moves).padStart(2)}m → ${winnerName} (${result.endReason}) [${elapsed}s]`)
      } else {
        errors++
        console.log(`  ${String(i+1).padStart(2)}/28: ERR ${result.error}`)
      }
    } catch (e) {
      errors++
      console.log(`  ${String(i+1).padStart(2)}/28: EXC ${e.message?.slice(0, 60)}`)
    }
  }

  const finalData = await api(`/api/tournaments/${tournamentId}/standings`)
  const standings = finalData.data.standings || []

  console.log(`\n=== RESULTS ===`)
  console.log(`Completed: ${completed}/28 (errors: ${errors})`)
  console.log(`Total moves played: ${totalMoves} (avg ${(totalMoves / Math.max(completed, 1)).toFixed(1)}/game)`)
  console.log(`Outcomes: checkmate=${outcomes.checkmate || 0}, material=${outcomes.material || 0}`)
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
