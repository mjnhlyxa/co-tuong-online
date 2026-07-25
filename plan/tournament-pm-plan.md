# Kế hoạch tính năng Tournament — Cờ Tướng Online

**Phạm vi:** thiết kế sản phẩm và kỹ thuật cho tournament trên Next.js 16, React 19, Mongoose/MongoDB, kế thừa identity `deviceId`, `Player`, `Room`, `Game` và SSE hiện có. Đây là plan, không phải implementation code.

## Quy ước sản phẩm và quyết định nền tảng

- Người chơi vẫn dùng `deviceId` hiện tại, không bắt buộc login. Tên hiển thị phải được snapshot vào dữ liệu giải/trận để lịch sử không thay đổi khi người chơi đổi tên.
- Mỗi tournament có đúng một `hostDeviceId`; host được phép sửa kết quả, nhưng mọi sửa đổi phải có audit log và version để tránh ghi đè đồng thời.
- Kết quả tournament là nguồn điểm riêng; không tự động cộng/trừ ELO ranked hiện tại ở MVP. Nếu muốn tính ELO, cần một setting/consent riêng và quy tắc chống abuse.
- Trận tournament dùng lại game engine và UI hiện có. `Game` là bản ghi live/replay; `TournamentMatch` là lịch thi đấu và kết quả chính thức.
- Các thao tác tạo bracket, claim/start match, submit result phải atomic/idempotent và kiểm tra state ở server; không tin dữ liệu từ client.

## 1. Tournament Data Model (Mongoose schemas)

### 1.1 `Tournament`

Collection `tournaments`, một document cho metadata, settings, participant references, phase và bản snapshot bracket nhỏ. Với giải lớn, các match/participant nằm collection riêng; không nhồi toàn bộ lịch sử game vào tournament document.

```text
{
  _id: ObjectId,
  tournamentId: string,                 // public opaque id/slug, unique
  name: string,                          // 2–80 chars
  description: string,                   // thể lệ, max length có giới hạn
  hostDeviceId: string,
  hostNameSnapshot: string,
  status: DRAFT | OPEN | STARTED | FINISHED | CANCELLED,
  format: ROUND_ROBIN | GROUP_KNOCKOUT,
  settings: {
    timeControlMinutes: number | null,  // null = unlimited; validate allow-list/range
    drawPoints: 0 | 1,                  // win mặc định 3, loss 0; draw 0 hoặc 1
    winPoints: 3,
    groupCount: number | null,
    groupSizeTarget: number | null,
    qualifiersPerGroup: number,         // MVP: 1; có thể 2
    wildcardCount: number,              // số suất lấy liên bảng
    knockoutBestOf: 1 | 3,              // MVP 1; nếu hỗ trợ BO3 phải model series
    allowLateJoin: boolean,
    allowSpectators: boolean,
    allowTakeback: boolean,
    sideAssignment: RANDOM | SEEDED_BALANCE,
    noShowPolicy: FORFEIT | BYE | HOST_DECISION
  },
  registration: {
    minPlayers: number,
    maxPlayers: number,
    joinedAt: Date | null,
    registrationDeadline: Date | null,
    scheduledStartAt: Date | null
  },
  phase: {
    number: number,
    name: GROUP_STAGE | ROUND_ROBIN | KNOCKOUT,
    startedAt: Date | null,
    completedAt: Date | null
  },
  participantCount: number,
  version: number,                       // optimistic concurrency / idempotency
  rulesVersion: string,
  createdAt: Date,
  updatedAt: Date,
  startedAt: Date | null,
  finishedAt: Date | null,
  cancelledAt: Date | null
}
```

**Validation:** DRAFT chỉ host sửa settings; OPEN không sửa format, scoring, participant cap hoặc time control (hoặc yêu cầu đóng/mở lại và ghi audit); STARTED/FINISHED immutable ngoại trừ kết quả do host correction. `minPlayers` theo format: round-robin >= 2; group stage >= 4 và phải đủ để tạo ít nhất 2 nhóm hợp lệ hoặc host chọn fallback.

**Indexes:**
- unique `{ tournamentId: 1 }`;
- `{ status: 1, 'registration.scheduledStartAt': 1, createdAt: -1 }` cho public listing;
- `{ hostDeviceId: 1, status: 1, createdAt: -1 }`;
- `{ status: 1, updatedAt: -1 }` cho jobs/reconciliation.

### 1.2 `TournamentParticipant`

Collection `tournamentParticipants`. Tách riêng để join/standings và tránh document vượt kích thước. Một player chỉ một entry trong một giải.

```text
{
  _id: ObjectId,
  tournamentId: string,                  // FK logical -> Tournament
  deviceId: string,
  nameSnapshot: string,
  playerId: ObjectId | null,              // optional FK -> Player; deviceId vẫn là identity
  seed: number | null,
  status: REGISTERED | ACTIVE | WITHDRAWN | DISQUALIFIED | ELIMINATED | CHAMPION,
  groupId: string | null,                 // A, B, C...
  groupSeed: number | null,
  stats: {
    played: number,
    wins: number,
    draws: number,
    losses: number,
    points: number,
    pointsFor: number,                    // nếu scoring result có game/board score
    pointsAgainst: number,
    pointDiff: number,
    headToHeadPoints: number,
    buchholz: number,
    byes: number,
    forfeits: number
  },
  joinedAt: Date,
  lastActiveAt: Date,
  eliminatedAt: Date | null,
  withdrawalReason: string | null,
  updatedAt: Date
}
```

Unique compound index `{ tournamentId: 1, deviceId: 1 }`; query indexes `{ tournamentId: 1, groupId: 1, 'stats.points': -1, seed: 1 }`, `{ deviceId: 1, status: 1 }`, `{ tournamentId: 1, status: 1 }`. Không cho join trùng bằng unique index và transaction/update condition.

### 1.3 `TournamentMatch`

Collection `tournamentMatches`; là lịch chính thức và state machine của từng cặp.

```text
{
  _id: ObjectId,
  matchId: string,                        // unique public id
  tournamentId: string,
  phase: GROUP_STAGE | ROUND_ROBIN | KNOCKOUT,
  roundNumber: number,                    // 1-based within phase
  roundLabel: string,                     // “Vòng 1”, “Tứ kết”,...
  groupId: string | null,
  bracketSlot: string | null,             // e.g. QF-1, SF-2, FINAL
  player1: { participantId, deviceId, nameSnapshot, seed, color: RED | BLACK },
  player2: { participantId, deviceId, nameSnapshot, seed, color: RED | BLACK } | null,
  status: SCHEDULED | READY | STARTED | COMPLETED | BYE | FORFEIT | CANCELLED,
  scheduledAt: Date | null,
  openedAt: Date | null,
  startedAt: Date | null,
  completedAt: Date | null,
  startClaimedBy: string | null,
  gameId: string | null,                   // FK logical -> Game.roomId (or game id)
  result: {
    winner: PLAYER1 | PLAYER2 | DRAW | NONE,
    score1: number | null,
    score2: number | null,
    resultType: ONLINE | HOST_REPORTED | FORFEIT | BYE | TIMEOUT,
    endReason: string | null,
    submittedByDeviceId: string | null,
    submittedAt: Date | null,
    notes: string | null,
    version: number
  },
  nextMatchId: string | null,
  sourceMatchIds: string[],                // knockout advancement provenance
  createdAt: Date,
  updatedAt: Date
}
```

Indexes: unique `{ matchId: 1 }`; `{ tournamentId: 1, phase: 1, roundNumber: 1, groupId: 1 }`; `{ tournamentId: 1, status: 1, scheduledAt: 1 }`; unique partial `{ tournamentId: 1, gameId: 1 }` where gameId exists; `{ 'player1.deviceId': 1, tournamentId: 1 }` and equivalent player2 query index. Validate `player1 != player2`, `player2=null` chỉ BYE, và một participant không có hai match cùng round chưa completed.

### 1.4 Relationship với `Game` và `Room`

- Khi một player bấm bắt đầu match, server kiểm tra `deviceId` là player1/player2. Trong transaction/idempotency lock, tạo private `Room` với `type: private`, time control/allow settings snapshot; tạo `Game`; cập nhật `TournamentMatch.gameId` và `status=STARTED`.
- Cần thêm logical metadata vào Room/Game (`tournamentId`, `tournamentMatchId`, `accessPolicy: TOURNAMENT_MATCH`) hoặc registry lookup để `/game/[roomId]` biết đây là trận tournament.
- Game authorization: hai device đúng match mới được move/heartbeat/resign/takeback; mọi device khác được spectate nếu policy cho phép. Không cho vào room bằng cách đoán roomId.
- Game completion event (hoặc reconciliation job) cập nhật match result một lần. Host result endpoint có thể tạo `HOST_REPORTED` result khi không có Game; nếu game đã hoàn tất thì host correction phải lưu previous result/audit.
- Không xoá Game khi tournament kết thúc; replay có thể truy cập read-only theo quyền/public policy.

### 1.5 Audit và event log (khuyến nghị bắt buộc cho host edits)

`TournamentAuditEvent`: `{ tournamentId, actorDeviceId, action, targetType, targetId, before, after, reason, requestId, createdAt }`. Index `{ tournamentId: 1, createdAt: 1 }`. Dùng cho đổi kết quả, DQ/withdraw, start/cancel và support dispute.

## 2. Tournament Algorithms

### 2.1 Điểm và tie-break mặc định

- Thắng = 3, hoà = `settings.drawPoints` (0 hoặc 1), thua = 0. BYE/forfeit thắng được 3 điểm; trận forfeited của người bỏ cuộc tính loss, không tạo trận ảo cho đối thủ nếu có thể gây double count.
- Thứ tự: (1) points, (2) head-to-head points trong nhóm người đang bằng điểm, (3) point difference (`pointsFor - pointsAgainst`), (4) Buchholz/SOS (tổng điểm đối thủ), (5) số wins, (6) seed thấp hơn, (7) random deterministic draw được công bố trước. Nếu H2H không tạo thứ tự hoàn chỉnh (tie nhiều người/ chưa gặp nhau), bỏ qua H2H và tiếp tục tie-break.
- `standings` nên tính lại từ completed matches rồi reconcile stats; không chỉ tin counters. Cache counters phục vụ đọc nhanh nhưng phải rebuild được.
- HOST-REPORTED result cần lưu `source`, timestamp, lý do; endpoint correction phải recompute standings, qualification và bracket downstream.

### 2.2 Round-robin (circle method)

- Với `N` người, nếu N lẻ thêm một BYE giả để thành `M=N+1`. Có `M-1` rounds, mỗi round `M/2` pairings; mỗi cặp người thật gặp đúng một lần. Tránh ghép một người với chính mình.
- Circle method: giữ một slot cố định, xoay các slot còn lại mỗi round; map slot thành participant seed. Mỗi round đánh dấu `roundNumber` và tạo match; pairing màu đỏ/đen luân phiên hoặc random có seed cố định để cân bằng màu.
- BYE của người thật tạo `BYE` match và auto-result chỉ nếu chính sách cho phép; phân bổ BYE đều, ưu tiên người chưa BYE và seed thấp/đã xác định deterministic.
- Với round-robin toàn giải, standings chỉ complete khi toàn bộ `N*(N-1)/2` cặp đã có terminal result. Chỉ cho FINISHED khi đủ lịch hoặc host dùng force-finish với lý do.

### 2.3 Group stage và group-size strategy

Mục tiêu là nhóm có kích thước gần nhau, không tạo group 1 người và không dùng power-of-two constraint cho group stage.

- Nếu host chọn `groupCount=G`, validate `2 <= G <= floor(N/2)` và `N/G` hợp lệ. Chọn `G` sao cho group size nằm trong khoảng 4–8 (configurable), độ lệch size tối đa 1; `N mod G` nhóm có `ceil(N/G)`, còn lại `floor(N/G)`.
- Nếu host chọn target size `S`, tính `G=round(N/S)` rồi clamp; fallback enumerate các G hợp lệ và chọn tuple tối ưu: min chênh lệch group size, ưu tiên không có nhóm <4, sau đó ít groups hơn để giảm số trận.
- Ví dụ: 5 người không nên chia bảng (một bảng 5) hoặc yêu cầu tối thiểu; 6 = một bảng 6 hoặc 2 bảng 3 chỉ khi policy cho phép. 7 = một bảng 7; 8 = 2 bảng 4; 10 = 2 bảng 5; 12 = 2 bảng 6/3 bảng 4; 14 = 2 bảng 7; 15 = 3 bảng 5. Nếu N quá nhỏ so với minimum, giải chuyển về ROUND_ROBIN hoặc host không thể start.
- Chia seed snake/draft: sort theo seed/ELO snapshot, phân bổ A→B→C rồi quay ngược C→B→A để mạnh không dồn một bảng; hoặc random public seed trước start. Công bố seed và bảng trước khi match bắt đầu.
- Trong mỗi bảng dùng circle method riêng. Nếu bảng lẻ, thêm BYE và áp dụng phân bổ BYE công bằng.

### 2.4 Chọn wildcard liên bảng

- Sau group stage, mặc định mỗi bảng lấy group winner. `wildcardCount` được chọn từ các người đứng thứ hạng tiếp theo cùng rank (thường hạng 2) để đủ số knockout.
- So sánh wildcard bằng đúng tuple công bố: points → point difference → Buchholz/SOS → wins → seed → deterministic random draw. Không dùng H2H giữa các bảng vì họ chưa gặp nhau.
- Nếu số group lẻ hoặc tổng group winners không tạo power-of-two, lấy wildcard theo bucket rank: ưu tiên rank 2 của mọi bảng; nếu còn thiếu, rank 3...; chỉ chọn người đủ số trận hợp lệ. Nếu không đủ người (withdraw/DQ), trao BYE ở bracket, không tự thay bằng người đã loại nếu policy không cho phép.
- Ghi `qualificationReason` và snapshot standings tại thời điểm chốt để giải thích vì sao một người được wildcard.

### 2.5 Knockout bracket

- Tổng entrant cần là `2^k` cho bracket chuẩn. `bracketSize = nextPowerOfTwo(qualifiedCount)`; slot trống là BYE. Mục tiêu là tối thiểu số BYE và BYE không tạo hai lượt liên tiếp cho cùng player.
- Ghép group winners/wildcards theo seed và tránh tái đấu cùng bảng ở vòng đầu nếu còn khả năng. Mẫu: seed 1 vs seed cuối theo bracket placement; shuffle deterministic bằng tournament seed rồi đặt vào bracket cố định.
- Trận knockout hoàn thành mới promote winner vào `nextMatchId`; loser `ELIMINATED`; match mới chỉ chuyển READY khi cả hai nguồn đã có winner. Nếu một nguồn BYE/withdrawn, auto-advance và lưu provenance.
- Tie knockout: MVP không cho draw terminal; nếu game hòa, tạo rematch/decider theo chính sách (đổi màu), hoặc host quyết định chỉ khi luật công bố. BO3 là phase mở rộng, không trộn với match đơn.

### 2.6 Standing/leaderboard

API trả `rank`, player snapshot, group, played/W/D/L, points, point diff, tie-break values, qualification/elimination status. Stable ordering bằng cùng comparator server/client; client không tự sort khác. Hiển thị provisional khi round chưa hoàn tất và khóa kết quả khi FINISHED.

## 3. Tournament Flow / State Machine

### 3.1 States và transition

- `DRAFT`: tạo xong, host sửa tên/thể lệ/settings, join link chưa public; host có thể cancel/delete nếu chưa có người khác.
- `OPEN`: host công bố/public; người chơi join bằng tên + deviceId, leave trước start; host có thể kick/close registration. Không đổi format/scoring sau khi có participant nếu không reset toàn bộ.
- `STARTED`: host bấm start; server chốt participant snapshot, seed/group, sinh tất cả group/round-robin matches hoặc phase đầu; chỉ server job/host result và match player actions được phép. Join mới bị khóa (trừ `allowLateJoin` trước phase lock, không khuyến nghị MVP).
- `FINISHED`: champion và final standings immutable read-only; chỉ support/admin có thể correction với audit. SSE/public detail vẫn hoạt động.
- `CANCELLED`: host hủy trước/đang giải khi không thể tiếp tục; lý do bắt buộc, không tạo winner.

Transitions được authorize theo `hostDeviceId` + server-side current version. Mọi transition dùng conditional update/transaction; retry cùng `Idempotency-Key` trả response cũ.

### 3.2 Match state và quyền

`SCHEDULED → READY → STARTED → COMPLETED`; `SCHEDULED → BYE`, và terminal `FORFEIT/CANCELLED`. Bất kỳ player của match chỉ được gọi start endpoint; nếu player1 đã claim, player2 vẫn có thể mở cùng room nhưng không tạo room thứ hai. Host không được “start thay player” trong MVP nếu chưa có policy rõ.

Nút “Bắt đầu trận” visible cho đúng hai device; visitor chỉ thấy “Theo dõi” sau khi game tồn tại. Trước khi game tồn tại, không expose private room URL. `spectate` phải check tournament/public setting; người khác chỉ read-only.

### 3.3 Edge cases và policy

- Không đủ người: không cho start dưới min; host có thể cancel hoặc chuyển round-robin theo policy trước start.
- Không join/đã đăng ký nhưng không active: registration deadline chốt; loại participant, regenerate chưa bắt đầu bracket hoặc cấp BYE/forfeit theo policy. Sau STARTED không âm thầm regenerate lịch đã công bố.
- Bỏ giải: trước start `WITHDRAWN`; group stage: các match chưa chơi thành forfeit/byes theo policy và không làm lại round; knockout: đối thủ auto-advance.
- No-show: sau grace period (ví dụ 10 phút hoặc host-configured), player còn lại có thể claim forfeit; cần evidence/timestamp và host override/audit.
- Game timeout/disconnect/resign: map từ `Game` sang tournament result, không tính hai lần. Offline host result có thể nhập score/result type và reason.
- Host mất kết nối: ownership vẫn ở deviceId; thêm transfer host chỉ trước STARTED, hoặc support/admin recovery. DeviceId đổi do clear storage là open risk cần login/claim flow.
- Hủy hoặc correction sau khi knockout đã advance: lock downstream, recalculate/undo với audit; MVP nên cấm correction sau vòng kế tiếp bắt đầu trừ admin.
- Duplicate requests, browser refresh, SSE reconnect, two players start đồng thời: transaction/unique constraints và idempotency bắt buộc.

## 4. API Routes

Tất cả route validate JSON, giới hạn payload, lấy `deviceId` từ header/body theo convention hiện tại, trả error code ổn định, không leak private room/game data. Tên có thể điều chỉnh theo router convention nhưng contract phải giữ.

### Core

- `POST /api/tournaments` — host tạo DRAFT; validate name, format, settings, min/max, time control; response tournament + host role.
- `GET /api/tournaments` — public list; filters status/format/date, pagination/cursor, search; không trả device IDs.
- `GET /api/tournaments/[id]` — detail/rules/registration state/current phase, participant count, schedule summary, viewer role.
- `PATCH /api/tournaments/[id]` — host-only settings/metadata khi DRAFT hoặc OPEN theo immutability rules; ghi audit.
- `POST /api/tournaments/[id]/open` — host publish DRAFT → OPEN; hoặc creation có `OPEN` option.
- `POST /api/tournaments/[id]/join` — `{ name }`; upsert Player theo deviceId, validate registration/cap/duplicate, create participant idempotently.
- `DELETE /api/tournaments/[id]/join` — player leave/withdraw trước lock.
- `GET /api/tournaments/[id]/participants` — paginated roster, status, group/seed khi đã start.
- `POST /api/tournaments/[id]/participants/[participantId]/withdraw` — self withdrawal; host kick/DQ variant với reason/audit.
- `POST /api/tournaments/[id]/start` — host-only; lock settings, validate participant/group sizing, generate matches atomically, DRAFT/OPEN → STARTED.
- `POST /api/tournaments/[id]/cancel` — host-only before/with explicit cancellation policy; reason required.

### Schedule, standings, bracket

- `GET /api/tournaments/[id]/matches` — filters phase/group/round/status/player, cursor pagination.
- `GET /api/tournaments/[id]/matches/[matchId]` — match detail, participants, eligibility, game/spectate state, schedule.
- `GET /api/tournaments/[id]/standings` — overall or `groupId`, provisional/official, stable tie-break fields.
- `GET /api/tournaments/[id]/bracket` — group stage tables + knockout tree; requirement nói “group stage only” nhưng nên trả phase-specific view và reject phase chưa start.
- `GET /api/tournaments/[id]/schedule` — calendar/round list, timezone-aware ISO timestamps.

### Match lifecycle

- `POST /api/tournaments/[id]/match/[matchId]/start` — chỉ player1/player2; idempotent; tạo private Room/Game hoặc trả existing `gameId/roomId`; enforce one game per match.
- `POST /api/tournaments/[id]/match/[matchId]/result` — host-only official/offline result; `{ winner, score, resultType, reason, expectedVersion }`; transaction updates match + participant stats + phase advancement + audit.
- `POST /api/tournaments/[id]/match/[matchId]/forfeit` — eligible player claim after grace period hoặc host; policy-dependent.
- `POST /api/tournaments/[id]/match/[matchId]/dispute` — player reports mismatch; locks/flags match for host review.
- `GET /api/tournaments/[id]/match/[matchId]/replay` — read-only Game moves when game exists.
- `GET /api/tournaments/[id]/audit` — host/support-only audit history; redact sensitive fields.

### Existing game integration

- Existing `/api/games/[roomId]` và `/stream`, `/move`, `/resign`, `/spectate` phải nhận tournament authorization metadata.
- `POST /api/tournaments/[id]/reconcile` — host/support/admin protected maintenance endpoint hoặc internal job; scan Game terminal states and repair missing match result idempotently, never trust arbitrary client result.
- SSE `/api/tournaments/[id]/stream` (khuyến nghị) — push participant count, match state, standings version, bracket updates; client reconnect phải lấy full snapshot trước khi apply events.

## 5. UI Pages

### `/tournaments`

Public discovery: cards tên/format/status/số người, time control, deadline, host, start time; tabs Đang mở/Sắp diễn ra/Đã kết thúc; search/filter/pagination; nút Tạo giải cho mọi device (server quyết định quyền theo MVP; nếu chỉ “một người có quyền”, cần admin/feature flag). Empty/error/loading states, share links, mobile-first.

### `/tournament/[id]` — trang chủ giải

- Header: tên, status badge, host, registration countdown, copy public link, join/leave/start/cancel buttons.
- Rules panel: thời gian ván, điểm thắng/hòa/thua, format, số bảng, số suất vào knockout, no-show/draw policy, timezone.
- Tabs: Tổng quan, Lịch đấu, Bảng xếp hạng, Bảng đấu, Bracket, Kết quả/Audit (host).
- Schedule rows có player, round/group, state, time, nút Bắt đầu trận; player đúng match thấy button, spectator thấy theo dõi; host thấy “Cập nhật kết quả”.
- Standings live/provisional với rank movement, tie-break explanation, group filter; knockout bracket responsive.
- Host controls cần confirm modal và reason: start, edit result, DQ, cancel; không cho client tự suy luận quyền.
- SSE/SWR refresh với optimistic UI chỉ cho join/leave; kết quả official hiển thị server version.

### `/tournament/[id]/join`

Form tên 2–16 ký tự, hiển thị quy tắc, consent “tên sẽ hiển thị công khai”, trạng thái full/deadline/đã tham gia; gọi join idempotently, lưu tên hiện tại theo convention localStorage rồi redirect về detail. Chống spam/rate limit và normalize Unicode.

### `/tournament/[id]/match/[matchId]/play`

Pre-match authorization/loading; nếu viewer là một trong hai player thì nút start và redirect tới `/game/[roomId]` sau khi server cấp room. Nếu game đã started redirect ngay. Nếu viewer khác hoặc player chưa claim, hiển thị lịch và “Theo dõi” read-only. Nếu game finished hiển thị result/replay.

### Reuse existing game page

`/game/[roomId]` cần banner tournament context, label round/group, không cho người ngoài move, hiển thị “official result do host”, và link quay lại tournament. Mobile board/timer/chat giữ nguyên; spectator chat policy kế thừa settings.

### Accessibility, localization, responsive

Dùng component hiện có, keyboard-accessible buttons/tabs, color không phải tín hiệu duy nhất, Vietnamese-first labels và translation keys cho English/Chinese tối thiểu. Bracket có horizontal scroll/zoom trên mobile, standings có sticky player column; announcement cho state changes.

## 6. Additional Features đề xuất (commercial-ready)

1. **Banner/cover và branding:** ảnh cover, logo, màu giải, OG/share card; upload validation và CDN storage.
2. **Public share link + QR:** link chỉ xem, QR cho join; phân biệt invite/private token và public listing.
3. **Registration deadline, scheduled start, waitlist:** auto-close, cap, promote waitlist theo thứ tự, nhắc trước giờ.
4. **Notifications:** in-app/SSE và optional browser/email/Telegram cho match sắp đến, result, opponent start, wildcard/knockout qualification.
5. **Tournament chat/announcements:** host announcements, moderated chat, mute/report, rate limit; tách khỏi game chat.
6. **Dispute workflow và audit:** player appeal window, host decision, admin escalation, immutable event history, export CSV/JSON.
7. **Replays và statistics:** replay link, moves, time usage, game count, export standings; retention policy tránh tốn MongoDB.
8. **Prize/payout metadata:** giải thưởng, sponsor, eligibility, terms; chỉ hiển thị ở MVP, payment/payout cần legal/compliance riêng.
9. **Byes và multi-format roadmap:** Swiss để scale số người, double elimination, BO3; feature flags và rulesVersion để không phá bracket cũ.
10. **Abuse/security controls:** rate limit, device fingerprint signals, duplicate-name warning, host transfer/admin moderation, anti-collusion flags (cùng IP/device pattern) nhưng không tự ban không có review.

## 7. Implementation Phases

### Phase 1 — Schema + create/join/start

- **Deliverables:** model/interfaces cho Tournament, Participant, Match, Audit; indexes/validation; create/list/detail/join/open/start; deviceId auth, idempotency, server state machine; tests transaction/duplicate join.
- **Acceptance:** host tạo DRAFT và publish OPEN; player join/leave đúng cap; không đổi setting locked; start dưới min bị chặn; start đồng thời chỉ tạo một bracket/version.
- **Effort:** 4–6 engineer-days + 2–3 QA-days.

### Phase 2 — Round-robin + basic UI

- **Deliverables:** circle-method generator, odd BYE, standings/tie-break, match list, start-match private room/game integration, player/spectator authorization, result reconciliation.
- **Acceptance:** N=2..15 tạo đúng số cặp (`N*(N-1)/2`), không duplicate/self-match; hai player start cùng lúc không tạo duplicate Game; game result cập nhật standings một lần; visitor chỉ spectate.
- **Effort:** 6–9 engineer-days + 4 QA-days.

### Phase 3 — Group stage + knockout

- **Deliverables:** group-size solver, seeded distribution, per-group round-robin, wildcard comparator, power-of-two bracket with byes, advancement/withdrawal/correction policies.
- **Acceptance:** test matrices N=4..64, group size 3/4/5/6/7/8, odd groups, missing players, all wildcard tie-breaks; bracket provenance và auto-advance đúng.
- **Effort:** 8–12 engineer-days + 5 QA-days.

### Phase 4 — Tournament page + bracket view

- **Deliverables:** `/tournaments`, detail/join/match play pages; rules/schedule/standings/group/bracket tabs; host result modal/audit; SSE/SWR cache/reconnect; mobile/a11y/localization.
- **Acceptance:** end-to-end join → start → play/spectate → finish → standings/bracket; responsive mobile; permission states không leak room; UI hiển thị provisional/official nhất quán.
- **Effort:** 8–12 engineer-days + 5 QA-days.

### Phase 5 — Polish, reliability, launch

- **Deliverables:** rate limits, notifications, share/QR, dispute/admin tools, observability, reconciliation cron, load/security tests, analytics, copy/localization, runbook.
- **Acceptance:** load test bracket/standings/SSE; recover Mongo/network/browser refresh; audit every host mutation; no unresolved P0/P1; staged rollout/feature flag and rollback plan.
- **Effort:** 6–10 engineer-days + 5 QA/release-days.

## 8. Risks & Open Questions

### Risks

- DeviceId-only identity dễ mất quyền khi clear storage, spoof nhiều device hoặc tạo nhiều account; host ownership và prize money không an toàn nếu không có login/verified claim.
- Embed references và counters dễ lệch khi race/timeout/offline host result; phải có transaction, version, audit và reconciliation.
- MongoDB document giới hạn kích thước nếu lưu toàn bộ participant/match/chat; dùng collections riêng, projection và pagination.
- Bracket correction sau khi vòng kế tiếp chạy có thể thay đổi người thắng đã công bố; cần lock window và admin override.
- Time zones, server clock, no-show grace và offline result dễ gây tranh chấp; server time + policy/visible countdown bắt buộc.
- SSE reconnect và nhiều tab có thể hiển thị stale data; event version + snapshot resync.
- Public tournament có thể bị spam join/chat hoặc host lạm quyền sửa kết quả; rate limiting, audit, dispute và moderation.
- Group wildcard khi thiếu/withdraw participant có thể tạo bracket không công bằng; snapshot qualification và công bố fallback trước start.

### Cần người dùng/Product xác nhận

1. “1 người có quyền tạo giải” nghĩa là **mọi player được tạo một giải**, hay chỉ admin/whitelisted host được tạo? Có cần approval, giới hạn số giải hoặc quota không?
2. Có cần account/login để giữ quyền host, hay chấp nhận mất quyền khi đổi device/browser? Có muốn transfer host trước khi start không?
3. `Hoà có tính 1 điểm hay không` là 0/1 điểm cho mỗi người; thắng có cố định 3 điểm hay muốn 2-1-0/1-0? Match knockout hòa xử lý rematch, sudden-death hay host quyết định?
4. Time control là phút mỗi bên kiểu hiện tại, có increment/delay không? Có grace period/no-show bao nhiêu phút và timezone nào cho lịch?
5. Group stage tối thiểu bao nhiêu người một bảng? Với 5/6/7 người muốn một bảng round-robin hay bắt buộc group stage? Cho phép group size 3 không?
6. Group knockout mặc định mỗi bảng lấy bao nhiêu người; wildcard ưu tiên rank 2 hay có luật cố định (ví dụ 8/16 người knockout)? Có muốn tránh tái đấu cùng bảng ở vòng đầu không?
7. Tournament có tính vào ELO/stat Player hiện tại không, hay chỉ là điểm giải? Nếu tính, host-reported/offline result có được tính ranked không?
8. Ai được sửa kết quả và trong thời hạn bao lâu? Player có được dispute không; correction sau khi bracket đã advance có bị cấm không?
9. Người chơi bỏ cuộc/no-show xử lý bằng forfeit, bỏ toàn bộ kết quả của họ, hay giữ kết quả đã chơi? Late join có được phép không?
10. Người ngoài có được xem mọi trận và chat không? Có tournament private/invite-only, passcode, unlisted link không?
11. MVP cần scheduled start/notification/prize/banners ngay hay để Phase 5? Prize có tiền thật cần legal/KYC/payout owner nào?
12. Giới hạn quy mô mục tiêu (người/tournament đồng thời, trận/ngày) là bao nhiêu để chọn pagination, background job và SSE fan-out phù hợp?
13. Tournament có cần nhiều host/moderator, admin recovery và audit export không?
14. Có cần các format Swiss/double-elimination/BO3 trong roadmap gần, để tránh khóa schema hiện tại vào single-elimination không?
