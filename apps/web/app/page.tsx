'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createRoom, getRooms, joinRoom, getPlayerId, showToast } from '@/lib/api';
import { Room } from '@/lib/types';
import { RoomCard, CreateRoomModal, RulesModal, ToastContainer } from '@/components';

export default function HomePage() {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const { data: rooms = [], refetch } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await getRooms();
      return res.success ? res.data! : [];
    },
    refetchInterval: 5000,
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleCreateRoom = async (roomName: string, playerName: string, isPrivate: boolean) => {
    const res = await createRoom(roomName, playerName, isPrivate);
    if (res.success && res.data) {
      localStorage.setItem('playerId', res.data.playerId);
      localStorage.setItem('playerName', playerName);
      router.push(`/room/${res.data.room.code}`);
    } else {
      showToast(res.error || 'Không thể tạo phòng', 'error');
    }
  };

  const handleJoinRoom = async (code: string) => {
    if (!code.trim()) return;

    const res = await joinRoom(code.trim().toUpperCase(), getPlayerId());
    if (res.success && res.data) {
      localStorage.setItem('playerId', res.data.playerId);
      router.push(`/room/${res.data.room.code}`);
    } else {
      showToast(res.error || 'Không thể tham gia phòng', 'error');
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    handleJoinRoom(joinCode);
  };

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Header */}
      <header className="bg-bg-surface shadow-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-piece-red-bg flex items-center justify-center">
              <span className="text-white text-xl">棋</span>
            </div>
            <h1 className="text-xl font-bold">Cờ Tướng Online</h1>
          </div>
          <button
            onClick={() => setShowRulesModal(true)}
            className="btn btn-ghost"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 9a3 3 0 1 1 4 2.83V14" />
              <circle cx="12" cy="17" r="0.5" fill="currentColor" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-accent text-lg px-8 py-4 flex-1"
          >
            Tạo phòng mới
          </button>
          <form onSubmit={handleJoinByCode} className="flex gap-2 flex-1">
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Nhập mã phòng..."
              className="input flex-1"
              maxLength={6}
            />
            <button type="submit" className="btn btn-primary px-6">
              Tham gia
            </button>
          </form>
        </div>

        {/* Room List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Các phòng đang chờ</h2>
            <button onClick={() => refetch()} className="btn btn-ghost text-sm">
              Làm mới
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-text-secondary mb-4">Chưa có phòng nào đang chờ</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                Tạo phòng mới
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rooms.map(room => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onJoin={handleJoinRoom}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateRoomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRoom}
      />

      <RulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      <ToastContainer />
    </div>
  );
}
