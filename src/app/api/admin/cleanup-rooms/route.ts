import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { Room } from '@/models/Room'

export async function POST(req: NextRequest) {
  try {
    await connectDB()

    // Find all rooms with status='playing' that have finished games
    const rooms = await Room.find({ status: 'playing' }).lean()

    let fixed = 0
    for (const room of rooms) {
      const game = await Game.findOne({ roomId: room.roomId }).lean()
      if (game && game.status === 'finished') {
        await Room.updateOne({ roomId: room.roomId }, { status: 'finished' })
        fixed++
      }
    }

    return NextResponse.json({ message: `Fixed ${fixed} rooms` })
  } catch (err) {
    console.error('Cleanup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}