# co-tuong-online — State Management Design

> **C4 Level**: 3 — State Management

## 1. State Categories

### 1.1 Server State (Persisted — MongoDB)
- Game state: board, players, current turn, moves, status, result, time banks
- Room state: name, code, players, max players, game ID, status
- Persisted on every meaningful mutation (move submitted, player joined, etc.)

### 1.2 Client State (In-Memory — React)
- UI state: selected cell, valid moves, modal open states, dragging state
- Connection state: WS connected/disconnected indicator
- Temporary form state: room name, player name, room code input

### 1.3 URL State
- Room ID: `https://co-tuong-online.vercel.app/room/[roomId]` for shareability
- Game ID for match replay sub-route

## 2. State Management Approach

### 2.1 React Query (Server State)
```typescript
// apps/web/lib/query-provider.tsx
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,      // 1 minute
      refetchInterval: 3000,      // fallback polling every 3s
      retry: 3,
    },
  },
});
```

**Key queries:**
- `useRoom(roomId)` — fetch room details
- `useGame(gameId)` — fetch full game state
- `usePublicRooms()` — list open rooms
- `usePlayerHistory(playerId)` — match history

### 2.2 Game State Reducer
```typescript
// apps/web/components/game/useGameReducer.ts
type Position = { row: number; col: number };
type Piece = { type: PieceType; color: Color };
type Cell = Piece | null;
type Board = Cell[][];

type GameUIState = {
  selectedCell: Position | null;
  validMoves: Position[];
  isDragging: boolean;
  dragPiece: Position | null;
  showMoveHistory: boolean;
  showRules: boolean;
  boardSize: number;
};

type GameAction =
  | { type: 'SELECT_CELL'; payload: Position }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_VALID_MOVES'; payload: Position[] }
  | { type: 'START_DRAG'; payload: Position }
  | { type: 'END_DRAG' }
  | { type: 'TOGGLE_MOVE_HISTORY' }
  | { type: 'TOGGLE_RULES' }
  | { type: 'SET_BOARD_SIZE'; payload: number };
```

### 2.3 WebSocket State Sync
```typescript
// apps/web/hooks/useGameWebSocket.ts
// 1. On message type "game_state" → replace full game state
// 2. On message type "game_update" → merge into game state (update board, moves, turn)
// 3. On message type "game_over" → show GameEndModal, stop polling
// 4. On disconnect → set connected: false, activate fallback polling
// 5. On reconnect → reconnect WS, deactivate polling
```

### 2.4 Identity Management
```typescript
// apps/web/lib/player.ts
const STORAGE_KEY = 'co_tuong_player';

export function getOrCreatePlayer(): { id: string; name: string } {
  if (typeof window === 'undefined') return { id: 'server', name: 'Server' };
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return JSON.parse(stored);
  const id = v4();  // UUID v4
  const name = 'Player_' + id.slice(0, 4);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, name }));
  return { id, name };
}
```

## 3. Data Flow

```
User Action
    │
    ▼
React UI ──► WebSocket ──► FastAPI ──► MongoDB
  │                                    │
  │◄── React Query refetch ◄──────────┘
  │
  ▼
Reducer (UI state)
```

## 4. Reconnection Logic

```
On page load:
1. Check localStorage for player ID
2. Connect WebSocket
3. Start React Query polling as fallback

On WS disconnect:
1. Mark WS connected = false
2. Activate polling (refetchInterval: 3000)
3. Attempt reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)

On WS reconnect:
1. Receive full game state via "game_state" message
2. Deactivate polling
3. Sync UI state from received game state
```

## 5. Optimistic Updates

```typescript
// Move submission — optimistic update
const moveMutation = useMutation({
  mutationFn: (move: Move) => submitMove(gameId, playerId, move),
  onMutate: async (move) => {
    await queryClient.cancelQueries(['game', gameId]);
    const previous = queryClient.getQueryData(['game', gameId]);
    // Optimistically apply move to local board
    queryClient.setQueryData(['game', gameId], (old) => applyMoveOptimistically(old, move));
    return { previous };
  },
  onError: (err, move, context) => {
    queryClient.setQueryData(['game', gameId], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries(['game', gameId]);
  },
});
```
