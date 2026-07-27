import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Player } from '@/models/Player'
import { getTier } from '@/lib/elo'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    await connectDB()
    const { deviceId } = await params

    const player = await Player.findOne({ deviceId }).lean()
    if (!player) return NextResponse.json({ exists: false })

    // Update lastSeenAt
    await Player.findOneAndUpdate({ deviceId }, { $set: { lastSeenAt: new Date() } })

    return NextResponse.json({
      exists: true,
      deviceId: player.deviceId,
      name: player.name,
      stats: player.stats,
      ranking: player.ranking,
      preferences: player.preferences,
      recoveryCode: player.recoveryCode,
    })
  } catch (err) {
    console.error('GET /api/players/[deviceId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    await connectDB()
    const { deviceId } = await params
    const body = await req.json()

    const update: Record<string, unknown> = {}
    if (body.name !== undefined) {
      if (body.name.trim().length < 2 || body.name.trim().length > 16) {
        return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 })
      }
      update['name'] = body.name.trim()
    }
    if (body.language !== undefined) {
      update['preferences.language'] = body.language
    }

    const player = await Player.findOneAndUpdate(
      { deviceId },
      { $set: update },
      { new: true }
    ).lean()

    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    return NextResponse.json({
      deviceId: player.deviceId,
      name: player.name,
      stats: player.stats,
      ranking: player.ranking,
      preferences: player.preferences,
    })
  } catch (err) {
    console.error('PUT /api/players/[deviceId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
