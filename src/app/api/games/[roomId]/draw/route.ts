import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { Game } from '@/models/Game'
import { Room } from '@/models/Room'
import { updateElo } from '@/app/api/games/[roomId]/route'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await connectDB()
    const { roomId } = await params
    const { deviceId, action } = await req.json()
    if (!deviceId || !['offer', 'accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'deviceId + action (offer|accept|reject) required' }, { status: 400 })
    }

    const game = await Game.findOne({ roomId })
    if (!game) return NextResponse.json({ error: 'GAME_NOT_FOUND' }, { status: 404 })
    if (game.status !== 'playing') return NextResponse.json({ error: 'Game not in progress' }, { status: 400 })

    const myColor = deviceId === game.redPlayer.deviceId ? 'red'
      : deviceId === game.blackPlayer.deviceId ? 'black' : null
    if (!myColor) return NextResponse.json({ error: 'Not a player' }, { status: 403 })

    if (action === 'offer') {
      if (game.drawOffer && game.drawOffer.status === 'pending') {
        return NextResponse.json({ error: 'Draw offer already pending' }, { status: 400 })
      }
      game.drawOffer = { fromColor: myColor, status: 'pending' }
      await game.save()
      return NextResponse.json({ ok: true, status: 'pending' })
    }

    if (!game.drawOffer || game.drawOffer.status !== 'pending') {
      return NextResponse.json({ error: 'No pending draw offer' }, { status: 400 })
    }
    if (game.drawOffer.fromColor === myColor) {
      return NextResponse.json({ error: 'Cannot respond to your own offer' }, { status: 400 })
    }

    if (action === 'accept') {
      game.winner = 'draw'
      game.endReason = 'draw_agreement'
      game.status = 'finished'
      game.finishedAt = new Date()
      game.drawOffer = undefined
      await game.save()
      await Room.findOneAndUpdate({ roomId }, { status: 'finished' })
      await updateElo(game.redPlayer.deviceId, game.blackPlayer.deviceId, 'draw', game)
      return NextResponse.json({ ok: true, status: 'draw' })
    } else {
      game.drawOffer = undefined
      await game.save()
      return NextResponse.json({ ok: true, status: 'rejected' })
    }
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
