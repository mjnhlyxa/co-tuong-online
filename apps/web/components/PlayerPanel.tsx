'use client';

import { Player, Color } from '@/lib/types';
import clsx from 'clsx';

interface PlayerPanelProps {
  player: Player | null;
  isCurrentTurn: boolean;
  timeBank: number;
  isConnected: boolean;
  isMyPlayer: boolean;
  position: 'top' | 'bottom';
}

export function PlayerPanel({
  player,
  isCurrentTurn,
  timeBank,
  isConnected,
  isMyPlayer,
  position
}: PlayerPanelProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeBank < 30) return 'text-danger';
    if (timeBank < 60) return 'text-warning';
    return 'text-text-primary';
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className={clsx(
      'flex items-center gap-3 p-3 rounded-xl bg-bg-surface shadow-card',
      isCurrentTurn && 'border-l-4 border-primary',
    )}>
      {/* Avatar */}
      <div className={clsx(
        'w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg',
        'border-2',
        player?.color === 'red'
          ? 'bg-piece-red-bg text-white border-white'
          : player?.color === 'black'
          ? 'bg-piece-black-bg text-yellow-400 border-yellow-400'
          : 'bg-bg-elevated text-text-muted border-text-muted'
      )}>
        {player ? getInitial(player.name) : '?'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {player?.name || 'Chờ người chơi...'}
          </span>
          {isMyPlayer && (
            <span className="text-xs text-primary">(Bạn)</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span className={clsx(
            'font-mono',
            isCurrentTurn && getTimeColor()
          )}>
            {formatTime(timeBank)}
          </span>
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-2">
        {/* Turn indicator */}
        <div className={clsx(
          'w-3 h-3 rounded-full',
          isCurrentTurn ? 'bg-success animate-pulse' : 'bg-text-muted'
        )} />

        {/* Connection status */}
        <div className={clsx(
          'w-2 h-2 rounded-full',
          isConnected ? 'bg-success' : 'bg-danger'
        )} />
      </div>
    </div>
  );
}
