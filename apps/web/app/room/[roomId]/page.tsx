'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getGame, makeMove, getRoom, joinRoom, getPlayerId, resignGame, requestRematch } from '@/lib/api';
import { GameState, Position, BOARD_ROWS, BOARD_COLS } from '@/lib/types';
import { GameBoard, PlayerPanel, RulesModal, GameEndModal, ToastContainer, Modal, showToast } from '@/components';
import clsx from 'clsx';

// Initial board setup
function createInitialBoard(): (null)[][] {
  const board: (null)[][] = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
  return board;
}

export default function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();

  const [selectedCell, setSelectedCell] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showResignModal, setShowResignModal] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState<0 | 1 | null>(null);

  // Fetch game state
  const { data: gameData, refetch } = useQuery({
    queryKey: ['game', roomId],
    queryFn: async () => {
      const res = await getGame(roomId);
      return res;
    },
    refetchInterval: 2000,
  });

  const game: GameState | null = gameData?.success ? gameData.data || null : null;

  // Determine my player index on game load
  useEffect(() => {
    if (game && game.players) {
      const pid = getPlayerId();
      setPlayerId(pid);

      if (game.players[0]?.id === pid) {
        setMyPlayerIndex(0);
      } else if (game.players[1]?.id === pid) {
        setMyPlayerIndex(1);
      }
    }
  }, [game]);

  // Move mutation
  const moveMutation = useMutation({
    mutationFn: async ({ from, to }: { from: Position; to: Position }) => {
      return makeMove(roomId, playerId!, from, to);
    },
    onSuccess: (res) => {
      if (!res.success) {
        showToast(res.error || 'Nước đi không hợp lệ', 'error');
      }
      refetch();
    },
  });

  // Resign mutation
  const resignMutation = useMutation({
    mutationFn: async () => {
      return resignGame(roomId, playerId!);
    },
    onSuccess: (res) => {
      if (res.success) {
        showToast('Bạn đã xin thua', 'info');
        refetch();
      }
    },
  });

  // Rematch mutation
  const rematchMutation = useMutation({
    mutationFn: async () => {
      return requestRematch(roomId, playerId!);
    },
    onSuccess: (res) => {
      if (res.success) {
        showToast('Đang chờ đối thủ xác nhận...', 'info');
        refetch();
      }
    },
  });

  // Calculate valid moves for selected piece
  const calculateValidMoves = useCallback((board: any[][], pos: Position): Position[] => {
    const piece = board[pos.row]?.[pos.col];
    if (!piece) return [];

    const moves: Position[] = [];
    const color = piece.color;

    // Simple move validation based on piece type
    const addMove = (r: number, c: number) => {
      if (r < 0 || r >= BOARD_ROWS || c < 0 || c >= BOARD_COLS) return;
      const target = board[r][c];
      if (target && target.color === color) return;
      moves.push({ row: r, col: c });
    };

    const isInPalace = (r: number, c: number, clr: string) => {
      if (clr === 'red') return r >= 0 && r <= 2 && c >= 3 && c <= 5;
      return r >= 7 && r <= 9 && c >= 3 && c <= 5;
    };

    const isAcrossRiver = (r: number, clr: string) => {
      if (clr === 'red') return r > 4;
      return r < 5;
    };

    switch (piece.type) {
      case 'general':
        // Move one orthogonal within palace
        addMove(pos.row, pos.col + 1);
        addMove(pos.row, pos.col - 1);
        addMove(pos.row + 1, pos.col);
        addMove(pos.row - 1, pos.col);
        return moves.filter(m => isInPalace(m.row, m.col, color));

      case 'advisor':
        // Move one diagonal within palace
        addMove(pos.row + 1, pos.col + 1);
        addMove(pos.row + 1, pos.col - 1);
        addMove(pos.row - 1, pos.col + 1);
        addMove(pos.row - 1, pos.col - 1);
        return moves.filter(m => isInPalace(m.row, m.col, color));

      case 'elephant':
        // Move 2 diagonal, blocked by river
        const elephantMoves = [
          [pos.row + 2, pos.col + 2], [pos.row + 2, pos.col - 2],
          [pos.row - 2, pos.col + 2], [pos.row - 2, pos.col - 2]
        ];
        const blocks = [
          [pos.row + 1, pos.col + 1], [pos.row + 1, pos.col - 1],
          [pos.row - 1, pos.col + 1], [pos.row - 1, pos.col - 1]
        ];
        return elephantMoves.map((m, i) => ({ row: m[0], col: m[1] })).filter((m, i) => {
          if (color === 'red' && m.row <= 4) return false;
          if (color === 'black' && m.row >= 5) return false;
          if (!board[blocks[i][0]]?.[blocks[i][1]]) return true;
          return false;
        });

      case 'chariot':
        // Move any orthogonal distance
        for (let r = pos.row - 1; r >= 0; r--) if (!addMoveIfClear(board, r, pos.col, color)) break;
        for (let r = pos.row + 1; r < BOARD_ROWS; r++) if (!addMoveIfClear(board, r, pos.col, color)) break;
        for (let c = pos.col - 1; c >= 0; c--) if (!addMoveIfClear(board, pos.row, c, color)) break;
        for (let c = pos.col + 1; c < BOARD_COLS; c++) if (!addMoveIfClear(board, pos.row, c, color)) break;
        return moves;

      case 'horse':
        // Horse moves in L-shape
        const horseOffsets = [
          [-1, -1, -2, 0], [-1, 1, -2, 0], [1, -1, 2, 0], [1, 1, 2, 0],
          [-1, -1, 0, -2], [-1, 1, 0, -2], [1, -1, 0, 2], [1, 1, 0, 2]
        ];
        const legOffsets = [
          [-1, 0], [-1, 0], [1, 0], [1, 0],
          [0, -1], [0, -1], [0, 1], [0, 1]
        ];
        for (let i = 0; i < horseOffsets.length; i++) {
          const [dr, dc, rr, rc] = horseOffsets[i];
          const [lr, lc] = legOffsets[i];
          const legRow = pos.row + lr;
          const legCol = pos.col + lc;
          if (!board[legRow]?.[legCol]) {
            addMove(pos.row + dr, pos.col + dc);
          }
        }
        return moves;

      case 'cannon':
        // Move any orthogonal, capture with 1 screen
        for (let r = pos.row - 1; r >= 0; r--) if (!addCannonMove(board, r, pos.col, color)) break;
        for (let r = pos.row + 1; r < BOARD_ROWS; r++) if (!addCannonMove(board, r, pos.col, color)) break;
        for (let c = pos.col - 1; c >= 0; c--) if (!addCannonMove(board, pos.row, c, color)) break;
        for (let c = pos.col + 1; c < BOARD_COLS; c++) if (!addCannonMove(board, pos.row, c, color)) break;
        return moves;

      case 'soldier':
        if (color === 'red') {
          addMove(pos.row - 1, pos.col);
          if (isAcrossRiver(pos.row, color)) {
            addMove(pos.row, pos.col - 1);
            addMove(pos.row, pos.col + 1);
          }
        } else {
          addMove(pos.row + 1, pos.col);
          if (isAcrossRiver(pos.row, color)) {
            addMove(pos.row, pos.col - 1);
            addMove(pos.row, pos.col + 1);
          }
        }
        return moves;
    }

    return moves;
  }, []);

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    if (!game || game.status !== 'playing' || myPlayerIndex === null) return;
    if (game.currentTurn !== myPlayerIndex) return;

    const piece = game.board[row][col];

    // If we have a selected piece
    if (selectedCell) {
      // Check if clicking a valid move
      const isValid = validMoves.some(m => m.row === row && m.col === col);

      if (isValid) {
        // Make the move
        moveMutation.mutate({ from: selectedCell, to: { row, col } });
        setSelectedCell(null);
        setValidMoves([]);
      } else if (piece && piece.color === game.board[selectedCell.row][selectedCell.col]?.color) {
        // Select different piece of same color
        const newValidMoves = calculateValidMoves(game.board, { row, col });
        setSelectedCell({ row, col });
        setValidMoves(newValidMoves);
      } else {
        // Deselect
        setSelectedCell(null);
        setValidMoves([]);
      }
    } else if (piece) {
      // Select a piece
      const pieceColor = piece.color;
      const isMyPiece = (myPlayerIndex === 0 && pieceColor === 'red') ||
                        (myPlayerIndex === 1 && pieceColor === 'black');

      if (isMyPiece) {
        const newValidMoves = calculateValidMoves(game.board, { row, col });
        setSelectedCell({ row, col });
        setValidMoves(newValidMoves);
      }
    }
  };

  // Get current player index for turn
  const isMyTurn = myPlayerIndex !== null && game?.currentTurn === myPlayerIndex;

  // Handle game end modal
  const handleRematch = () => {
    rematchMutation.mutate();
  };

  const handleExit = () => {
    router.push('/');
  };

  // If game not loaded yet
  if (!game) {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Đang tải...</p>
        </div>
      </div>
    );
  }

  // If game is waiting for players
  if (game.status === 'waiting') {
    return (
      <div className="min-h-screen bg-bg-page flex items-center justify-center">
        <div className="card text-center py-12 px-8">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Đang chờ đối thủ...</h2>
          <p className="text-text-secondary mb-4">Mã phòng: <span className="font-mono font-bold text-lg">{roomId}</span></p>

          {/* Share buttons */}
          <div className="flex gap-2 justify-center mb-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                showToast('Đã sao chép liên kết!', 'success');
              }}
              className="btn btn-primary"
            >
              Chia sẻ liên kết
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                showToast('Đã sao chép mã phòng!', 'success');
              }}
              className="btn btn-secondary"
            >
              Sao chép mã
            </button>
          </div>

          <button onClick={handleExit} className="btn btn-ghost">
            Thoát
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-page flex flex-col">
      {/* Header */}
      <header className="bg-bg-surface shadow-card px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowResignModal(true)} className="btn btn-ghost text-danger">
              Xin thua
            </button>
          </div>
          <button onClick={() => setShowRulesModal(true)} className="btn btn-ghost">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 9a3 3 0 1 1 4 2.83V14" />
              <circle cx="12" cy="17" r="0.5" fill="currentColor" />
            </svg>
          </button>
        </div>
      </header>

      {/* Game Area */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* Player Panel - Opponent (Top) */}
          <div className="w-full lg:w-64 lg:order-1 order-2">
            <PlayerPanel
              player={game.players[myPlayerIndex === 0 ? 1 : 0]}
              isCurrentTurn={game.currentTurn !== myPlayerIndex}
              timeBank={game.timeBanks[myPlayerIndex === 0 ? 1 : 0]}
              isConnected={true}
              isMyPlayer={false}
              position="top"
            />
          </div>

          {/* Board */}
          <div className="order-1 lg:order-2">
            <GameBoard
              board={game.board}
              selectedCell={selectedCell}
              validMoves={validMoves}
              currentTurn={game.currentTurn}
              myPlayerIndex={myPlayerIndex!}
              lastMove={game.lastMove ? { from: game.lastMove.from, to: game.lastMove.to } : null}
              checkPosition={game.checkPosition}
              onCellClick={handleCellClick}
            />
          </div>

          {/* Player Panel - You (Bottom) */}
          <div className="w-full lg:w-64 lg:order-3 order-3">
            <PlayerPanel
              player={game.players[myPlayerIndex!]}
              isCurrentTurn={isMyTurn}
              timeBank={game.timeBanks[myPlayerIndex!]}
              isConnected={true}
              isMyPlayer={true}
              position="bottom"
            />
          </div>
        </div>
      </main>

      {/* Turn Indicator */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-bg-elevated px-6 py-2 rounded-full shadow-elevated">
        <p className={clsx(
          'font-medium',
          isMyTurn ? 'text-success' : 'text-text-secondary'
        )}>
          {isMyTurn ? 'Lượt của bạn' : 'Đang chờ đối thủ...'}
        </p>
      </div>

      {/* Rules Modal */}
      <RulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />

      {/* Resign Confirmation Modal */}
      <Modal isOpen={showResignModal} onClose={() => setShowResignModal(false)} title="Xác nhận" size="sm">
        <p className="text-text-secondary mb-4">Bạn có chắc muốn xin thua không?</p>
        <div className="flex gap-3">
          <button onClick={() => setShowResignModal(false)} className="btn btn-secondary flex-1">
            Hủy
          </button>
          <button onClick={() => { resignMutation.mutate(); setShowResignModal(false); }} className="btn btn-danger flex-1">
            Xin thua
          </button>
        </div>
      </Modal>

      {/* Game End Modal */}
      {game.status === 'finished' && game.result && (
        <GameEndModal
          isOpen={true}
          winner={game.result.winner}
          reason={game.result.reason}
          winnerName={game.players[game.result.winner]?.name || 'Unknown'}
          myPlayerIndex={myPlayerIndex!}
          players={game.players}
          onRematch={handleRematch}
          onExit={handleExit}
        />
      )}

      <ToastContainer />
    </div>
  );
}

// Helper functions for move validation
function addMoveIfClear(board: any[][], row: number, col: number, color: string): boolean {
  if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) return false;
  const target = board[row][col];
  if (!target) {
    return true; // Continue
  }
  if (target.color !== color) {
    // Can capture, but stop here
  }
  return false; // Stop
}

function addCannonMove(board: any[][], row: number, col: number, color: string): boolean {
  if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) return false;
  const target = board[row][col];
  if (!target) {
    return true; // Continue
  }
  // Stop here - cannon can't go further
  return false;
}
