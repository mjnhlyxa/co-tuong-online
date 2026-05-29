import { GameState, Room } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error || 'Request failed' };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'Network error' };
  }
}

// Room APIs
export async function createRoom(name: string, playerName: string, isPrivate: boolean = false): Promise<ApiResponse<{ room: Room; playerId: string }>> {
  return fetchApi('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ name, playerName, isPrivate }),
  });
}

export async function getRooms(): Promise<ApiResponse<Room[]>> {
  return fetchApi('/api/rooms');
}

export async function getRoom(code: string): Promise<ApiResponse<Room>> {
  return fetchApi(`/api/rooms/${code}`);
}

export async function joinRoom(code: string, playerName: string): Promise<ApiResponse<{ room: Room; game?: GameState; playerId: string }>> {
  return fetchApi(`/api/rooms/${code}/join`, {
    method: 'POST',
    body: JSON.stringify({ playerName }),
  });
}

export async function leaveRoom(code: string, playerId: string): Promise<ApiResponse<void>> {
  return fetchApi(`/api/rooms/${code}/leave`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

// Game APIs
export async function getGame(roomCode: string): Promise<ApiResponse<GameState>> {
  return fetchApi(`/api/games/${roomCode}`);
}

export async function makeMove(roomCode: string, playerId: string, from: { row: number; col: number }, to: { row: number; col: number }): Promise<ApiResponse<GameState>> {
  return fetchApi(`/api/games/${roomCode}/move`, {
    method: 'POST',
    body: JSON.stringify({ playerId, from, to }),
  });
}

export async function resignGame(roomCode: string, playerId: string): Promise<ApiResponse<GameState>> {
  return fetchApi(`/api/games/${roomCode}/resign`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

export async function requestRematch(roomCode: string, playerId: string): Promise<ApiResponse<GameState>> {
  return fetchApi(`/api/games/${roomCode}/rematch`, {
    method: 'POST',
    body: JSON.stringify({ playerId }),
  });
}

// Player ID management
const PLAYER_ID_KEY = 'co_tuong_player';

export function getPlayerId(): string {
  if (typeof window === 'undefined') return '';

  let player = localStorage.getItem(PLAYER_ID_KEY);
  if (!player) {
    const id = crypto.randomUUID();
    const name = `Player_${id.slice(0, 4)}`;
    player = JSON.stringify({ id, name });
    localStorage.setItem(PLAYER_ID_KEY, player);
  }

  return JSON.parse(player).id;
}

export function getPlayerName(): string {
  if (typeof window === 'undefined') return '';

  let player = localStorage.getItem(PLAYER_ID_KEY);
  if (!player) {
    const id = crypto.randomUUID();
    const name = `Player_${id.slice(0, 4)}`;
    player = JSON.stringify({ id, name });
    localStorage.setItem(PLAYER_ID_KEY, player);
  }

  return JSON.parse(player).name;
}

export function setPlayerName(name: string): void {
  if (typeof window === 'undefined') return;

  let player = localStorage.getItem(PLAYER_ID_KEY);
  if (player) {
    const data = JSON.parse(player);
    data.name = name;
    localStorage.setItem(PLAYER_ID_KEY, JSON.stringify(data));
  }
}
