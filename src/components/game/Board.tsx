'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { getLegalMoves } from '@/lib/xiangqi/rules'
import { PIECE_CHARS } from '@/lib/xiangqi/notation'
import type { BoardState, Position, Color, MoveRecord } from '@/types'

const CELL = 64
const PADDING = 40
const PIECE_R = 28
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

// Animated piece with FLIP animation
function AnimatedPiece({
  code, row, col, flipped, selected, onClick, onSelect,
}: {
  code: string
  row: number
  col: number
  flipped: boolean
  selected: boolean
  onClick: () => void
  onSelect: () => void
}) {
  const groupRef = useRef<SVGGElement>(null)
  const prevPos = useRef<{ row: number; col: number }>({ row, col })
  const animating = useRef(false)

  useEffect(() => {
    const el = groupRef.current
    if (!el) return
    const p = prevPos.current
    if (p.row === row && p.col === col) return
    if (animating.current) {
      // Update prev, no animation
      prevPos.current = { row, col }
      return
    }
    animating.current = true
    // FLIP: from prev to current
    const { x: fromX, y: fromY } = toSVG(p.row, p.col, flipped)
    const { x: toX, y: toY } = toSVG(row, col, flipped)
    const dx = fromX - toX
    const dy = fromY - toY
    // Set initial transform
    el.style.transform = `translate(${dx}px, ${dy}px)`
    el.style.transition = 'none'
    // Force reflow
    void el.getBoundingClientRect()
    // Animate to final position
    el.style.transition = 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)'
    el.style.transform = 'translate(0, 0)'
    const onEnd = () => {
      el.style.transition = ''
      el.style.transform = ''
      animating.current = false
      prevPos.current = { row, col }
      el.removeEventListener('transitionend', onEnd)
    }
    el.addEventListener('transitionend', onEnd)
    // Safety: clear after animation
    setTimeout(() => {
      if (animating.current) onEnd()
    }, 600)
  }, [row, col, flipped])

  const { x, y } = toSVG(row, col, flipped)
  const isRed = code.startsWith('r-')
  const char = PIECE_CHARS[code] ?? '?'

  return (
    <g
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onMouseDown={(e) => { e.stopPropagation(); onSelect() }}
      className="cursor-pointer"
      style={{
        willChange: 'transform',
        transformOrigin: 'center',
      }}
    >
      {/* Outer dark ring */}
      <circle
        cx={x}
        cy={y}
        r={PIECE_R + 2}
        fill="rgba(0,0,0,0.25)"
        opacity={selected ? 0.5 : 0.2}
      />
      {/* Piece body — wooden disc look */}
      <defs>
        <radialGradient id={`grad-${code}-${row}-${col}`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={isRed ? '#fde0d9' : '#f0f3f8'} />
          <stop offset="60%" stopColor={isRed ? '#f5b8a8' : '#9ba6bb'} />
          <stop offset="100%" stopColor={isRed ? '#dc2626' : '#1a1f2e'} />
        </radialGradient>
        <linearGradient id={`border-${code}-${row}-${col}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isRed ? '#fbbf24' : '#d4a849'} stopOpacity="0.6" />
          <stop offset="100%" stopColor={isRed ? '#7f1d1d' : '#0a0e1a'} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <circle
        cx={x}
        cy={y}
        r={PIECE_R}
        fill={`url(#grad-${code}-${row}-${col})`}
        stroke={isRed ? '#dc2626' : '#1a1f2e'}
        strokeWidth={selected ? 3 : 1.5}
        style={selected ? { filter: 'drop-shadow(0 0 6px var(--c-accent))' } : { filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.4))' }}
      />
      <circle
        cx={x}
        cy={y}
        r={PIECE_R - 5}
        fill="none"
        stroke={isRed ? 'rgba(255,200,180,0.6)' : 'rgba(255,255,255,0.5)'}
        strokeWidth="1"
      />
      <text
        x={x}
        y={y + 9}
        textAnchor="middle"
        fontSize="24"
        fontFamily="'Noto Serif SC', 'PingFang SC', 'Microsoft YaHei', serif"
        fontWeight="900"
        fill={isRed ? '#7f1d1d' : '#0a0e1a'}
        style={{
          paintOrder: 'stroke',
          stroke: isRed ? 'rgba(255,200,180,0.4)' : 'rgba(255,255,255,0.6)',
          strokeWidth: '0.5px',
          strokeLinejoin: 'round',
        }}
      >
        {char}
      </text>
    </g>
  )
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
    if (selected) {
      const isValid = validMoves.some(m => m.row === row && m.col === col)
      if (isValid) {
        onMove(selected, { row, col })
        setSelected(null)
        setValidMoves([])
        return
      }
      if (piece && getPieceColor(piece) === myColor) {
        const moves = getLegalMoves(board, { row, col }, myColor)
        setSelected({ row, col })
        setValidMoves(moves)
        return
      }
      setSelected(null)
      setValidMoves([])
      return
    }
    if (piece && myColor && getPieceColor(piece) === myColor && currentTurn === myColor) {
      const moves = getLegalMoves(board, { row, col }, myColor)
      setSelected({ row, col })
      setValidMoves(moves)
    }
  }, [board, selected, validMoves, myColor, currentTurn, disabled, onMove])

  function isLastMovePos(row: number, col: number): 'from' | 'to' | null {
    if (!lastMove) return null
    if (lastMove.from.row === row && lastMove.from.col === col) return 'from'
    if (lastMove.to.row === row && lastMove.to.col === col) return 'to'
    return null
  }

  function isKingInCheck(row: number, col: number): boolean {
    if (!isInCheck) return false
    const piece = getPieceAt(row, col)
    if (!piece) return false
    return piece === `${currentTurn === 'red' ? 'r' : 'b'}-jiang`
  }

  function isInitialPosition(row: number, col: number): boolean {
    if ((row === 2 || row === 7) && (col === 1 || col === 7)) return true
    if ((row === 3 || row === 6) && (col === 0 || col === 2 || col === 4 || col === 6 || col === 8)) return true
    return false
  }

  const positions: { row: number; col: number }[] = []
  for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) positions.push({ row: r, col: c })

  // Build piece list keyed by code (so the same piece keeps its key when it moves)
  const pieceList: Array<{ code: string; row: number; col: number; key: string }> = []
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const code = board[r]?.[c]
      if (code) pieceList.push({ code, row: r, col: c, key: code })
    }
  }

  return (
    <div className="relative w-full select-none" style={{ touchAction: 'none' }}>
      <div className="relative inline-block w-full" style={{ maxWidth: BOARD_W }}>
        <svg
          width="100%"
          height="auto"
          viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
          className="block rounded-lg"
          style={{
            maxHeight: 'min(85vh, 700px)',
            filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.4))',
          }}
        >
          <defs>
            {/* Wood texture gradient */}
            <linearGradient id="wood-bg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e8c98a" />
              <stop offset="50%" stopColor="#d8b878" />
              <stop offset="100%" stopColor="#c8a96e" />
            </linearGradient>
            <linearGradient id="wood-frame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b6914" />
              <stop offset="100%" stopColor="#5a3814" />
            </linearGradient>
            <pattern id="wood-grain" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <rect width="60" height="60" fill="url(#wood-bg)" />
              <path d="M0 15 Q 30 12, 60 17" stroke="rgba(139,105,20,0.08)" strokeWidth="0.5" fill="none" />
              <path d="M0 30 Q 30 28, 60 32" stroke="rgba(139,105,20,0.06)" strokeWidth="0.5" fill="none" />
              <path d="M0 45 Q 30 44, 60 47" stroke="rgba(139,105,20,0.08)" strokeWidth="0.5" fill="none" />
            </pattern>
          </defs>

          {/* Board frame (dark border) */}
          <rect x="0" y="0" width={BOARD_W} height={BOARD_H} fill="url(#wood-frame)" rx="6" />
          {/* Inner board surface with wood texture */}
          <rect
            x="6" y="6"
            width={BOARD_W - 12}
            height={BOARD_H - 12}
            fill="url(#wood-grain)"
            stroke="#5a3814"
            strokeWidth="1"
            rx="4"
          />

          {/* Grid lines */}
          {Array.from({ length: 10 }, (_, r) => {
            const { x: x0, y: y0 } = toSVG(r, 0, flipped)
            const { x: x1, y: y1 } = toSVG(r, 8, flipped)
            return <line key={`hr${r}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke="#3a2a14" strokeWidth="1.2" opacity="0.85" />
          })}
          <line x1={toSVG(0,0,flipped).x} y1={toSVG(0,0,flipped).y} x2={toSVG(9,0,flipped).x} y2={toSVG(9,0,flipped).y} stroke="#3a2a14" strokeWidth="1.2" opacity="0.85" />
          <line x1={toSVG(0,8,flipped).x} y1={toSVG(0,8,flipped).y} x2={toSVG(9,8,flipped).x} y2={toSVG(9,8,flipped).y} stroke="#3a2a14" strokeWidth="1.2" opacity="0.85" />
          {Array.from({ length: 7 }, (_, ci) => {
            const c = ci + 1
            const { x, y: y0 } = toSVG(0, c, flipped)
            const { y: y1 } = toSVG(4, c, flipped)
            const { y: y2 } = toSVG(5, c, flipped)
            const { y: y3 } = toSVG(9, c, flipped)
            return (
              <g key={`vc${c}`}>
                <line x1={x} y1={y0} x2={x} y2={y1} stroke="#3a2a14" strokeWidth="1.2" opacity="0.85" />
                <line x1={x} y1={y2} x2={x} y2={y3} stroke="#3a2a14" strokeWidth="1.2" opacity="0.85" />
              </g>
            )
          })}

          {/* Palace diagonals */}
          {(() => {
            const tl0 = toSVG(0, 3, flipped), tr0 = toSVG(0, 5, flipped)
            const bl0 = toSVG(2, 3, flipped), br0 = toSVG(2, 5, flipped)
            const tl1 = toSVG(7, 3, flipped), tr1 = toSVG(7, 5, flipped)
            const bl1 = toSVG(9, 3, flipped), br1 = toSVG(9, 5, flipped)
            return <>
              <line x1={tl0.x} y1={tl0.y} x2={br0.x} y2={br0.y} stroke="#3a2a14" strokeWidth="1.2" opacity="0.85" />
              <line x1={tr0.x} y1={tr0.y} x2={bl0.x} y2={bl0.y} stroke="#3a2a14" strokeWidth="1.2" opacity="0.85" />
              <line x1={tl1.x} y1={tl1.y} x2={br1.x} y2={br1.y} stroke="#3a2a14" strokeWidth="1.2" opacity="0.85" />
              <line x1={tr1.x} y1={tr1.y} x2={bl1.x} y2={bl1.y} stroke="#3a2a14" strokeWidth="1.2" opacity="0.85" />
            </>
          })()}

          {/* River text */}
          {(() => {
            const y = (toSVG(4, 0, flipped).y + toSVG(5, 0, flipped).y) / 2 + 8
            return <>
              <text x={BOARD_W / 2 - 50} y={y} fill="#5a3814" fontSize="22" fontFamily="'Noto Serif SC', 'PingFang SC', serif" fontWeight="700" opacity="0.7" textAnchor="middle">楚 河</text>
              <text x={BOARD_W / 2 + 50} y={y} fill="#5a3814" fontSize="22" fontFamily="'Noto Serif SC', 'PingFang SC', serif" fontWeight="700" opacity="0.7" textAnchor="middle">漢 界</text>
            </>
          })()}

          {/* Initial position markers (corner dots) */}
          {positions.map(({ row, col }) => {
            if (!isInitialPosition(row, col)) return null
            const { x, y } = toSVG(row, col, flipped)
            return (
              <g key={`init-${row}-${col}`} fill="rgba(90,56,20,0.5)">
                {(row === 2 || row === 7) ? (
                  <>
                    <circle cx={x - 8} cy={y - 8} r="1.8" />
                    <circle cx={x + 8} cy={y - 8} r="1.8" />
                    <circle cx={x - 8} cy={y + 8} r="1.8" />
                    <circle cx={x + 8} cy={y + 8} r="1.8" />
                  </>
                ) : (
                  <>
                    <circle cx={x - 8} cy={y - 8} r="1.8" />
                    <circle cx={x + 8} cy={y - 8} r="1.8" />
                  </>
                )}
              </g>
            )
          })}

          {/* Highlights layer */}
          {positions.map(({ row, col }) => {
            const { x, y } = toSVG(row, col, flipped)
            const lastMoveType = isLastMovePos(row, col)
            const isCheck = isKingInCheck(row, col)
            const isSelected = selected?.row === row && selected?.col === col
            const isValid = validMoves.some(m => m.row === row && m.col === col)
            const hasPiece = !!getPieceAt(row, col)
            const isCapture = isValid && hasPiece

            return (
              <g key={`hl-${row}-${col}`} className="pointer-events-none">
                {/* FROM position: prominent gold ring with pulse */}
                {lastMoveType === 'from' && (
                  <>
                    <rect
                      x={x - CELL / 2 + 2} y={y - CELL / 2 + 2}
                      width={CELL - 4} height={CELL - 4}
                      fill="rgba(212,168,73,0.18)"
                      rx="6"
                    />
                    <rect
                      x={x - CELL / 2 + 2} y={y - CELL / 2 + 2}
                      width={CELL - 4} height={CELL - 4}
                      fill="none"
                      stroke="var(--c-accent)"
                      strokeWidth="2.5"
                      rx="6"
                      style={{ filter: 'drop-shadow(0 0 6px var(--c-accent-glow))' }}
                    >
                      <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
                    </rect>
                  </>
                )}
                {/* TO position: gold outline */}
                {lastMoveType === 'to' && (
                  <rect
                    x={x - CELL / 2 + 4} y={y - CELL / 2 + 4}
                    width={CELL - 8} height={CELL - 8}
                    fill="none"
                    stroke="var(--c-accent)"
                    strokeWidth="2"
                    rx="5"
                    opacity="0.8"
                  />
                )}
                {/* King in check: red pulse */}
                {isCheck && (
                  <circle cx={x} cy={y} r={PIECE_R + 8} fill="none" stroke="#dc2626" strokeWidth="3" opacity="0.7">
                    <animate attributeName="r" values={`${PIECE_R + 6};${PIECE_R + 14};${PIECE_R + 6}`} dur="1.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Selected piece: blue ring */}
                {isSelected && (
                  <circle cx={x} cy={y} r={PIECE_R + 5} fill="none" stroke="#4f9cf7" strokeWidth="3" opacity="0.7">
                    <animate attributeName="r" values={`${PIECE_R + 3};${PIECE_R + 8};${PIECE_R + 3}`} dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Valid move empty: small dot */}
                {isValid && !hasPiece && (
                  <circle cx={x} cy={y} r="9" fill="rgba(79,156,247,0.55)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                )}
                {/* Valid move capture: corner brackets */}
                {isCapture && (
                  <g stroke="#4f9cf7" strokeWidth="3" fill="none" opacity="0.85">
                    <path d={`M${x - PIECE_R - 4} ${y - PIECE_R - 4 + 8} L${x - PIECE_R - 4} ${y - PIECE_R - 4} L${x - PIECE_R - 4 + 8} ${y - PIECE_R - 4}`} />
                    <path d={`M${x + PIECE_R + 4 - 8} ${y - PIECE_R - 4} L${x + PIECE_R + 4} ${y - PIECE_R - 4} L${x + PIECE_R + 4} ${y - PIECE_R - 4 + 8}`} />
                    <path d={`M${x - PIECE_R - 4} ${y + PIECE_R + 4 - 8} L${x - PIECE_R - 4} ${y + PIECE_R + 4} L${x - PIECE_R - 4 + 8} ${y + PIECE_R + 4}`} />
                    <path d={`M${x + PIECE_R + 4 - 8} ${y + PIECE_R + 4} L${x + PIECE_R + 4} ${y + PIECE_R + 4} L${x + PIECE_R + 4} ${y + PIECE_R + 4 - 8}`} />
                  </g>
                )}
              </g>
            )
          })}

          {/* Pieces layer — render with FLIP animation */}
          <g>
            {pieceList.map(p => {
              const isSelected = selected?.row === p.row && selected?.col === p.col
              return (
                <AnimatedPiece
                  key={p.key}
                  code={p.code}
                  row={p.row}
                  col={p.col}
                  flipped={flipped}
                  selected={isSelected}
                  onClick={() => handleIntersectionClick(p.row, p.col)}
                  onSelect={() => {
                    if (disabled) return
                    if (myColor && getPieceColor(p.code) === myColor && currentTurn === myColor) {
                      const moves = getLegalMoves(board, { row: p.row, col: p.col }, myColor)
                      setSelected({ row: p.row, col: p.col })
                      setValidMoves(moves)
                    }
                  }}
                />
              )
            })}
          </g>

          {/* Click target overlay (transparent, captures clicks on empty cells) */}
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
        </svg>
      </div>
    </div>
  )
}
