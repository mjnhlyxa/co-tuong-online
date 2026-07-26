'use client'

import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { getLegalMoves } from '@/lib/xiangqi/rules'
import { PIECE_CHARS } from '@/lib/xiangqi/notation'
import type { BoardState, Position, Color, MoveRecord } from '@/types'
import '@fontsource/noto-sans-sc/400.css'
import '@fontsource/noto-sans-sc/700.css'

const CELL = 1.0
const PAD = 0.5
const PIECE_R = 0.42
const PIECE_H = 0.16
const ANIM_SPEED = 0.12  // 0.12 per frame at 60fps → ~500ms travel

const PIECE_LABEL: Record<string, string> = {
  'r-jiang': '帥', 'r-shi': '仕', 'r-xiang': '相', 'r-ju': '俥', 'r-ma': '馬', 'r-pao': '炮', 'r-zu': '兵',
  'b-jiang': '將', 'b-shi': '士', 'b-xiang': '象', 'b-ju': '車', 'b-ma': '傌', 'b-pao': '砲', 'b-zu': '卒',
}

// Edge dot positions (cannons and pawns starting positions)
const EDGE_DOTS: Array<[number, number]> = [
  // Black cannons (row 2, cols 1, 7)
  [2, 1], [2, 7],
  // Red cannons (row 7, cols 1, 7)
  [7, 1], [7, 7],
  // Black pawns (row 3, cols 0, 2, 4, 6, 8)
  [3, 0], [3, 2], [3, 4], [3, 6], [3, 8],
  // Red pawns (row 6, cols 0, 2, 4, 6, 8)
  [6, 0], [6, 2], [6, 4], [6, 6], [6, 8],
]

interface PieceProps {
  code: string
  targetPos: [number, number, number]
  color: Color
  isSelected: boolean
  isFromLast: boolean
  isToLast: boolean
  isInCheck: boolean
  onClick: () => void
}

function Piece({ code, targetPos, color, isSelected, isFromLast, isToLast, isInCheck, onClick }: PieceProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const targetVec = useMemo(() => new THREE.Vector3(...targetPos), [targetPos])

  // Animation: lerp current → target
  useFrame((_, delta) => {
    if (!groupRef.current) return
    const lift = isSelected ? 0.18 : isInCheck ? 0.1 : 0
    const finalY = targetPos[1] + lift
    groupRef.current.position.x += (targetPos[0] - groupRef.current.position.x) * ANIM_SPEED
    groupRef.current.position.y += (finalY - groupRef.current.position.y) * ANIM_SPEED
    groupRef.current.position.z += (targetPos[2] - groupRef.current.position.z) * ANIM_SPEED
    // Subtle hover wobble
    if (hovered) {
      groupRef.current.rotation.z = Math.sin(performance.now() / 200) * 0.04
    } else {
      groupRef.current.rotation.z *= 0.9
    }
  })

  const label = PIECE_LABEL[code] ?? '?'
  const isRed = color === 'red'
  const baseColor = isRed ? '#dc2626' : '#1a1f2e'
  const topColor = isRed ? '#fde0d9' : '#f0f3f8'

  return (
    <group
      ref={groupRef}
      position={targetPos}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
    >
      {/* Selection glow ring under base */}
      {isSelected && (
        <mesh position={[0, -PIECE_H / 2 + 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PIECE_R * 1.05, PIECE_R * 1.4, 32]} />
          <meshBasicMaterial color="#d4a849" transparent opacity={0.95} />
        </mesh>
      )}
      {/* LAST MOVE FROM: prominent gold filled ring */}
      {isFromLast && (
        <mesh position={[0, -PIECE_H / 2 + 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PIECE_R * 0.9, PIECE_R * 1.3, 32]} />
          <meshBasicMaterial color="#d4a849" transparent opacity={0.85} />
        </mesh>
      )}
      {/* LAST MOVE TO: lighter gold outline ring */}
      {isToLast && (
        <mesh position={[0, -PIECE_H / 2 + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PIECE_R * 0.95, PIECE_R * 1.15, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} />
        </mesh>
      )}
      {/* Cylindrical piece */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[PIECE_R, PIECE_R, PIECE_H, 32]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.4}
          roughness={0.4}
          emissive={isInCheck ? '#dc2626' : isSelected ? '#d4a849' : '#000000'}
          emissiveIntensity={isInCheck ? 0.7 : isSelected ? 0.5 : 0}
        />
      </mesh>
      {/* Domed top (slight sphere for engraved look) */}
      <mesh position={[0, PIECE_H * 0.45, 0]} castShadow>
        <sphereGeometry args={[PIECE_R * 0.96, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.45}
          roughness={0.35}
        />
      </mesh>
      {/* Inner top face with character (slightly raised) */}
      <mesh position={[0, PIECE_H * 0.47, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PIECE_R * 0.78, 32]} />
        <meshStandardMaterial color={topColor} metalness={0.25} roughness={0.5} />
      </mesh>
      {/* Chinese character rendered as Canvas texture (most reliable for 3D) */}
      <PieceLabelTexture character={label} color={baseColor} />
    </group>
  )
}

// Render Chinese character as a Canvas-based texture (font-independent, works in any browser)
function PieceLabelTexture({ character, color }: { character: string; color: string }) {
  const texture = useMemo(() => {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    // Clear
    ctx.clearRect(0, 0, size, size)
    // Draw character with system font fallback (any CJK system font works)
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold ${size * 0.7}px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Heiti SC", "Noto Sans SC", "WenQuanYi Micro Hei", sans-serif`
    ctx.fillText(character, size / 2, size / 2)
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    tex.needsUpdate = true
    return tex
  }, [character, color])

  return (
    <mesh position={[0, PIECE_H / 2 + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[PIECE_R * 1.4, PIECE_R * 1.4]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  )
}

// Render river text "楚河 漢界" as Canvas texture
function RiverTexture() {
  const texture = useMemo(() => {
    const w = 1024, h = 128
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#5a3814'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold 64px "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Heiti SC", "Noto Sans SC", "WenQuanYi Micro Hei", serif`
    ctx.fillText('楚  河        漢  界', w / 2, h / 2)
    const tex = new THREE.CanvasTexture(canvas)
    tex.anisotropy = 4
    tex.needsUpdate = true
    return tex
  }, [])

  return (
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[4, 0.5]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  )
}

function BoardBase() {
  // Generate grid lines as thin boxes (more visible than LineBasicMaterial)
  const lineW = 0.022
  const lineH = 0.008
  const lineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3a2a14', roughness: 0.6 }), [])
  const palaceLineMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5a3814', roughness: 0.6 }), [])

  const lines: React.ReactElement[] = []
  // 10 horizontal lines
  for (let r = 0; r < 10; r++) {
    const z = (r - 4.5) * CELL
    lines.push(
      <mesh key={`hr${r}`} position={[0, lineH / 2, z]} material={lineMat}>
        <boxGeometry args={[8 * CELL + lineW, lineH, lineW]} />
      </mesh>
    )
  }
  // 9 vertical lines (broken at river)
  for (let c = 0; c < 9; c++) {
    const x = (c - 4) * CELL
    if (c === 0 || c === 8) {
      lines.push(
        <mesh key={`vc${c}`} position={[x, lineH / 2, 0]} material={lineMat}>
          <boxGeometry args={[lineW, lineH, 9 * CELL + lineW]} />
        </mesh>
      )
    } else {
      // Top half
      lines.push(
        <mesh key={`vc${c}-t`} position={[x, lineH / 2, -2.5 * CELL]} material={lineMat}>
          <boxGeometry args={[lineW, lineH, 4 * CELL + lineW]} />
        </mesh>
      )
      // Bottom half
      lines.push(
        <mesh key={`vc${c}-b`} position={[x, lineH / 2, 2.5 * CELL]} material={lineMat}>
          <boxGeometry args={[lineW, lineH, 4 * CELL + lineW]} />
        </mesh>
      )
    }
  }
  // Palace diagonals
  const diagonals: Array<[number, number, number, number]> = [
    [-CELL, -4.5 * CELL, CELL, -2.5 * CELL],
    [CELL, -4.5 * CELL, -CELL, -2.5 * CELL],
    [-CELL, 2.5 * CELL, CELL, 4.5 * CELL],
    [CELL, 2.5 * CELL, -CELL, 4.5 * CELL],
  ]
  diagonals.forEach(([x1, z1, x2, z2], i) => {
    const dx = x2 - x1, dz = z2 - z1
    const length = Math.sqrt(dx * dx + dz * dz)
    const angle = Math.atan2(dz, dx)
    lines.push(
      <mesh
        key={`diag${i}`}
        position={[(x1 + x2) / 2, lineH / 2, (z1 + z2) / 2]}
        rotation={[0, -angle, 0]}
        material={palaceLineMat}
      >
        <boxGeometry args={[length + lineW, lineH, lineW]} />
      </mesh>
    )
  })

  return (
    <group>
      {/* Board base (dark frame) */}
      <mesh receiveShadow position={[0, -0.05, 0]}>
        <boxGeometry args={[10 * CELL + 0.6, 0.1, 11 * CELL + 0.6]} />
        <meshStandardMaterial color="#5a3814" roughness={0.85} />
      </mesh>
      {/* Board surface - thicker for depth */}
      <mesh receiveShadow position={[0, 0.01, 0]}>
        <boxGeometry args={[9 * CELL, 0.03, 10 * CELL]} />
        <meshStandardMaterial color="#d8b878" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Grid lines */}
      {lines}
      {/* Edge dots (small gold dots) */}
      {EDGE_DOTS.map(([r, c], i) => {
        // x: col, z: row
        const x = (c - 4) * CELL
        const z = (r - 4.5) * CELL
        // Dot offset depends on corner
        const offset = 0.08
        const dots: Array<[number, number]> = []
        if (c === 1 || c === 7) {
          // Cannon column - 4 corner dots
          dots.push([-offset, -offset], [offset, -offset], [-offset, offset], [offset, offset])
        } else {
          // Pawn columns - 2 corner dots
          dots.push([-offset, -offset], [offset, -offset])
        }
        return (
          <group key={i} position={[x, 0.012, z]}>
            {dots.map(([dx, dz], j) => (
              <mesh key={j} position={[dx, 0, dz]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.025, 8]} />
                <meshBasicMaterial color="#3a2a14" />
              </mesh>
            ))}
          </group>
        )
      })}
      {/* River text as Canvas texture */}
      <RiverTexture />
    </group>
  )
}

function MoveMarker({ position, isSelected }: { position: [number, number, number]; isSelected?: boolean }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.18, 0.32, 24]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.7} />
    </mesh>
  )
}

function CaptureMarker({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[PIECE_R * 0.6, PIECE_R * 0.95, 24]} />
      <meshBasicMaterial color="#dc2626" transparent opacity={0.45} />
    </mesh>
  )
}

interface Board3DProps {
  board: BoardState
  myColor: Color | null
  currentTurn: Color
  lastMove: MoveRecord | null
  isInCheck: boolean
  disabled?: boolean
  onMove: (from: Position, to: Position) => void
}

export default function Board3D({ board, myColor, currentTurn, lastMove, isInCheck, disabled, onMove }: Board3DProps) {
  const [selected, setSelected] = useState<Position | null>(null)
  const [validMoves, setValidMoves] = useState<Position[]>([])

  const flipped = myColor === 'black'

  const rowToZ = (row: number) => (flipped ? 9 - row : row) - 4.5
  const colToX = (col: number) => (flipped ? 8 - col : col) - 4

  function getPieceColor(code: string): Color {
    return code.startsWith('r') ? 'red' : 'black'
  }

  function handlePieceClick(row: number, col: number) {
    if (disabled) return
    const piece = board[row]?.[col]
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
  }

  function handleBoardClick(e: ThreeEvent<MouseEvent>) {
    if (disabled || !selected) return
    const x = e.point.x
    const z = e.point.z
    const col = Math.round(x + 4)
    const row = Math.round(z + 4.5)
    const actualRow = flipped ? 9 - row : row
    const actualCol = flipped ? 8 - col : col
    if (actualRow >= 0 && actualRow < 10 && actualCol >= 0 && actualCol < 9) {
      const isValid = validMoves.some(m => m.row === actualRow && m.col === actualCol)
      if (isValid) {
        onMove(selected, { row: actualRow, col: actualCol })
        setSelected(null)
        setValidMoves([])
      }
    }
  }

  // Compute captured pieces
  // Get all pieces that should be on the board initially
  const initial: Record<string, number> = {
    rk: 1, ra: 2, re: 2, rh: 2, rr: 2, rc: 2, rp: 5,
    bk: 1, ba: 2, be: 2, bh: 2, br: 2, bc: 2, bp: 5,
  }
  const currentCount: Record<string, number> = {}
  board.forEach(row => row.forEach(code => {
    if (code) currentCount[code] = (currentCount[code] ?? 0) + 1
  }))
  const captured: string[] = []
  for (const code in initial) {
    const diff = (initial[code] ?? 0) - (currentCount[code] ?? 0)
    for (let i = 0; i < diff; i++) {
      captured.push(code)
    }
  }
  // Captured by which color? If red piece was captured, black captured it.
  // We mark the position where the capture happened as a red marker
  const captureMarkers: Position[] = []
  if (lastMove?.captured) {
    captureMarkers.push(lastMove.to)
  }

  return (
    <div className="relative w-full" style={{ aspectRatio: '9/10' }}>
      <Canvas
        shadows
        camera={{ position: [0, 14, 1], fov: 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#0a0e1a']} />
        <ambientLight intensity={0.55} />
        <directionalLight
          position={[3, 12, 4]}
          intensity={1.3}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={30}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        <directionalLight position={[-4, 8, -3]} intensity={0.35} color="#a0c4ff" />
        <pointLight position={[0, 6, 0]} intensity={0.3} color="#ffe4b5" />

        <BoardBase />

        {/* Pieces */}
        {board.map((row, r) =>
          row.map((code, c) => {
            if (!code) return null
            const isSelected = selected?.row === r && selected?.col === c
            const isFromLast = lastMove?.from.row === r && lastMove?.from.col === c
            const isToLast = lastMove?.to.row === r && lastMove?.to.col === c
            const isKingInCheck = isInCheck && (code === 'rk' || code === 'bk')
            return (
              <Piece
                key={`${r}-${c}-${code}`}
                code={code}
                targetPos={[colToX(c), PIECE_H / 2, rowToZ(r)]}
                color={getPieceColor(code)}
                isSelected={isSelected}
                isFromLast={!!isFromLast}
                isToLast={!!isToLast}
                isInCheck={isKingInCheck}
                onClick={() => handlePieceClick(r, c)}
              />
            )
          })
        )}

        {/* Move markers */}
        {validMoves.map(m => {
          const targetPiece = board[m.row]?.[m.col]
          const isCapture = !!targetPiece
          return isCapture ? (
            <CaptureMarker key={`m-${m.row}-${m.col}`} position={[colToX(m.col), 0.01, rowToZ(m.row)]} />
          ) : (
            <MoveMarker key={`m-${m.row}-${m.col}`} position={[colToX(m.col), 0.01, rowToZ(m.row)]} />
          )
        })}

        {/* Click target for empty cells */}
        <mesh
          position={[0, 0.005, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleBoardClick}
        >
          <planeGeometry args={[9 * CELL, 10 * CELL]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>

        <ContactShadows
          position={[0, -0.06, 0]}
          opacity={0.45}
          scale={20}
          blur={2.8}
          far={5}
        />
      </Canvas>
    </div>
  )
}
