'use client';

import { Modal } from './Modal';
import clsx from 'clsx';

interface GameEndModalProps {
  isOpen: boolean;
  winner: 0 | 1 | null;
  reason: 'checkmate' | 'timeout' | 'resign' | null;
  winnerName: string;
  myPlayerIndex: 0 | 1;
  players: [{ name: string } | null, { name: string } | null];
  onRematch: () => void;
  onExit: () => void;
}

export function GameEndModal({
  isOpen,
  winner,
  reason,
  winnerName,
  myPlayerIndex,
  players,
  onRematch,
  onExit
}: GameEndModalProps) {
  const isWinner = winner === myPlayerIndex;

  const getReasonText = () => {
    switch (reason) {
      case 'checkmate':
        return 'Chiếu bí';
      case 'timeout':
        return 'Hết giờ';
      case 'resign':
        return 'Đối thủ xin thua';
      default:
        return '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} size="sm">
      <div className="text-center py-4">
        {/* Result Icon */}
        <div className={clsx(
          'w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center',
          isWinner ? 'bg-success' : 'bg-danger'
        )}>
          {isWinner ? (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          )}
        </div>

        {/* Result Text */}
        <h2 className={clsx(
          'text-3xl font-bold mb-2',
          isWinner ? 'text-success' : 'text-danger'
        )}>
          {isWinner ? 'Chiến thắng!' : 'Thua cuộc'}
        </h2>

        <p className="text-text-secondary mb-4">
          {winnerName} thắng bởi {getReasonText()}
        </p>

        {/* Players info */}
        <div className="flex justify-center gap-8 mb-6">
          <div className="text-center">
            <div className={clsx(
              'w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center font-bold',
              players[0] ? 'bg-piece-red-bg text-white' : 'bg-bg-elevated text-text-muted'
            )}>
              {players[0]?.name.charAt(0) || '?'}
            </div>
            <span className="text-sm">{players[0]?.name || 'Chưa có'}</span>
          </div>
          <div className="text-center">
            <div className={clsx(
              'w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center font-bold',
              players[1] ? 'bg-piece-black-bg text-yellow-400 border-2 border-yellow-400' : 'bg-bg-elevated text-text-muted'
            )}>
              {players[1]?.name.charAt(0) || '?'}
            </div>
            <span className="text-sm">{players[1]?.name || 'Chưa có'}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onRematch}
            className="btn btn-accent w-full"
          >
            Đấu lại
          </button>
          <button
            onClick={onExit}
            className="btn btn-secondary w-full"
          >
            Thoát
          </button>
        </div>
      </div>
    </Modal>
  );
}
