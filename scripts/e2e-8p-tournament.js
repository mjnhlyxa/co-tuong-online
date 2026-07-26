#!/usr/bin/env node
/**
 * E2E 8-Player Tournament Test
 * Runs against https://co-tuong-online.vercel.app
 * Creates 8 players, has them join a tournament, plays all 28 matches,
 * verifies final standings.
 */

const API = process.env.API_BASE || 'https://co-tuong-online.vercel.app'

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}

async function registerPlayer(name, deviceId) {
  return api('/api/players', {
    method: 'POST',
    body: JSON.stringify({ deviceId, name }),
  })
}

async function runE2E() {
  const N = 8
  const ts = Date.now()
  const players = Array.from({ length: N }, (_, i) => `P${i+1}-${ts}`.slice(0, 16))
  const deviceIds = players.map((_, i) => `e2e-${ts}-${i+1}`)

  console.log('\n=== E2E 8-Player Tournament Test ===\n')
  console.log(`Step 1: Registering ${N} players...`)
  for (let i = 0; i < N; i++) {
    const r = await registerPlayer(players[i], deviceIds[i])
    if (r.status !== 201 && r.status !== 200) {
      console.error(`Failed to register ${players[i]}: ${r.status}`, r.data)
      return
    }
  }
  console.log(`  ✓ Registered ${N} players\n`)

  console.log('Step 2: Host creates tournament...')
  const t = await api('/api/tournaments', {
    method: 'POST',
    body: JSON.stringify({
      deviceId: deviceIds[0],
      name: players[0],
      tournamentName: `E2E 8P Test ${ts}`,
      format: 'ROUND_ROBIN',
      timeControlMinutes: 20,
      drawPoints: 1,
      minPlayers: 3,
    }),
  })
  if (t.status !== 201) {
    console.error('Failed to create tournament:', t.status, t.data)
    return
  }
  const tournamentId = t.data.tournamentId
  console.log(`  ✓ Tournament: ${tournamentId}\n`)

  console.log('Step 3: Other 7 players join...')
  for (let i = 1; i < N; i++) {
    const r = await api(`/api/tournaments/${tournamentId}/join`, {
      method: 'POST',
      body: JSON.stringify({ deviceId: deviceIds[i], name: players[i] }),
    })
    if (r.status !== 201) {
      console.error(`Failed to join ${players[i]}:`, r.status, r.data)
      return
    }
  }
  console.log(`  ✓ All ${N - 1} other players joined\n`)

  console.log('Step 4: Host starts tournament...')
  const s = await api(`/api/tournaments/${tournamentId}/start`, {
    method: 'POST',
    body: JSON.stringify({ deviceId: deviceIds[0] }),
  })
  if (!s.status || s.status !== 200) {
    console.error('Failed to start tournament:', s.status, s.data)
    return
  }
  console.log('  ✓ Tournament started\n')

  console.log('Step 5: Get all 28 matches...')
  const tData = await api(`/api/tournaments/${tournamentId}?deviceId=${deviceIds[0]}`)
  const matches = (tData.data.matches || []).filter(m => m.player1 && m.player2)
  console.log(`  ✓ Found ${matches.length} matches (expected 28)\n`)
  if (matches.length !== 28) {
    console.error(`  ✗ Expected 28 matches, got ${matches.length}`)
    return
  }

  console.log('Step 6: Play all 28 matches (2-step claim + host result)...')
  let completed = 0
  const errors = []
  const winnerRng = () => Math.random() < 0.45 ? 'PLAYER1' : (Math.random() < 0.9 ? 'PLAYER2' : 'DRAW')
  for (const match of matches) {
    try {
      // Claim 1
      const c1 = await api(`/api/tournaments/${tournamentId}/match/${match.matchId}/start`, {
        method: 'POST',
        body: JSON.stringify({ deviceId: match.player1.deviceId }),
      })
      if (!c1.status || c1.status !== 200) {
        errors.push(`Claim 1 failed for match ${match.matchId}: ${c1.status}`)
        continue
      }
      // Claim 2 (creates game)
      const c2 = await api(`/api/tournaments/${tournamentId}/match/${match.matchId}/start`, {
        method: 'POST',
        body: JSON.stringify({ deviceId: match.player2.deviceId }),
      })
      if (!c2.status || c2.status !== 200 || !c2.data.gameId) {
        errors.push(`Claim 2 failed for match ${match.matchId}: ${c2.status} ${JSON.stringify(c2.data)}`)
        continue
      }
      // Host submits result
      const winner = winnerRng()
      const r = await api(`/api/tournaments/${tournamentId}/match/${match.matchId}/result`, {
        method: 'POST',
        body: JSON.stringify({ deviceId: deviceIds[0], winner }),
      })
      if (r.status !== 200) {
        errors.push(`Result failed for match ${match.matchId}: ${r.status}`)
        continue
      }
      completed++
      if (completed % 7 === 0 || completed === 28) {
        console.log(`  ✓ ${completed}/28 matches complete`)
      }
    } catch (e) {
      errors.push(`Match ${match.matchId}: ${e.message}`)
    }
  }

  console.log(`\nStep 7: Verify final standings...`)
  const finalData = await api(`/api/tournaments/${tournamentId}/standings`)
  const standings = finalData.data.standings || []
  console.log(`  Total players: ${standings.length}`)
  console.log(`  Champion: ${standings[0]?.nameSnapshot} with ${standings[0]?.stats.points}pts (${standings[0]?.stats.wins}W ${standings[0]?.stats.draws}D ${standings[0]?.stats.losses}L)`)

  console.log(`\n=== RESULTS ===`)
  console.log(`Matches played: ${completed}/28`)
  console.log(`Errors: ${errors.length}`)
  if (errors.length > 0) {
    console.log('First 3 errors:')
    errors.slice(0, 3).forEach(e => console.log(`  - ${e}`))
  }
  console.log(`\nStandings:`)
  standings.forEach(s => {
    console.log(`  #${s.rank} ${s.nameSnapshot.padEnd(15)} ${String(s.stats.points).padStart(3)}pts (${s.stats.wins}W ${s.stats.draws}D ${s.stats.losses}L)`)
  })
  console.log(`\nTournament URL: ${API}/tournament/${tournamentId}`)
}

runE2E().catch(e => {
  console.error('FATAL:', e)
  process.exit(1)
})
