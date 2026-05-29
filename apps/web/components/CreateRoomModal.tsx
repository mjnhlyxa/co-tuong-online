'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { getPlayerName, setPlayerName } from '@/lib/api';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (roomName: string, playerName: string, isPrivate: boolean) => Promise<void>;
}

export function CreateRoomModal({ isOpen, onClose, onCreate }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerNameState] = useState(getPlayerName());
  const [isPrivate, setIsPrivate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async () => {
    if (!roomName.trim()) return;

    setIsLoading(true);
    try {
      setPlayerName(playerName);
      await onCreate(roomName.trim(), playerName.trim(), isPrivate);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tạo phòng mới" size="sm">
      <div className="flex flex-col gap-4">
        {/* Room Name */}
        <div>
          <label className="block text-sm text-text-secondary mb-1">Tên phòng</label>
          <input
            type="text"
            value={roomName}
            onChange={e => setRoomName(e.target.value.slice(0, 50))}
            placeholder="Phòng của tôi"
            className="input w-full"
            maxLength={50}
            autoFocus
          />
          <span className="text-xs text-text-muted mt-1">{roomName.length}/50</span>
        </div>

        {/* Player Name */}
        <div>
          <label className="block text-sm text-text-secondary mb-1">Tên của bạn</label>
          <input
            type="text"
            value={playerName}
            onChange={e => setPlayerNameState(e.target.value.slice(0, 20))}
            placeholder="Tên người chơi"
            className="input w-full"
            maxLength={20}
          />
        </div>

        {/* Private Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Phòng riêng</span>
          <button
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className={`
              relative w-12 h-6 rounded-full transition-colors
              ${isPrivate ? 'bg-primary' : 'bg-bg-surface'}
            `}
          >
            <span
              className={`
                absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                ${isPrivate ? 'left-7' : 'left-1'}
              `}
            />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="btn btn-secondary flex-1" disabled={isLoading}>
            Hủy
          </button>
          <button
            onClick={handleCreate}
            className="btn btn-accent flex-1"
            disabled={!roomName.trim() || isLoading}
          >
            {isLoading ? 'Đang tạo...' : 'Tạo phòng'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
