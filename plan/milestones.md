# Milestones — Cờ Tướng Online

## Phase 1 — MVP (Core gameplay)

**Goal**: Hai người có thể chơi cờ tướng online với nhau qua share link, không cần login — trên cả desktop lẫn mobile.

### Phase 1a: Game Engine (pure logic, no UI)
- [ ] `xiangqi/types.ts`: GameState, Piece, Move, Position interfaces
- [ ] `xiangqi/board.ts`: initial board setup, piece helpers
- [ ] `xiangqi/rules.ts`: `isValidMove()` cho từng loại quân:
  - Tướng (không ra khỏi cung, không đối mặt Tướng địch)
  - Sĩ (chéo trong cung)
  - Tượng (chéo 2, không qua sông, chân Tượng không bị cản)
  - Xe (thẳng, không bị cản)
  - Pháo (thẳng, ăn quân phải có đúng 1 quân chắn)
  - Mã (L-shape, chân Mã không bị cản)
  - Tốt (tiến, qua sông mới được đi ngang)
- [ ] `xiangqi/engine.ts`: `isInCheck()` — có quân nào tấn công Tướng không?
- [ ] `xiangqi/engine.ts`: `getLegalMoves(piece)` — tất cả nước đi hợp lệ cho 1 quân
- [ ] `xiangqi/engine.ts`: `isCheckmate()` — `getLegalMoves` cho tất cả quân bên đang bị chiếu, nếu tất cả đều để Tướng trong thế chiếu → chiếu bí
- [ ] Unit tests: edge cases Tượng sông, Pháo chắn, Tốt qua sông, đối Tướng

### Phase 1b: Backend / API
- [ ] MongoDB connection singleton
- [ ] Mongoose schemas: Room, Game (thêm `lastSeen.red`, `lastSeen.black`)
- [ ] `POST /api/rooms` — tạo phòng, trả về roomId + shareLink
- [ ] `GET /api/rooms` — list public rooms (status=waiting)
- [ ] `GET /api/rooms/[roomId]` — join logic (auto-assign guest khi slot trống)
- [ ] `GET /api/games/[roomId]` — game state (SWR polling endpoint)
  - Kiểm tra heartbeat: nếu `lastSeen` của một bên > 30s → mark abandoned, trao win
- [ ] `POST /api/games/[roomId]/move` — validate + optimistic lock + update
- [ ] `POST /api/games/[roomId]/heartbeat` — update `lastSeen` timestamp
- [ ] `POST /api/games/[roomId]/resign` — đầu hàng

### Phase 1c: Frontend
- [ ] Lobby page: hero tagline, danh sách phòng, tạo phòng mới, session stats (localStorage)
- [ ] Board component: 9x10 grid, render 32 quân, click-to-select, click-to-move
- [ ] **Mobile layout**: board scale vừa 375px viewport, tap events (`onPointerDown`)
- [ ] Move history panel
- [ ] Player info panel (tên, màu, lượt)
- [ ] Chiếu tướng indicator (highlight tướng bị chiếu)
- [ ] SWR polling: `refreshInterval: 1500`, stop khi `status=finished`
- [ ] Heartbeat: `setInterval` gửi `/api/games/[roomId]/heartbeat` mỗi 10s
- [ ] Game result modal: winner, end reason, nút "Chơi lại" + "Về lobby"
- [ ] Copy share link button

### Definition of Done
Hai người dùng khác nhau trên desktop VÀ mobile có thể vào URL, tạo/join phòng, chơi một ván hoàn chỉnh đến kết thúc (chiếu bí hoặc đầu hàng). Nếu một bên bỏ đi 30s → người còn lại được thắng tự động.

---

## Phase 2 — Social & History

**Goal**: Người chơi có thể xem lại ván đấu và có lý do để quay lại.

### Features
- [ ] Lưu ván đã kết thúc vào DB
- [ ] Trang lịch sử ván đấu (theo playerId từ localStorage)
- [ ] Replay ván đấu (forward/backward từng nước)
- [ ] Share link ván đã kết thúc (để xem lại)
- [ ] "Chơi lại" sau khi ván kết thúc (tạo phòng mới với 2 người cũ)

---

## Phase 3 — Polish & UX

**Goal**: Game trông đẹp, chơi mượt, không có friction.

### Features
- [ ] Highlight ô hợp lệ khi click quân (visual move hints)
- [ ] Animation quân cờ di chuyển
- [ ] Âm thanh: click quân, ăn quân, chiếu tướng
- [ ] Mobile optimization: touch events, responsive layout tốt hơn
- [ ] Nickname đẹp hơn, có avatar placeholder
- [ ] Timer tùy chọn (bao lâu/nước hoặc tổng ván)
- [ ] Spectator mode

---

## Tech Debt / Non-features

- [ ] Rate limiting trên API (tránh spam)
- [ ] TTL index để tự xóa phòng cũ sau 24h
- [ ] Error boundary trong React
- [ ] Lighthouse audit (performance, accessibility)
