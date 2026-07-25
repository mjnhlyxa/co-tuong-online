'use client'

import { useRef, useMemo, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Text } from '@react-three/drei'
import * as THREE from 'three'
import { getLegalMoves } from '@/lib/xiangqi/rules'
import { PIECE_CHARS } from '@/lib/xiangqi/notation'
import type { BoardState, Position, Color, MoveRecord } from '@/types'

const CELL = 1.0          // world units per cell
const PAD = 1.0           // padding around board
const BOARD_W = 8 * CELL + 2 * PAD
const BOARD_H = 9 * CELL + 2 * PAD
const PIECE_R = 0.42
const PIECE_H = 0.18

const PIECE_LABEL: Record<string, string> = {
  // Red
  'rk': '帥', 'ra': '仕', 're': '相', 'rh': '俥', 'rr': '馬', 'rc': '炮', 'rp': '兵',
  // Black
  'bk': '將', 'ba': '士', 'be': '象', 'bh': '車', 'br': '傌', 'bc': '砲', 'bp': '卒',
}

interface PieceProps {
  code: string
  position: [number, number, number]
  color: Color
  isSelected: boolean
  isMovable: boolean
  isLastMove: boolean
  isInCheck: boolean
  onClick: () => void
}

function Piece({ code, position, color, isSelected, isMovable, isLastMove, isInCheck, onClick }: PieceProps) {
  const ref = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const targetPos = useMemo(() => new THREE.Vector3(...position), [position])

  // Smooth lerp to position
  useFrame(() => {
    if (!ref.current) return
    ref.current.position.lerp(targetPos, 0.18)
    // Lift if selected or in check
    const liftTarget = isSelected ? 0.15 : isInCheck ? 0.08 : 0
    ref.current.position.y += (ref.current.position.y + liftTarget - ref.current.position.y) * 0.15
    // Better: use actual y coordination
    ref.current.position.y = ref.current.position.y * 0.85 + (position[1] + liftTarget) * 0.15
  })

  const label = PIECE_LABEL[code] ?? '?'
  const isRed = color === 'red'
  const baseColor = isRed ? '#dc2626' : '#1a1f2e'
  const textColor = isRed ? '#fff5f3' : '#e8eaef'

  return (
    <group
      ref={ref}
      position={position}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
    >
      {/* Cylindrical piece */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[PIECE_R, PIECE_R, PIECE_H, 32]} />
        <meshStandardMaterial
          color={baseColor}
          metalness={0.35}
          roughness={0.45}
          emissive={isInCheck ? '#dc2626' : isSelected ? '#d4a849' : '#000000'}
          emissiveIntensity={isInCheck ? 0.6 : isSelected ? 0.4 : 0}
        />
      </mesh>
      {/* Top */}
      <mesh position={[0, PIECE_H / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[PIECE_R * 0.85, 32]} />
        <meshStandardMaterial color={isRed ? '#fde0d9' : '#f0f3f8'} metalness={0.2} roughness={0.6} />
      </mesh>
      {/* Chinese character */}
      <Text
        position={[0, PIECE_H / 2 + 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={PIECE_R * 1.1}
        color={baseColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor={textColor}
      >
        {label}
      </Text>
      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, -PIECE_H / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PIECE_R * 1.0, PIECE_R * 1.25, 32]} />
          <meshBasicMaterial color="#d4a849" transparent opacity={0.9} />
        </mesh>
      )}
      {/* Highlight ring */}
      {isLastMove && (
        <mesh position={[0, -PIECE_H / 2 + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[PIECE_R * 1.0, PIECE_R * 1.15, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.5} />
        </mesh>
      )}
      {/* Scale on hover */}
      <mesh scale={hovered ? 1.08 : 1}>
        <cylinderGeometry args={[PIECE_R, PIECE_R, PIECE_H, 32]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  )
}

function BoardBase() {
  // Wooden board with grid lines
  const linesMaterial = useMemo(() => new THREE.LineBasicMaterial({ color: '#3a2a14', linewidth: 1.5 }), [])
  const gridLines = useMemo(() => {
    const points: THREE.Vector3[] = []
    // Horizontal lines (10 rows)
    for (let r = 0; r < 10; r++) {
      const y = 0.001
      const z = -PAD + r * CELL - (8 * CELL) / 2
      points.push(new THREE.Vector3(-PAD - 4 * CELL, y, z))
      points.push(new THREE.Vector3(PAD + 4 * CELL, y, z))
    }
    // Vertical lines (9 cols, broken at river)
    for (let c = 0; c < 9; c++) {
      const x = -PAD + c * CELL - (8 * CELL) / 2
      points.push(new THREE.Vector3(x, 0.001, -PAD - 4 * CELL))
      points.push(new THREE.Vector3(x, 0.001, -PAD - 0 * CELL))
      points.push(new THREE.Vector3(x, 0.001, PAD + 0 * CELL))
      points.push(new THREE.Vector3(x, 0.001, PAD + 4 * CELL))
    }
    // Diagonal lines in palace (top)
    const palaceTop = 0
    const palaceBottom = 2
    // Top palace
    const pc1 = new THREE.Vector3(-PAD + 3 * CELL - 4 * CELL, 0.001, -PAD + palaceTop * CELL - 4 * CELL)
    const pc2 = new THREE.Vector3(-PAD + 5 * CELL - 4 * CELL, 0.001, -PAD + palaceBottom * CELL - 4 * CELL)
    const pc3 = new THREE.Vector3(-PAD + 5 * CELL - 4 * CELL, 0.001, -PAD + palaceTop * CELL - 4 * CELL)
    const pc4 = new THREE.Vector3(-PAD + 3 * CELL - 4 * CELL, 0.001, -PAD + palaceBottom * CELL - 4 * CELL)
    points.push(pc1, pc2, pc3, pc4)
    // Bottom palace (mirror)
    const bcs1 = new THREE.Vector3(-PAD + 3 * CELL - 4 * CELL, 0.001, PAD + (9 - palaceTop) * CELL - 4 * CELL)
    const bcs2 = new THREE.Vector3(-PAD + 5 * CELL - 4 * CELL, 0.001, PAD + (9 - palaceBottom) * CELL - 4 * CELL)
    const bcs3 = new THREE.Vector3(-PAD + 5 * CELL - 4 * CELL, 0.001, PAD + (9 - palaceTop) * CELL - 4 * CELL)
    const bcs4 = new THREE.Vector3(-PAD + 3 * CELL - 4 * CELL, 0.001, PAD + (9 - palaceBottom) * CELL - 4 * CELL)
    points.push(bcs1, bcs2, bcs3, bcs4)

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    return new THREE.LineSegments(geometry, linesMaterial)
  }, [linesMaterial])

  return (
    <group>
      {/* Board surface */}
      <mesh receiveShadow position={[0, -0.02, 0]}>
        <boxGeometry args={[BOARD_W + 0.5, 0.04, BOARD_H + 0.5]} />
        <meshStandardMaterial color="#c8a96e" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Inner board (slightly darker) */}
      <mesh receiveShadow position={[0, 0.001, 0]}>
        <boxGeometry args={[9 * CELL, 0.001, 10 * CELL]} />
        <meshStandardMaterial color="#d8b878" roughness={0.6} />
      </mesh>
      {/* Grid lines */}
      <primitive object={gridLines} />
      {/* River text in middle */}
      <Text
        position={[0, 0.005, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.6}
        color="#5a3814"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#3a2a14"
      >
        楚 河        漢 界
      </Text>
    </group>
  )
}

function MoveMarker({ position, isSelected }: { position: [number, number, number]; isSelected: boolean }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.15, 0.3, 24]} />
      <meshBasicMaterial color={isSelected ? '#d4a849' : '#22d3ee'} transparent opacity={isSelected ? 0.9 : 0.5} />
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

  const rowToZ = (row: number) => {
    const r = flipped ? 9 - row : row
    return -PAD + r * CELL - (8 * CELL) / 2 + CELL / 2
  }
  const colToX = (col: number) => {
    const c = flipped ? 8 - col : col
    return -PAD + c * CELL - (8 * CELL) / 2 + CELL / 2
  }

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
    if (disabled) return
    if (selected && validMoves.length > 0) {
      // Snap to nearest cell
      const x = e.point.x
      const z = e.point.z
      const col = Math.round((x + (8 * CELL) / 2 + PAD - CELL / 2) / CELL)
      const row = Math.round((z + (8 * CELL) / 2 + PAD - CELL / 2) / CELL)
      const actualRow = flipped ? 9 - row : row
      const actualCol = flipped ? 8 - col : col
      if (actualRow >= 0 && actualRow < 10 && actualCol >= 0 && actualCol < 9) {
        const isValid = validMoves.some(m => m.row === actualRow && m.col === actualCol)
        if (isValid) {
          onMove(selected, { row: actualRow, col: actualCol })
          setSelected(null)
          setValidMoves([])
          return
        }
      }
      setSelected(null)
      setValidMoves([])
    }
  }

  // Determine piece positions and animate them
  // Board state is the source of truth — this avoids stale positions
  return (
    <div className="relative w-full" style={{ aspectRatio: '9/10' }}>
      <Canvas
        shadows
        camera={{ position: [0, 8, 5], fov: 35 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#0a0e1a']} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <directionalLight position={[-5, 8, -3]} intensity={0.4} color="#a0c4ff" />
        <Suspense fallback={null}>
          <BoardBase />

          {/* Pieces */}
          {board.map((row, r) =>
            row.map((code, c) => {
              if (!code) return null
              const isSelected = selected?.row === r && selected?.col === c
              const isLastMove = lastMove && (
                (lastMove.from.row === r && lastMove.from.col === c) ||
                (lastMove.to.row === r && lastMove.to.col === c)
              )
              const isKingInCheck = isInCheck && (code === 'rk' || code === 'bk')
              return (
                <Piece
                  key={`${r}-${c}`}
                  code={code}
                  position={[colToX(c), PIECE_H / 2, rowToZ(r)]}
                  color={getPieceColor(code)}
                  isSelected={isSelected}
                  isMovable={validMoves.some(m => m.row === r && m.col === c)}
                  isLastMove={!!isLastMove}
                  isInCheck={isKingInCheck}
                  onClick={() => handlePieceClick(r, c)}
                />
              )
            })
          )}

          {/* Move markers */}
          {validMoves.map((m, i) => (
            <MoveMarker
              key={`move-${m.row}-${m.col}`}
              position={[colToX(m.col), 0.01, rowToZ(m.row)]}
              isSelected={false}
            />
          ))}

          {/* Click target above board */}
          <mesh
            position={[0, 0.005, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={handleBoardClick}
            receiveShadow={false}
          >
            <planeGeometry args={[9 * CELL, 10 * CELL]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>

          <ContactShadows
            position={[0, -0.04, 0]}
            opacity={0.4}
            scale={20}
            blur={2.5}
            far={4}
          />
          <Environment preset="city" />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={6}
          maxDistance={14}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  )
}
