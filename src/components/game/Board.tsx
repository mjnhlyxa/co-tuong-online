'use client'

import { useState, useCallback } from 'react'
import { getLegalMoves } from '@/lib/xiangqi/rules'
import { PIECE_CHARS } from '@/lib/xiangqi/notation'
import type { BoardState, Position, Color, MoveRecord } from '@/types'

const CELL = 56   // px per cell
const PADDING = 32
const BOARD_W = 8 * CELL + 2 * PADDING
const BOARD_H = 9 * CELL + 2 * PADDING

interface BoardProps {
  board: BoardState
  myColor: Color | null
  currentTurn: Color
  lastMove: MoveRecord | null
  isInCheck: boolean
  disabled?: boolean
  onMove: (from: Position, to: Position) => void
}

function toSVG(row: number, col: number, flipped: boolean) {
  const r = flipped ? 9 - row : row
  const c = flipped ? 8 - col : col
  return { x: PADDING + c * CELL, y: PADDING + r * CELL }
}

export default function Board({ board, myColor, currentTurn, lastMove, isInCheck, disabled, onMove }: BoardProps) {
  const [selected, setSelected] = useState<Position | null>(null)
  const [validMoves, setValidMoves] = useState<Position[]>([])

  const flipped = myColor === 'black'

  function getPieceAt(row: number, col: number): string | null {
    return board[row]?.[col] ?? null
  }

  function getPieceColor(code: string): Color {
    return code.startsWith('r-') ? 'red' : 'black'
  }

  const handleIntersectionClick = useCallback((row: number, col: number) => {
    if (disabled) return

    const piece = getPieceAt(row, col)

    // If something is selected
    if (selected) {
      // Clicking a valid move target
      const isValid = validMoves.some(m => m.row === row && m.col === col)
      if (isValid) {
        onMove(selected, { row, col })
        setSelected(null)
        setValidMoves([])
        return
      }

      // Clicking own piece — re-select
      if (piece && getPieceColor(piece) === myColor) {
        const moves = getLegalMoves(board, { row, col }, myColor)
        setSelected({ row, col })
        setValidMoves(moves)
        return
      }

      // Clicking empty or enemy without being in valid moves — deselect
      setSelected(null)
      setValidMoves([])
      return
    }

    // Nothing selected: select own piece on our turn
    if (piece && myColor && getPieceColor(piece) === myColor && currentTurn === myColor) {
      const moves = getLegalMoves(board, { row, col }, myColor)
      setSelected({ row, col })
      setValidMoves(moves)
    }
  }, [board, selected, validMoves, myColor, currentTurn, disabled, onMove])

  function isLastMovePos(row: number, col: number): boolean {
    if (!lastMove) return false
    return (lastMove.from.row === row && lastMove.from.col === col) ||
      (lastMove.to.row === row && lastMove.to.col === col)
  }

  function isKingInCheck(row: number, col: number): boolean {
    if (!isInCheck) return false
    const piece = getPieceAt(row, col)
    if (!piece) return false
    return piece === `${currentTurn === 'red' ? 'r' : 'b'}-jiang`
  }

  const positions: { row: number; col: number }[] = []
  for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) positions.push({ row: r, col: c })

  return (
    <div className="relative select-none" style={{ touchAction: 'none' }}>
      <svg
        width={BOARD_W}
        height={BOARD_H}
        viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
        className="max-w-full"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {/* Board background */}
        <rect width={BOARD_W} height={BOARD_H} fill="#c8a96e" rx="4" />

        {/* Grid lines */}
        {Array.from({ length: 9 }, (_, r) => {
          const { x: x0, y: y0 } = toSVG(r, 0, flipped)
          const { x: x1, y: y1 } = toSVG(r, 8, flipped)
          return <line key={`hr${r}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#8b6914" strokeWidth="1" />
        })}
        {/* River break: cols 0 and 8 are full, inner cols break at river */}
        <line x1={toSVG(0,0,flipped).x} y1={toSVG(0,0,flipped).y} x2={toSVG(9,0,flipped).x} y2={toSVG(9,0,flipped).y} stroke="#8b6914" strokeWidth="1" />
        <line x1={toSVG(0,8,flipped).x} y1={toSVG(0,8,flipped).y} x2={toSVG(9,8,flipped).x} y2={toSVG(9,8,flipped).y} stroke="#8b6914" strokeWidth="1" />
        {Array.from({ length: 7 }, (_, ci) => {
          const c = ci + 1
          const { x, y: y0 } = toSVG(0, c, flipped)
          const { y: y1 } = toSVG(4, c, flipped)
          const { y: y2 } = toSVG(5, c, flipped)
          const { y: y3 } = toSVG(9, c, flipped)
          return (
            <g key={`vc${c}`}>
              <line x1={x} y1={y0} x2={x} y2={y1} stroke="#8b6914" strokeWidth="1" />
              <line x1={x} y1={y2} x2={x} y2={y3} stroke="#8b6914" strokeWidth="1" />
            </g>
          )
        })}

        {/* Palace diagonals — top (rows 0-2, cols 3-5) */}
        {(() => {
          const tl0 = toSVG(0, 3, flipped), tr0 = toSVG(0, 5, flipped)
          const bl0 = toSVG(2, 3, flipped), br0 = toSVG(2, 5, flipped)
          const tl1 = toSVG(7, 3, flipped), tr1 = toSVG(7, 5, flipped)
          const bl1 = toSVG(9, 3, flipped), br1 = toSVG(9, 5, flipped)
          return <>
            <line x1={tl0.x} y1={tl0.y} x2={br0.x} y2={br0.y} stroke="#8b6914" strokeWidth="1" />
            <line x1={tr0.x} y1={tr0.y} x2={bl0.x} y2={bl0.y} stroke="#8b6914" strokeWidth="1" />
            <line x1={tl1.x} y1={tl1.y} x2={br1.x} y2={br1.y} stroke="#8b6914" strokeWidth="1" />
            <line x1={tr1.x} y1={tr1.y} x2={bl1.x} y2={bl1.y} stroke="#8b6914" strokeWidth="1" />
          </>
        })()}

        {/* River text */}
        {(() => {
          const y = (toSVG(4, 0, flipped).y + toSVG(5, 0, flipped).y) / 2 + 6
          return <>
            <text x={BOARD_W / 2 - 40} y={y} fill="#8b6914" fontSize="18" fontFamily="'Noto Serif SC', serif" opacity="0.6" textAnchor="middle">楚河</text>
            <text x={BOARD_W / 2 + 40} y={y} fill="#8b6914" fontSize="18" fontFamily="'Noto Serif SC', serif" opacity="0.6" textAnchor="middle">漢界</text>
          </>
        })()}

        {/* Highlight squares */}
        {positions.map(({ row, col }) => {
          const { x, y } = toSVG(row, col, flipped)
          const cx = x, cy = y
          const isLastMove = isLastMovePos(row, col)
          const isCheck = isKingInCheck(row, col)
          const isSelected = selected?.row === row && selected?.col === col
          const isValid = validMoves.some(m => m.row === row && m.col === col)

          return (
            <g key={`hl-${row}-${col}`}>
              {isLastMove && (
                <rect x={cx - 20} y={cy - 20} width={40} height={40} fill="rgba(255,210,100,0.25)" rx="4" />
              )}
              {isCheck && (
                <circle cx={cx} cy={cy} r={22} fill="rgba(232,93,74,0.4)" />
              )}
              {isSelected && (
                <circle cx={cx} cy={cy} r={22} fill="rgba(79,156,247,0.35)" />
              )}
              {isValid && !getPieceAt(row, col) && (
                <circle cx={cx} cy={cy} r={8} fill="rgba(79,156,247,0.5)" />
              )}
              {isValid && getPieceAt(row, col) && (
                <circle cx={cx} cy={cy} r={22} stroke="rgba(79,156,247,0.7)" strokeWidth="2.5" fill="none" />
              )}
            </g>
          )
        })}

        {/* Click targets */}
        {positions.map(({ row, col }) => {
          const { x, y } = toSVG(row, col, flipped)
          return (
            <rect
              key={`click-${row}-${col}`}
              x={x - CELL / 2}
              y={y - CELL / 2}
              width={CELL}
              height={CELL}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => handleIntersectionClick(row, col)}
            />
          )
        })}

        {/* Pieces */}
        {positions.map(({ row, col }) => {
          const piece = getPieceAt(row, col)
          if (!piece) return null
          const { x, y } = toSVG(row, col, flipped)
          const isRed = piece.startsWith('r-')
          const char = PIECE_CHARS[piece] ?? '?'
          const isSelected = selected?.row === row && selected?.col === col

          return (
            <g
              key={`piece-${row}-${col}`}
              onClick={() => handleIntersectionClick(row, col)}
              className="cursor-pointer"
              style={{ filter: isSelected ? 'drop-shadow(0 0 4px var(--c-accent))' : 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}
            >
              <circle
                cx={x}
                cy={y}
                r={20}
                fill={isRed ? 'var(--c-piece-red-bg)' : 'var(--c-piece-black-bg)'}
                stroke={isRed ? 'var(--c-danger)' : 'var(--c-piece-black)'}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              <circle
                cx={x}
                cy={y}
                r={16}
                fill="none"
                stroke={isRed ? 'var(--c-danger)' : 'var(--c-piece-black)'}
                strokeWidth="0.8"
                opacity="0.5"
              />
              <text
                x={x}
                y={y + 7}
                textAnchor="middle"
                fontSize="18"
                fontFamily="'Noto Serif SC', 'Noto Serif CJK SC', serif"
                fontWeight="700"
                fill={isRed ? 'var(--c-danger)' : 'var(--c-piece-black)'}
              >
                {char}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
