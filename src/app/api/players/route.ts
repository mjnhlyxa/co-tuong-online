import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Player, generateRecoveryCode } from '@/models/Player'
import { getTier } from '@/lib/elo'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { deviceId, name, language = 'vi' } = await req.json()

    if (!deviceId) return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
    if (!name || name.trim().length < 2 || name.trim().length > 16) {
      return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 })
    }

    const existing = await Player.findOne({ deviceId })
    if (existing) {
      return NextResponse.json({
        deviceId: existing.deviceId,
        name: existing.name,
        ranking: existing.ranking,
        recoveryCode: existing.recoveryCode,
      })
    }

    // Generate unique recovery code
    let recoveryCode = generateRecoveryCode()
    let attempts = 0
    while (await Player.findOne({ recoveryCode }) && attempts < 5) {
      recoveryCode = generateRecoveryCode()
      attempts++
    }

    const player = await Player.create({
      deviceId,
      name: name.trim(),
      preferences: { language },
      ranking: { elo: 1500, tier: getTier(1500), peakElo: 1500 },
      recoveryCode,
    })

    return NextResponse.json({
      deviceId: player.deviceId,
      name: player.name,
      ranking: player.ranking,
      recoveryCode: player.recoveryCode,
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/players error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
