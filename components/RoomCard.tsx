'use client';

import { Room } from '@/lib/types';
import clsx from 'clsx';

interface RoomCardProps {
  room: Room;
  onJoin: (code: string) => void;
  onSpectate?: (code: string) => void;
}

export function RoomCard({ room, onJoin, onSpectate }: RoomCardProps) {
  const playerCount = room.players.filter(Boolean).length;

  return (
    <div className="card hover:shadow-elevated transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold truncate">{room.name}</h3>
        <span className={clsx(
          'px-2 py-0.5 rounded-full text-xs font-medium',
          room.status === 'waiting' ? 'bg-success/20 text-success' :
          room.status === 'playing' ? 'bg-warning/20 text-warning' :
          'bg-text-muted/20 text-text-muted'
        )}>
          {room.status === 'waiting' ? 'Đang chờ' : room.status === 'playing' ? 'Đang chơi' : 'Kết thúc'}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm text-text-secondary">
        <span>{playerCount}/{room.maxPlayers} người chơi</span>
        <span className="font-mono text-xs bg-bg-page px-2 py-0.5 rounded">{room.code}</span>
      </div>

      <div className="flex gap-2 mt-3">
        {room.status === 'waiting' ? (
          <button
            onClick={() => onJoin(room.code)}
            className="btn btn-primary text-sm flex-1"
          >
            Tham gia
          </button>
        ) : (
          onSpectate && (
            <button
              onClick={() => onSpectate(room.code)}
              className="btn btn-secondary text-sm flex-1"
            >
              Quan sát
            </button>
          )
        )}
      </div>
    </div>
  );
}
