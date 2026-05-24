import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { connectDB } from '@/lib/mongodb'
import { Room } from '@/models/Room'
import { Player } from '@/models/Player'

export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const tier = searchParams.get('tier')

    const query: Record<string, unknown> = { type: 'public', status: 'waiting' }
    if (tier) query['host.tier'] = tier

    const rooms = await Room.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    return NextResponse.json({
      rooms: rooms.map(r => ({
        roomId: r.roomId,
        type: r.type,
        status: r.status,
        host: { name: r.host.name, elo: r.host.elo, tier: r.host.tier },
        timeControl: r.timeControl,
        allowSpectators: r.allowSpectators,
        createdAt: r.createdAt,
      }))
    })
  } catch (err) {
    console.error('GET /api/rooms error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()
    const { deviceId, type, timeControl, allowSpectators = true, allowTakeback = true } = body

    if (!deviceId) return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
    if (!['public', 'private'].includes(type)) {
      return NextResponse.json({ error: 'type must be public or private' }, { status: 400 })
    }

    const player = await Player.findOne({ deviceId }).lean()
    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const roomId = uuidv4()
    await Room.create({
      roomId,
      type,
      status: 'waiting',
      host: {
        deviceId,
        name: player.name,
        elo: player.ranking.elo,
        tier: player.ranking.tier,
        color: 'red',
      },
      guest: { deviceId: null, name: null, elo: null, tier: null, color: null },
      timeControl: timeControl ?? null,
      allowSpectators,
      allowTakeback,
    })

    return NextResponse.json({ roomId, shareLink: `/game/${roomId}`, type }, { status: 201 })
  } catch (err) {
    console.error('POST /api/rooms error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
