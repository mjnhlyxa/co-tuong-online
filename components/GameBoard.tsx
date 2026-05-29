'use client';

import { useMemo } from 'react';
import { Board, Position, Piece, PIECE_CHARS } from '@/lib/types';
import clsx from 'clsx';

interface GameBoardProps {
  board: Board;
  selectedCell: Position | null;
  validMoves: Position[];
  currentTurn: 0 | 1;
  myPlayerIndex: 0 | 1;
  lastMove: { from: Position; to: Position } | null;
  checkPosition: Position | null;
  onCellClick: (row: number, col: number) => void;
  boardSize?: number;
}

export function GameBoard({
  board,
  selectedCell,
  validMoves,
  currentTurn,
  myPlayerIndex,
  lastMove,
  checkPosition,
  onCellClick,
  boardSize = 576
}: GameBoardProps) {
  const cellSize = boardSize / 9;

  const isValidMove = (row: number, col: number) => {
    return validMoves.some(m => m.row === row && m.col === col);
  };

  const isSelected = (row: number, col: number) => {
    return selectedCell?.row === row && selectedCell?.col === col;
  };

  const isLastMoveCell = (row: number, col: number) => {
    if (!lastMove) return false;
    return (lastMove.from.row === row && lastMove.from.col === col) ||
           (lastMove.to.row === row && lastMove.to.col === col);
  };

  const isCheckCell = (row: number, col: number) => {
    return checkPosition?.row === row && checkPosition?.col === col;
  };

  const canInteract = (row: number, col: number) => {
    const piece = board[row][col];
    if (!piece) return false;
    const isMyPiece = (myPlayerIndex === 0 && piece.color === 'red') ||
                      (myPlayerIndex === 1 && piece.color === 'black');
    return isMyPiece && currentTurn === myPlayerIndex;
  };

  return (
    <div
      className="relative bg-board-light rounded-lg overflow-hidden shadow-elevated"
      style={{ width: boardSize, height: boardSize * (10 / 9) }}
    >
      {/* Board Grid */}
      <svg
        className="absolute inset-0"
        width={boardSize}
        height={boardSize * (10 / 9)}
        viewBox={`0 0 ${boardSize} ${boardSize * (10 / 9)}`}
      >
        {/* Draw grid lines */}
        {/* Vertical lines */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(col => (
          <line
            key={`v-${col}`}
            x1={col * cellSize + cellSize / 2}
            y1={cellSize / 2}
            x2={col * cellSize + cellSize / 2}
            y2={boardSize * 0.9 + cellSize / 2}
            stroke="#8B7355"
            strokeWidth="1"
          />
        ))}

        {/* Horizontal lines */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(row => (
          <line
            key={`h-${row}`}
            x1={cellSize / 2}
            y1={row * cellSize + cellSize / 2}
            x2={boardSize - cellSize / 2}
            y2={row * cellSize + cellSize / 2}
            stroke="#8B7355"
            strokeWidth="1"
          />
        ))}

        {/* River */}
        <rect
          x={cellSize / 2}
          y={4 * cellSize + cellSize / 2}
          width={boardSize - cellSize}
          height={cellSize}
          fill="#3d7a9e"
          opacity="0.3"
        />
        <text
          x={boardSize / 2}
          y={4.5 * cellSize + cellSize / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#3d7a9e"
          fontSize="24"
          fontFamily="serif"
          opacity="0.5"
        >
          楚 河
        </text>
        <text
          x={boardSize / 2}
          y={5.5 * cellSize + cellSize / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#3d7a9e"
          fontSize="24"
          fontFamily="serif"
          opacity="0.5"
        >
          漢 界
        </text>

        {/* Red Palace (top) */}
        <line x1={3 * cellSize + cellSize / 2} y1={cellSize / 2} x2={5 * cellSize + cellSize / 2} y2={2.5 * cellSize + cellSize / 2} stroke="#8B7355" strokeWidth="1" />
        <line x1={5 * cellSize + cellSize / 2} y1={cellSize / 2} x2={3 * cellSize + cellSize / 2} y2={2.5 * cellSize + cellSize / 2} stroke="#8B7355" strokeWidth="1" />

        {/* Black Palace (bottom) */}
        <line x1={3 * cellSize + cellSize / 2} y1={9 * cellSize + cellSize / 2} x2={5 * cellSize + cellSize / 2} y2={7.5 * cellSize + cellSize / 2} stroke="#8B7355" strokeWidth="1" />
        <line x1={5 * cellSize + cellSize / 2} y1={9 * cellSize + cellSize / 2} x2={3 * cellSize + cellSize / 2} y2={7.5 * cellSize + cellSize / 2} stroke="#8B7355" strokeWidth="1" />
      </svg>

      {/* Board Cells (for interaction) */}
      <div className="absolute inset-0 grid grid-cols-9 grid-rows-10">
        {board.map((row, rowIdx) =>
          row.map((cell, colIdx) => (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={clsx(
                'board-cell',
                (rowIdx + colIdx) % 2 === 0 ? 'board-cell-light' : 'board-cell-dark',
                isSelected(rowIdx, colIdx) && 'selected-cell',
                isLastMoveCell(rowIdx, colIdx) && 'last-move-cell',
                isCheckCell(rowIdx, colIdx) && 'check-cell'
              )}
              onClick={() => onCellClick(rowIdx, colIdx)}
            >
              {/* Valid move indicator */}
              {isValidMove(rowIdx, colIdx) && (
                <div className={clsx(
                  'rounded-full bg-success/60',
                  board[rowIdx][colIdx] ? 'w-5 h-5' : 'w-3 h-3'
                )} />
              )}

              {/* Piece */}
              {cell && (
                <div
                  className={clsx(
                    'piece w-11 h-11 text-xl font-bold flex items-center justify-center cursor-pointer transition-transform',
                    cell.color === 'red' ? 'piece-red' : 'piece-black',
                    canInteract(rowIdx, colIdx) && 'hover:scale-110'
                  )}
                >
                  {PIECE_CHARS[cell.color][cell.type]}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
