import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { Room } from '@/models/Room'
import { updateElo } from '../route'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB()
    const { roomId } = await params
    const { deviceId } = await req.json()

    const game = await Game.findOne({ roomId })
    if (!game) return NextResponse.json({ error: 'ROOM_NOT_FOUND' }, { status: 404 })
    if (game.status === 'finished') return NextResponse.json({ error: 'GAME_FINISHED' }, { status: 400 })

    let myColor: 'red' | 'black' | null = null
    if (deviceId === game.redPlayer.deviceId) myColor = 'red'
    else if (deviceId === game.blackPlayer.deviceId) myColor = 'black'
    if (!myColor) return NextResponse.json({ error: 'NOT_A_PLAYER' }, { status: 403 })

    const winner: 'red' | 'black' = myColor === 'red' ? 'black' : 'red'
    await Game.findOneAndUpdate({ roomId }, {
      $set: { winner, endReason: 'resign', status: 'finished', finishedAt: new Date() }
    })
    await Room.findOneAndUpdate({ roomId }, { status: 'finished' })
    await updateElo(game.redPlayer.deviceId, game.blackPlayer.deviceId, winner, game)

    return NextResponse.json({ success: true, winner })
  } catch (err) {
    console.error('POST resign error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
