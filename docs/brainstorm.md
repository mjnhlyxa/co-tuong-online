# Cờ Tướng Online — Brainstorm

> Status: Draft | Created: 2026-05-23

## Overview

Cờ Tướng Online là phiên bản web của cờ tướng (Chinese Chess) cho phép hai người chơi đấu với nhau theo thời gian thực. Không cần đăng ký tài khoản — mở link là chơi ngay. Có phòng công khai để tìm đối thủ và chia sẻ link phòng riêng để mời bạn bè.

## Game Concept

- **Genre**: Board game — chiến thuật
- **Platform**: Web browser — desktop primary, mobile responsive
- **Session length**: Medium (15–40 phút một ván)
- **Multiplayer**: Real-time 1v1 — hai người chơi trong cùng một phòng
- **Account required**: Không — anonymous play bằng UUID lưu localStorage
- **Spectator**: Có thể xem ván đang diễn ra (nice-to-have)

## Target Audience

- Người Việt (và cộng đồng Hoa) yêu thích cờ tướng, muốn chơi online nhanh với bạn bè mà không phải cài app hay đăng ký
- Người muốn ôn luyện hoặc xem lại các ván đã đấu
- Người chơi bình thường, không nhất thiết phải là kỳ thủ chuyên nghiệp

## Core Gameplay Loop

1. Mở trang → thấy danh sách phòng công khai đang chờ đối thủ
2. Tạo phòng mới (public/private) hoặc vào một phòng có sẵn
3. Người thứ hai vào phòng → ván đấu bắt đầu tự động
4. Hai bên thay phiên đi quân theo luật cờ tướng
5. Kết thúc khi: tướng bị chiếu bí, một bên đầu hàng, hoặc hòa
6. Kết quả hiển thị → có thể chơi lại hoặc quay về sảnh

## Features

### Must-Have (MVP)

- **Bàn cờ**: Giao diện bàn cờ tướng đầy đủ 9x10, quân cờ đúng luật
- **Luật đi quân**: Validate toàn bộ nước đi hợp lệ cho 7 loại quân (Tướng, Sĩ, Tượng, Xe, Pháo, Mã, Tốt) — bao gồm tất cả edge cases
- **Phát hiện chiếu (isInCheck)**: Real-time hiển thị khi tướng đang bị chiếu
- **Phát hiện chiếu bí (isCheckmate)**: Tạo tất cả legal moves → verify không nước nào thoát → kết thúc ván
- **Chơi không cần login**: Device ID (UUID) lưu localStorage làm player identity lâu dài
- **Nhập tên khi vào lần đầu**: Bắt buộc nhập tên (2-16 ký tự) trước khi vào lobby. Có thể thay đổi tên sau qua settings icon.
- **Tạo phòng public**: Phòng hiện trong danh sách chờ
- **Tạo phòng private**: Phòng không hiện danh sách, chỉ vào được qua link
- **Kiểm soát thời gian (Time Control)**: Khi tạo phòng, chọn thời gian mỗi bên (10p / 20p / 30p / 40p / 50p / 60p / Không giới hạn). Đồng hồ chạy khi đến lượt người đó, ai về 0 trước thua.
- **Đa ngôn ngữ**: UI hỗ trợ 8 ngôn ngữ — Tiếng Việt, English, 中文, 한국어, Русский, Français, Deutsch, Português. Tự động detect từ `navigator.language` lần đầu. Language selector luôn hiện trong header ở mọi màn hình, có thể đổi bất kỳ lúc nào, lưu vào localStorage và player preferences.
- **Profile người chơi theo Device ID**: Mỗi device có 1 profile gắn với deviceId (UUID). Lưu tên, thống kê (thắng/thua/hoà), ELO rating. Hiển thị rank khi browse phòng.
- **Hệ thống xếp hạng ELO**: Start 1500. Tiers: 🥉 Bronze (<1200) / 🥈 Silver (1200-1400) / 🥇 Gold (1400-1600) / 💎 Platinum (1600-1900) / 👑 Diamond (1900+). Cập nhật sau mỗi ván.
- **Filter phòng theo rank**: Lobby có thể lọc phòng theo tier/ELO range của host
- **Share link**: Mỗi phòng có URL duy nhất — copy link → gửi cho bạn → vào ngay
- **Danh sách phòng (Lobby)**: Xem các phòng công khai đang chờ người vào. Trang lobby có hero tagline rõ ràng: "Chơi cờ tướng online — không cần đăng ký, chia sẻ link là vào ngay"
- **Record nước đi**: Hiển thị lịch sử nước đi theo ký hiệu cờ tướng (e.g., "Xe 1-5") trong ván hiện tại
- **Lưu lịch sử ván đấu**: Sau khi kết thúc, ván được lưu vào DB với toàn bộ nước đi
- **Xem lại ván đấu**: Có thể replay lại ván từ đầu (forward/backward từng nước)
- **Đầu hàng**: Nút đầu hàng trong ván
- **Turn indicator**: Hiển thị rõ đến lượt ai
- **Mobile MVP**: Bàn cờ scale vừa 375px, tap-to-select + tap-to-move hoạt động (Phase 1 — không cần animation)
- **Chơi lại (Rematch)**: Sau khi ván kết thúc, nút "Chơi lại" tạo phòng mới với 2 người cũ
- **Session stats**: Win/loss count trong phiên hiện tại — lưu localStorage, hiển thị ở lobby
- **Heartbeat / Bỏ cuộc tự động**: Mỗi client gửi `lastSeen` mỗi 10s. Nếu một bên inactive >30s → server đánh dấu bỏ cuộc, trao chiến thắng cho người còn lại
- **Highlight nước đi hợp lệ**: Khi click chọn quân, hiển thị tất cả ô có thể đi (dot nhỏ ở ô trống, viền đỏ ở quân địch có thể ăn). Không cần biết luật trước.
- **Hoãn nước (Take-back)**: Lúc tạo phòng, host có thể bật/tắt tính năng hoãn. Khi bật: người đang đi có thể yêu cầu hoãn nước vừa đi. Đối thủ nhận thông báo và có thể đồng ý hoặc từ chối. Nếu đồng ý, nước đi bị huỷ, lượt trả về. Mỗi ván chỉ được hoãn tối đa 3 lần.
- **Spectator mode**: Khi tạo phòng, host có thể bật/tắt cho phép xem (default: bật). Người vào link phòng đang `playing` tự động trở thành người xem (nếu được phép). Hiển thị số người đang xem + danh sách tên.
- **Chat trong phòng**: Cả người chơi và người xem đều có thể chat. Chủ phòng (host) có thể mute chat của bất kỳ ai. Người bị mute vẫn thấy chat của người khác nhưng không gửi được.
- **Mobile full feature**: Tất cả tính năng có thể dùng trên mobile. Tính năng quan trọng (board, timer, turn indicator) hiển thị trực tiếp; tính năng phụ (chat, spectators, move history) mở qua modal/drawer. Bottom action bar với icon shortcuts.

### Nice-to-Have (Post-MVP)

- **Âm thanh**: Tiếng click quân, cảnh báo chiếu tướng
- **Leaderboard**: Bảng xếp hạng toàn server
- **Tự động ghép cặp**: Matchmaking cho phòng public (không cần tạo phòng thủ công)

### Out of Scope (loại khỏi MVP)

- AI opponent — phức tạp, cần engine riêng (stockfish cho chess, không có sẵn cho cờ tướng)
- Mobile app (iOS/Android)
- Tournament bracket
- Video/voice chat
- Paid features / subscription

## User Experience Goals

- **Time to first game**: Mở URL → tạo phòng → bắt đầu chờ < 20 giây. Không cần signup.
- **Share to friend**: Copy link phòng → bạn click → join ngay, không cần tài khoản
- **Onboarding**: Quân cờ có tooltip tên khi hover. Highlight ô hợp lệ khi click quân (không ép người chơi phải biết luật từ trước).
- **Mobile**: Bàn cờ scale xuống vừa màn hình điện thoại, tap để chọn/di chuyển quân.
- **Accessibility**: Font đủ lớn, tên quân rõ ràng bằng chữ Hán hoặc ký hiệu quen thuộc.

## Social & Virality Features

- **Share link phòng**: URL dạng `/game/[room-id]` — gửi cho bạn là vào chơi ngay
- **Xem phòng công khai**: Lobby liệt kê các ván đang tìm người — dễ "ngẫu nhiên gặp đối thủ"
- **Lịch sử ván đấu**: Có thể share link ván đã kết thúc để khoe/phân tích

## Data to Persist

| Collection | Nội dung |
|------------|---------|
| `rooms` | ID, type (public/private), host player ID, guest player ID, status (waiting/playing/finished), created_at |
| `games` | Room ID, full move history (array), board state, players, winner, start/end time |
| `players` | Player UUID (anonymous), nickname, win/loss count |

## Technical Feasibility Assessment

### Straightforward
- Luật cờ tướng: có thể implement đầy đủ như pure TypeScript logic
- CRUD rooms/games qua Next.js API routes + MongoDB
- Share link: chỉ là URL param → route xử lý
- Lobby: query rooms có status="waiting"

### Complex hoặc Risky
- **Real-time sync**: Hai người cần thấy nước đi của nhau gần như tức thì. Giải pháp: polling mỗi 1-2 giây (đơn giản, Vercel-compatible) hoặc SSE (tốt hơn nhưng phức tạp hơn một chút). Tránh WebSocket vì Vercel serverless không support persistent connections.
- **Validate toàn bộ luật cờ tướng**: Đặc biệt: Tượng bị chặn khi qua sông, Pháo bắt cần đúng 1 quân chắn, Tốt qua sông đi được ngang — cần test kỹ.
- **Race condition**: Hai người cùng gửi nước đi một lúc → cần atomic update (MongoDB transaction hoặc optimistic locking với `moveNumber`).

### Open Questions
- Polling interval: 1.5 giây đủ "real-time" hay cần SSE? (→ start với polling, upgrade nếu cần)
- Cần lưu board state toàn bộ hay chỉ list moves? (→ lưu cả hai: initial state + moves array)

## Competitive Landscape

- **XiangqiOnline, PlayOK**: Cũ, UI xấu, cần đăng ký
- **LiChess (Chinese Chess variant)**: Không có cờ tướng thuần
- **App trên mobile**: Phải cài, không share link được

**Điểm khác biệt**: Zero friction (không login), web-native share link, UI hiện đại, mobile-friendly.
