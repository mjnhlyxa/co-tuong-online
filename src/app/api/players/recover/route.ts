import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Player } from '@/models/Player'

/**
 * POST /api/players/recover
 * Body: { code, deviceId }
 * Result: swaps the player's deviceId to the new one, returning player info
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const { code, deviceId } = await req.json()
    if (!code || !deviceId) {
      return NextResponse.json({ error: 'code and deviceId required' }, { status: 400 })
    }
    // Normalize code: uppercase, trim, remove spaces
    const normalizedCode = String(code).toUpperCase().replace(/\s/g, '')
    if (normalizedCode.length < 10 || normalizedCode.length > 16) {
      return NextResponse.json({ error: 'CODE_INVALID' }, { status: 400 })
    }

    const player = await Player.findOne({ recoveryCode: normalizedCode })
    if (!player) {
      return NextResponse.json({ error: 'CODE_NOT_FOUND' }, { status: 404 })
    }

    // Check if deviceId is already taken by another player
    const existing = await Player.findOne({ deviceId })
    if (existing && existing.deviceId !== player.deviceId) {
      return NextResponse.json({ error: 'DEVICE_TAKEN' }, { status: 409 })
    }

    // Swap deviceId
    player.deviceId = deviceId
    player.lastSeenAt = new Date()
    await player.save()

    return NextResponse.json({
      deviceId: player.deviceId,
      name: player.name,
      ranking: player.ranking,
      stats: player.stats,
    })
  } catch (err) {
    console.error('POST /api/players/recover error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/players/regenerate-code
 * Body: { deviceId }
 * Result: regenerates the recovery code for an existing user
 */
export async function PUT(req: NextRequest) {
  try {
    await connectDB()
    const { deviceId } = await req.json()
    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
    }

    const { generateRecoveryCode } = await import('@/models/Player')
    const player = await Player.findOne({ deviceId })
    if (!player) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    let newCode = generateRecoveryCode()
    let attempts = 0
    while (await Player.findOne({ recoveryCode: newCode, _id: { $ne: player._id } }) && attempts < 5) {
      newCode = generateRecoveryCode()
      attempts++
    }
    player.recoveryCode = newCode
    await player.save()
    return NextResponse.json({ recoveryCode: newCode })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
