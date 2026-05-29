# Acceptance Criteria — co-tuong-online

> **Status**: Draft | Created: 2026-05-29
> **Format**: Given-When-Then (BDD)
> **Total ACs**: 57

---

## Table of Contents
1. [Anonymous Identity](#1-anonymous-identity)
2. [Room Management](#2-room-management)
3. [Core Gameplay](#3-core-gameplay)
4. [Real-time Updates](#4-real-time-updates)
5. [Mobile Experience](#5-mobile-experience)
6. [Error Handling](#6-error-handling)
7. [Data Persistence](#7-data-persistence)

---

## 1. Anonymous Identity

### AC-ID-001: Anonymous player ID is generated on first visit
**Given**: Player opens the game for the first time (no localStorage data)
**When**: The game page loads
**Then**: A unique UUID (v4) is generated and stored in localStorage as `co_tuong_player` containing `{ id, name }`

### AC-ID-002: Player ID persists across page reloads
**Given**: Player has a `co_tuong_player` entry in localStorage
**When**: Player reloads the page or opens a new browser tab
**Then**: The same `id` and `name` are retrieved and used for all subsequent requests

### AC-ID-003: Default player name is "Anonymous_{last4chars}"
**Given**: Player has no name set in localStorage
**When**: Player joins a room or creates a game
**Then**: The player name displays as "Anonymous_ab12" (using last 4 chars of UUID)

### AC-ID-004: Player name is editable at room creation
**Given**: Player is on the lobby page
**When**: Player enters a custom name in the "Create Room" modal
**Then**: The provided name is stored in localStorage and used for all games until changed

---

## 2. Room Management

### AC-ROOM-001: Player can create a public room
**Given**: Player is on the lobby page
**When**: Player clicks "Tạo phòng", enters "Phòng Test" and clicks "Tạo phòng"
**Then**: A new public room named "Phòng Test" is created in MongoDB, a 6-char room code is generated, and the player is redirected to `/room/[code]`

### AC-ROOM-002: Room code is unique and 6 alphanumeric characters
**Given**: Player creates a room
**When**: The room is created
**Then**: The room code is exactly 6 characters from `[A-Z0-9]`, unique in the database

### AC-ROOM-003: Room name is required (max 50 chars)
**Given**: Player opens the Create Room dialog
**When**: Player clicks "Tạo phòng" with empty room name
**Then**: Error message "Vui lòng nhập tên phòng" appears, no room is created

### AC-ROOM-004: Room name max length is 50 characters
**Given**: Player types 51+ characters in the room name field
**When**: Player clicks "Tạo phòng"
**Then**: The field truncates to 50 characters and/or shows error "Tên phòng tối đa 50 ký tự"

### AC-ROOM-005: Private room does not appear in public room list
**Given**: Player creates a room with "Phòng riêng" toggle ON
**When**: Other players load the lobby page
**Then**: The private room is NOT returned by `GET /api/rooms`

### AC-ROOM-006: Public rooms appear in the lobby room list
**Given**: There are 3 public rooms created
**When**: Player loads the lobby page
**Then**: All 3 rooms appear in the "Các phòng đang chờ" list with name, player count, and status badge

### AC-ROOM-007: Player can join room via room code input
**Given**: Player 1 created a room with code "X7K2M1"
**When**: Player 2 enters "X7K2M1" and clicks "Tham gia"
**Then**: Player 2 joins the room and is redirected to `/room/X7K2M1`

### AC-ROOM-008: Room listing shows correct player count
**Given**: A room has `maxPlayers=2` and 1 player has joined
**When**: The room list renders
**Then**: The room card shows "1/2 người chơi"

### AC-ROOM-009: Second player joining starts the game automatically
**Given**: A room has 2 slots and Player 1 (host) has joined
**When**: Player 2 joins the room
**Then**: A Game document is created in MongoDB with initial board, both players registered, status set to "playing", and both players receive the game state via WebSocket

### AC-ROOM-010: Room full rejects additional players with error
**Given**: A room has `maxPlayers=2` and 2 players are already in it
**When**: A third player attempts to join via code or link
**Then**: Error 409 "ROOM_FULL" is returned, and the player sees toast "Phòng đã đầy"

### AC-ROOM-011: Room share link copies to clipboard
**Given**: Player is in the room waiting screen
**When**: Player clicks "Chia sẻ" button
**Then**: `https://co-tuong-online.vercel.app/room/[code]` is copied to clipboard, toast "Đã sao chép đường liên kết!" appears

### AC-AC-ROOM-012: Room code copies to clipboard
**Given**: Player is in the room waiting screen
**When**: Player clicks "Sao chép" button
**Then**: The 6-char room code is copied and toast "Đã sao chép mã phòng!" appears

---

## 3. Core Gameplay

### AC-GAME-001: Board initializes with correct Cờ Tướng starting positions
**Given**: A game starts with 2 players
**When**: The board renders
**Then**: All 32 pieces (16 red, 16 black) are in standard starting positions: Chariots at corners, Horses at inner corners, Elephants next to Horses, Advisors next to General, Cannons behind Soldiers, Soldiers in front row

### AC-GAME-002: Red side moves first
**Given**: A new game starts
**When**: Both players have loaded the game board
**Then**: `currentTurn: 0` (Red player) is active, Red player's timer is running, Black player's board pieces are non-interactive

### AC-GAME-003: Valid General move is accepted
**Given**: Game is in progress, Red General is at position (row 0, col 4)
**When**: Player clicks Red General and clicks the adjacent orthogonal cell within the palace (row 1, col 4)
**Then**: The General moves to the new cell, the move is recorded, turn switches to Black

### AC-GAME-004: Valid Advisor move is accepted
**Given**: Black Advisor is at position (row 9, col 3)
**When**: Player selects the Advisor and clicks the diagonal palace cell (row 8, col 4)
**Then**: The Advisor moves, move recorded, turn switches to Red

### AC-GAME-005: Valid Elephant move is accepted
**Given**: Red Elephant is at position (row 2, col 2)
**When**: Player clicks the Elephant and clicks the destination two diagonal steps away, provided the river (row 4) is Clear
**Then**: Elephant moves to destination (row 4, col 4), move recorded

### AC-GAME-006: Elephant blocked by river (cannot cross)
**Given**: Red Elephant is at position (row 2, col 2) and the river (row 4) is clear
**When**: Player attempts to move the Elephant to row 6, col 4
**Then**: The move is rejected with error, piece stays at original position

### AC-GAME-007: Valid Chariot move is accepted (unlimited orthogonal)
**Given**: Red Chariot is at position (row 0, col 0)
**When**: Player clicks the Chariot and clicks any empty orthogonal cell on row 0
**Then**: The Chariot moves to the destination, no pieces jump, move recorded

### AC-GAME-008: Valid Horse move is accepted
**Given**: Black Horse is at position (row 9, col 1)
**When**: Player clicks Horse and clicks the valid "horse jump" cell (row 8, col 2) — 1 orthogonal then 1 diagonal
**Then**: Horse moves to destination, move recorded

### AC-GAME-009: Horse is blocked when "leg" cell is occupied
**Given**: Black Horse is at position (row 9, col 1) and a Black piece occupies the "leg" cell (row 8, col 1)
**When**: Player attempts to move the Horse in that direction
**Then**: The move is rejected

### AC-GAME-010: Valid Cannon capture move
**Given**: Black Cannon is at (row 7, col 7), there is exactly one Red piece between Cannon and the target Red piece
**When**: Player selects Cannon and clicks the Red piece with clear line of sight
**Then**: The Red piece is captured, Cannon moves to that position, move recorded

### AC-GAME-011: Cannon capture requires exactly one screen piece
**Given**: Black Cannon is at (row 7, col 7) and there are either 0 or 2+ pieces in the path
**When**: Player attempts to capture
**Then**: The move is rejected with error "Cannon requires exactly one screen piece to capture"

### AC-GAME-012: Soldier before river moves forward only
**Given**: Red Soldier is at row 3, col 5 (not across river)
**When**: Player clicks Soldier and attempts to move sideways (col 4 or col 6)
**Then**: The move is rejected (sideways movement only allowed after crossing river)

### AC-GAME-013: Soldier after river can move sideways
**Given**: Red Soldier is at row 4, col 5 (has crossed the river, row 4 = river)
**When**: Player clicks Soldier and attempts to move sideways to col 6
**Then**: The Soldier moves sideways to col 6, move recorded

### AC-GAME-014: Invalid move rejected with Vietnamese error
**Given**: Player attempts an invalid move (wrong piece type direction, out of palace boundary, etc.)
**When**: The move is submitted to the server
**Then**: Error returned: `{ success: false, error: "INVALID_MOVE", message: "Nước đi không hợp lệ" }`, piece stays at original position

### AC-GAME-015: Cannot move opponent's piece
**Given**: It's Red's turn (Red = currentTurn)
**When**: Red player attempts to select and move a Black piece
**Then**: The piece does not highlight/select, no move is submitted

### AC-GAME-016: Cannot move when not your turn
**Given**: It's Black's turn (currentTurn = 1)
**When**: Red player attempts to make a move
**Then**: Error `{ success: false, error: "NOT_YOUR_TURN", message: "Chưa đến lượt bạn" }`, board state unchanged

### AC-GAME-017: Check state is detected and displayed
**Given**: After a move, the Red General is under attack by a Black piece
**When**: The move is validated
**Then**: The Red General's board cell displays a pulsing red overlay, and `check: true` is included in the WebSocket update

### AC-GAME-018: Move that leaves general in check is illegal
**Given**: Red General is in check from a Black Cannon
**When**: Red player makes a move that does not resolve the check
**Then**: The move is rejected with error "Nước đi không hợp lệ: Tướng vẫn đang bị chiếu"

### AC-GAME-019: Checkmate ends the game
**Given**: Red General is in checkmate — no legal move resolves the check
**When**: the checkmate position is reached
**Then**: Game status changes to "finished", result = `{ winner: 1, reason: "checkmate" }`, both players receive `game_over` WebSocket message

### AC-GAME-020: Timeout causes automatic loss
**Given**: Player 1's time bank reaches 0 seconds
**When**: the timer expires server-side
**Then**: Game status becomes "finished", result = `{ winner: 0, reason: "timeout" }`, opponent wins by timeout

### AC-GAME-021: Time bank is decremented per player independently
**Given**: A game is in progress, Red player has 180 seconds remaining
**When**: 60 seconds pass with Red player making no moves
**Then**: Red player's time bank becomes 120 seconds, still their turn

### AC-GAME-022: Game result shown in Game End Modal
**Given**: Game ends by checkmate
**When**: both players receive the `game_over` message
**Then**: GameEndModal displays "Chiến thắng!" or "Thua cuộc" based on whether each player won, with Vietnamese reason text

### AC-GAME-023: Rematch creates new game in same room
**Given**: Game has ended, GameEndModal is shown
**When**: Player clicks "Đấu lại" and opponent also confirms
**Then**: A new Game document is created, board resets, both players are back in playing state

### AC-GAME-024: Move history is recorded in standard notation
**Given**: Red Chariot moves from (row 0, col 0) to (row 0, col 1)
**When**: the move is confirmed
**Then**: The move appears in history as "Xe9.1" (or equivalent standard notation) with timestamp

### AC-GAME-025: Turn alternates correctly between players
**Given**: Red made the first move of the game
**When**: Red's move is confirmed
**Then**: `currentTurn` becomes 1 (Black), Black player's pieces become interactive

### AC-GAME-026: Last move is highlighted on board
**Given**: Red made a move from (0,0) to (0,1)
**When**: Board re-renders after move
**Then**: Both the source cell (0,0) and destination cell (0,1) display a subtle amber highlight

---

## 4. Real-time Updates

### AC-REALTIME-001: Opponent's move appears within 500ms
**Given**: Player 1 and Player 2 are in an active game
**When**: Player 1 makes a valid move
**Then**: Player 2 sees the new board state within 500ms via WebSocket message

### AC-REALTIME-002: WebSocket auto-reconnects on disconnect
**Given**: Player's WebSocket disconnects (e.g., network hiccup)
**When**: The connection drops
**Then**: Client automatically attempts to reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s), and React Query polling resumes as fallback

### AC-REALTIME-003: Game state recovered on reconnect
**Given**: A game is in progress and Player 1's WebSocket disconnects
**When**: Player 1 reconnects
**Then**: Player 1 receives the full current game state from the server and the board is rendered correctly

### AC-REALTIME-004: Opponent disconnect shows offline indicator
**Given**: Opponent closes their browser tab
**When**: The server detects the disconnect within 30 seconds
**Then**: The opponent's player panel shows a red disconnected indicator "Đã ngắt kết nối"

### AC-REALTIME-005: Disconnected player's timer pauses
**Given**: Opponent is disconnected during their turn
**When**: the timer would normally tick down
**Then**: The disconnected player's timer freezes at the current value (server-authoritative; does not affect the active player's timer)

### AC-REALTIME-006: Spectator can join via room code
**Given**: A game is in progress in a room with code "X7K2M1"
**When**: A third player ("spectator") opens `/room/X7K2M1`
**Then**: The spectator joins in read-only mode, sees the board, receives `game_update` messages, but cannot submit moves

---

## 5. Mobile Experience

### AC-MOBILE-001: Game is playable at 375px without horizontal scroll
**Given**: Player opens the game on a mobile device at 375px viewport width
**When**: Player plays through the full game flow (lobby → create → join → play → result)
**Then**: No horizontal scrolling is required at any step

### AC-MOBILE-002: Board is legible at 375px
**Given**: Player is on a mobile device at 375px width
**When**: The game board renders
**Then**: The board width is at least 315px, pieces are clearly visible with Chinese characters readable

### AC-MOBILE-003: Tap-to-select then tap-to-move works on mobile
**Given**: Player is playing on mobile and it is their turn
**When**: Player taps their piece, then taps a valid move destination
**Then**: The move is committed, piece moves, turn switches

### AC-MOBILE-004: All touch targets are at least 44×44px
**Given**: Player is on a mobile device
**When**: Player looks at any interactive element
**Then**: All buttons, piece tap targets, and form inputs are at least 44×44px in size

### AC-MOBILE-005: Player panels fit without overflow at 375px
**Given**: Player is on a mobile device at 375px width
**When**: The game screen renders
**Then**: Both player panels (top and bottom) display without text overflow, truncated gracefully if needed

### AC-MOBILE-006: Timer remains visible on mobile
**Given**: Player is on a mobile device at 375px
**When**: The game is in progress
**Then**: The timer for the active player remains clearly readable without scrolling

---

## 6. Error Handling

### AC-ERROR-001: Invalid room code shows error message
**Given**: Player enters a room code "ZZZZZZ" that does not exist
**When**: Player clicks "Tham gia"
**Then**: Error toast "Mã phòng không hợp lệ" appears, player stays on lobby

### AC-ERROR-002: Non-existent room link shows appropriate message
**Given**: Player opens a link to a deleted room `/room/X7K2M1`
**When**: The system loads the room
**Then**: Message "Phòng không tồn tại hoặc đã bị xóa" is displayed with a "Quay về trang chủ" button

### AC-ERROR-003: Room full rejection with toast
**Given**: A room is already at max players
**When**: Player opens the room link
**Then**: Toast "Phòng đã đầy" appears and player is redirected to the lobby

### AC-ERROR-004: Network error shows retry option
**Given**: Player loses internet connection during a game
**When**: a REST or WebSocket call fails
**Then**: An overlay "Mất kết nối. Đang kết nối lại..." appears with a spinner, auto-retries

### AC-ERROR-005: Loading spinner during room creation
**Given**: Player clicks "Tạo phòng" in the modal
**When**: The request to the server is in flight
**Then**: Button shows a spinner, text changes to "Đang tạo...", fields are disabled

### AC-ERROR-006: Invalid move shows error toast
**Given**: Player attempts an invalid move (e.g., Elephant tries to cross river)
**When**: The server rejects the move
**Then**: Error toast appears "Nước đi không hợp lệ" and the board remains in the previous position

### AC-ERROR-007: Empty lobby shows empty state message
**Given**: No public rooms exist
**When**: Player loads the lobby page
**Then**: A centered message "Chưa có phòng nào đang chờ. Tạo phòng mới!" with an arrow pointing to the Create button

### AC-ERROR-008: Game end modal shown on WebSocket game_over event
**Given**: Server sends `game_over` event via WebSocket
**When**: Player receives the event
**Then**: GameEndModal opens immediately, board becomes non-interactive

---

## 7. Data Persistence

### AC-PERSIST-001: Game state survives page refresh (MongoDB)
**Given**: Game is in progress at move 15
**When**: Player refreshes the browser page
**Then**: `GET /api/games/{gameId}` returns the exact same board state, move 15 is the last entry in history

### AC-PERSIST-002: All moves are recorded with timestamps
**Given**: Game is in progress with moves 1, 2, 3 in history
**When**: move 4 is made
**Then**: The move is saved to MongoDB with playerId, from, to, notation, and timestamp

### AC-PERSIST-003: Client generates and uses UUID, not server
**Given**: Player opens the game
**When**: The page loads for the first time
**Then**: The player ID is generated client-side using `crypto.randomUUID()` and stored in localStorage, never sent as a parameter that the server can guess

### AC-PERSIST-004: Room state persists while waiting
**Given**: Player 1 creates a room and shares the link
**When**: Player 1 leaves the browser open for 10 minutes without the opponent joining
**Then**: The room still exists in MongoDB with status "lobby", and when opponent opens the link the room is found

### AC-PERSIST-005: Completed game is saved with final state
**Given**: A game ends by checkmate at move 42
**When**: the game_over event is processed
**Then**: The game document in MongoDB has status "finished", result = { winner, reason }, and the full move history is preserved

---

## AC Summary

| AC ID | Feature | Priority | Tested |
|-------|---------|----------|--------|
| AC-ID-001 | Anonymous UUID on first visit | Must Have | — |
| AC-ID-002 | UUID persists across reloads | Must Have | — |
| AC-ID-003 | Default player name | Must Have | — |
| AC-ID-004 | Editable player name | Should Have | — |
| AC-ROOM-001 | Create public room | Must Have | — |
| AC-ROOM-002 | Room code uniqueness | Must Have | — |
| AC-ROOM-003 | Room name required | Must Have | — |
| AC-ROOM-004 | Room name max length | Must Have | — |
| AC-ROOM-005 | Private room hidden from list | Must Have | — |
| AC-ROOM-006 | Public rooms appear in list | Must Have | — |
| AC-ROOM-007 | Join room via code | Must Have | — |
| AC-ROOM-008 | Room player count display | Should Have | — |
| AC-ROOM-009 | Second player auto-starts game | Must Have | — |
| AC-ROOM-010 | Room full rejection | Must Have | — |
| AC-ROOM-011 | Share link copy | Should Have | — |
| AC-ROOM-012 | Room code copy | Should Have | — |
| AC-GAME-001 | Correct initial board setup | Must Have | — |
| AC-GAME-002 | Red moves first | Must Have | — |
| AC-GAME-003 | General valid move | Must Have | — |
| AC-GAME-004 | Advisor valid move | Must Have | — |
| AC-GAME-005 | Elephant valid move | Must Have | — |
| AC-GAME-006 | Elephant river block | Must Have | — |
| AC-GAME-007 | Chariot valid move | Must Have | — |
| AC-GAME-008 | Horse valid move | Must Have | — |
| AC-GAME-009 | Horse leg block | Must Have | — |
| AC-GAME-010 | Cannon capture | Must Have | — |
| AC-GAME-011 | Cannon screen requirement | Must Have | — |
| AC-GAME-012 | Soldier pre-river forward only | Must Have | — |
| AC-GAME-013 | Soldier post-river sideways | Must Have | — |
| AC-GAME-014 | Invalid move rejection | Must Have | — |
| AC-GAME-015 | Cannot move opponent piece | Must Have | — |
| AC-GAME-016 | Turn enforcement | Must Have | —Check |
| AC-GAME-017 | Check detection + display | Must Have | — |
| AC-GAME-018 | Illegal move leaving king in check | Must Have | — |
| AC-GAME-019 | Checkmate detection | Must Have | — |
| AC-GAME-020 | Timeout loss | Must Have | — |
| AC-GAME-021 | Independent time banks | Must Have | — |
| AC-GAME-022 | Game end modal | Must Have | — |
| AC-GAME-023 | Rematch flow | Should Have | — |
| AC-GAME-024 | Move notation recording | Should Have | — |
| AC-GAME-025 | Turn alternation | Must Have | — |
| AC-GAME-026 | Last move highlight | Should Have | — |
| AC-REALTIME-001 | 500ms move sync | Must Have | — |
| AC-REALTIME-002 | WS auto-reconnect | Must Have | — |
| AC-REALTIME-003 | State recovery on reconnect | Must Have | — |
| AC-REALTIME-004 | Disconnect indicator | Must Have | — |
| AC-REALTIME-005 | Timer pause on disconnect | Should Have | — |
| AC-REALTIME-006 | Spectator join | Should Have | — |
| AC-MOBILE-001 | No horizontal scroll at 375px | Must Have | — |
| AC-MOBILE-002 | Board legible at 375px | Must Have | — |
| AC-MOBILE-003 | Tap-to-move on mobile | Must Have | — |
| AC-MOBILE-004 | Touch targets ≥ 44px | Must Have | — |
| AC-MOBILE-005 | Panels fit at 375px | Must Have | — |
| AC-MOBILE-006 | Timer visible on mobile | Must Have | — |
| AC-ERROR-001 | Invalid room code error | Must Have | — |
| AC-ERROR-002 | Non-existent room message | Must Have | — |
| AC-ERROR-003 | Room full error | Must Have | — |
| AC-ERROR-004 | Network error retry | Must Have | — |
| AC-ERROR-005 | Loading during room creation | Must Have | — |
| AC-ERROR-006 | Invalid move toast | Must Have | — |
| AC-ERROR-007 | Empty lobby state | Should Have | — |
| AC-ERROR-008 | Game end modal from WS event | Must Have | — |
| AC-PERSIST-001 | Game state survives refresh | Must Have | — |
| AC-PERSIST-002 | Move timestamps recorded | Must Have | — |
| AC-PERSIST-003 | Client-side UUID generation | Must Have | — |
| AC-PERSIST-004 | Room state persists | Should Have | Should |
| AC-PERSIST-005 | Final game state saved | Must Have | — |

## Notes

- **Cờ Tướng rules complexity**: All 7 piece types have specific movement rules. Elephant cannot cross the river (row 4 boundary). Soldier can only move sideways after crossing. Cannon requires exactly 1 screen piece to capture. Horse must have its "leg" cell free. These must be exhaustively tested per piece type.
- **Check/checkmate detection**: This is the highest-risk feature. Server-side implementation of `is_in_check()` and `is_checkmate()` must be validated against known board positions before deployment.
- **Timer**: Server-authoritative clocks prevent client-side manipulation. The time bank values in MongoDB should not be trustable from client input.
- **Real-time latency target**: 500ms is the target for WebSocket move broadcast. Polling fallback at 3-second intervals is acceptable as a secondary mechanism.
