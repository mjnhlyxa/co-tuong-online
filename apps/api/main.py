from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import random
import string
from pymongo import MongoClient
import os

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL", "mongodb://10.60.184.61:27017")
client = MongoClient(MONGO_URL)
db = client["co_tuong_online"]

# Collections
rooms_collection = db["rooms"]
games_collection = db["games"]

# FastAPI app
app = FastAPI(title="Cờ Tướng Online API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Board constants
BOARD_ROWS = 10
BOARD_COLS = 9
RIVER_ROW = 4

RED_PALACE = {"minRow": 0, "maxRow": 2, "minCol": 3, "maxCol": 5}
BLACK_PALACE = {"minRow": 7, "maxRow": 9, "minCol": 3, "maxCol": 5}

# Piece types
PIECE_TYPES = ["general", "advisor", "elephant", "chariot", "horse", "cannon", "soldier"]


def generate_room_code():
    """Generate a unique 6-character room code"""
    chars = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choices(chars, k=6))
        if not rooms_collection.find_one({"code": code}):
            return code


def create_initial_board():
    """Create the initial Cờ Tướng board setup"""
    board = [[None for _ in range(BOARD_COLS)] for _ in range(BOARD_ROWS)]

    # Red pieces (top, rows 0-4)
    board[0][0] = {"type": "chariot", "color": "red"}
    board[0][8] = {"type": "chariot", "color": "red"}
    board[0][1] = {"type": "horse", "color": "red"}
    board[0][7] = {"type": "horse", "color": "red"}
    board[0][2] = {"type": "elephant", "color": "red"}
    board[0][6] = {"type": "elephant", "color": "red"}
    board[0][3] = {"type": "advisor", "color": "red"}
    board[0][5] = {"type": "advisor", "color": "red"}
    board[0][4] = {"type": "general", "color": "red"}
    board[2][1] = {"type": "cannon", "color": "red"}
    board[2][7] = {"type": "cannon", "color": "red"}
    board[3][0] = {"type": "soldier", "color": "red"}
    board[3][2] = {"type": "soldier", "color": "red"}
    board[3][4] = {"type": "soldier", "color": "red"}
    board[3][6] = {"type": "soldier", "color": "red"}
    board[3][8] = {"type": "soldier", "color": "red"}

    # Black pieces (bottom, rows 5-9)
    board[9][0] = {"type": "chariot", "color": "black"}
    board[9][8] = {"type": "chariot", "color": "black"}
    board[9][1] = {"type": "horse", "color": "black"}
    board[9][7] = {"type": "horse", "color": "black"}
    board[9][2] = {"type": "elephant", "color": "black"}
    board[9][6] = {"type": "elephant", "color": "black"}
    board[9][3] = {"type": "advisor", "color": "black"}
    board[9][5] = {"type": "advisor", "color": "black"}
    board[9][4] = {"type": "general", "color": "black"}
    board[7][1] = {"type": "cannon", "color": "black"}
    board[7][7] = {"type": "cannon", "color": "black"}
    board[6][0] = {"type": "soldier", "color": "black"}
    board[6][2] = {"type": "soldier", "color": "black"}
    board[6][4] = {"type": "soldier", "color": "black"}
    board[6][6] = {"type": "soldier", "color": "black"}
    board[6][8] = {"type": "soldier", "color": "black"}

    return board


def is_valid_position(row, col):
    return 0 <= row < BOARD_ROWS and 0 <= col < BOARD_COLS


def is_in_palace(row, col, color):
    if color == "red":
        return RED_PALACE["minRow"] <= row <= RED_PALACE["maxRow"] and RED_PALACE["minCol"] <= col <= RED_PALACE["maxCol"]
    else:
        return BLACK_PALACE["minRow"] <= row <= BLACK_PALACE["maxRow"] and BLACK_PALACE["minCol"] <= col <= BLACK_PALACE["maxCol"]


def is_across_river(row, color):
    if color == "red":
        return row > RIVER_ROW
    else:
        return row < BOARD_ROWS - 1 - RIVER_ROW


def get_piece(board, row, col):
    if not is_valid_position(row, col):
        return None
    return board[row][col]


def get_valid_moves(board, row, col, only_captures=False):
    """Get all valid moves for a piece at the given position"""
    piece = get_piece(board, row, col)
    if not piece:
        return []

    valid_moves = []
    color = piece["color"]
    ptype = piece["type"]

    def add_move(to_row, to_col):
        if not is_valid_position(to_row, to_col):
            return False
        target = get_piece(board, to_row, to_col)
        if target and target["color"] == color:
            return False
        if only_captures and not target:
            return False
        valid_moves.append({"row": to_row, "col": to_col})
        return True

    if ptype == "general":
        for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            new_row, new_col = row + dr, col + dc
            if is_in_palace(new_row, new_col, color):
                add_move(new_row, new_col)

    elif ptype == "advisor":
        for dr, dc in [(1, 1), (1, -1), (-1, 1), (-1, -1)]:
            new_row, new_col = row + dr, col + dc
            if is_in_palace(new_row, new_col, color):
                add_move(new_row, new_col)

    elif ptype == "elephant":
        for dr, dc in [(2, 2), (2, -2), (-2, 2), (-2, -2)]:
            new_row, new_col = row + dr, col + dc
            block_row, block_col = row + dr // 2, col + dc // 2

            if color == "red" and new_row <= RIVER_ROW:
                continue
            if color == "black" and new_row >= BOARD_ROWS - 1 - RIVER_ROW:
                continue

            if is_valid_position(block_row, block_col) and board[block_row][block_col] is None:
                add_move(new_row, new_col)

    elif ptype == "chariot":
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            for dist in range(1, max(BOARD_ROWS, BOARD_COLS)):
                new_row, new_col = row + dr * dist, col + dc * dist
                if not add_move(new_row, new_col):
                    break
                if get_piece(board, new_row, new_col):
                    break

    elif ptype == "horse":
        moves = [
            ([(-1, 0), (-2, -1)], (-2, -1)),
            ([(-1, 0), (-2, 1)], (-2, 1)),
            ([(1, 0), (2, -1)], (2, -1)),
            ([(1, 0), (2, 1)], (2, 1)),
            ([(0, -1), (-1, -2)], (-1, -2)),
            ([(0, -1), (1, -2)], (1, -2)),
            ([(0, 1), (-1, 2)], (-1, 2)),
            ([(0, 1), (1, 2)], (1, 2)),
        ]
        for (legs, dest) in moves:
            leg_row, leg_col = row + legs[0][0], col + legs[0][1]
            if is_valid_position(leg_row, leg_col) and board[leg_row][leg_col] is None:
                add_move(row + dest[0], col + dest[1])

    elif ptype == "cannon":
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            found_piece = False
            for dist in range(1, max(BOARD_ROWS, BOARD_COLS)):
                new_row, new_col = row + dr * dist, col + dc * dist
                if not is_valid_position(new_row, new_col):
                    break

                target = get_piece(board, new_row, new_col)
                if not found_piece:
                    if target is None:
                        valid_moves.append({"row": new_row, "col": new_col})
                    else:
                        found_piece = True
                else:
                    if target and target["color"] != color:
                        valid_moves.append({"row": new_row, "col": new_col})
                    break

    elif ptype == "soldier":
        if color == "red":
            if row > 0:
                add_move(row - 1, col)
            if is_across_river(row, color):
                if col > 0:
                    add_move(row, col - 1)
                if col < BOARD_COLS - 1:
                    add_move(row, col + 1)
        else:
            if row < BOARD_ROWS - 1:
                add_move(row + 1, col)
            if is_across_river(row, color):
                if col > 0:
                    add_move(row, col - 1)
                if col < BOARD_COLS - 1:
                    add_move(row, col + 1)

    return valid_moves


def find_general(board, color):
    for row in range(BOARD_ROWS):
        for col in range(BOARD_COLS):
            piece = board[row][col]
            if piece and piece["type"] == "general" and piece["color"] == color:
                return (row, col)
    return None


def is_in_check(board, color):
    general_pos = find_general(board, color)
    if not general_pos:
        return False

    opponent_color = "black" if color == "red" else "red"
    gen_row, gen_col = general_pos

    for row in range(BOARD_ROWS):
        for col in range(BOARD_COLS):
            piece = board[row][col]
            if piece and piece["color"] == opponent_color:
                captures = get_valid_moves(board, row, col, only_captures=True)
                if (gen_row, gen_col) in [(m["row"], m["col"]) for m in captures]:
                    return True

    return False


def is_move_legal(board, from_row, from_col, to_row, to_col, color):
    new_board = [row[:] for row in board]
    piece = new_board[from_row][from_col]
    new_board[from_row][from_col] = None
    new_board[to_row][to_col] = piece

    return not is_in_check(new_board, color)


def make_move_on_board(board, from_row, from_col, to_row, to_col):
    new_board = [row[:] for row in board]
    piece = new_board[from_row][from_col]
    captured = new_board[to_row][to_col]
    new_board[from_row][from_col] = None
    new_board[to_row][to_col] = piece
    return new_board, captured


def is_checkmate(board, color):
    if not is_in_check(board, color):
        return False

    for row in range(BOARD_ROWS):
        for col in range(BOARD_COLS):
            piece = board[row][col]
            if piece and piece["color"] == color:
                moves = get_valid_moves(board, row, col)
                for move in moves:
                    if is_move_legal(board, row, col, move["row"], move["col"], color):
                        return False
    return True


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_code: str):
        await websocket.accept()
        if room_code not in self.active_connections:
            self.active_connections[room_code] = []
        self.active_connections[room_code].append(websocket)

    def disconnect(self, websocket: WebSocket, room_code: str):
        if room_code in self.active_connections:
            self.active_connections[room_code].remove(websocket)

    async def broadcast(self, room_code: str, message: dict):
        if room_code in self.active_connections:
            for connection in self.active_connections[room_code]:
                try:
                    await connection.send_json(message)
                except:
                    pass


manager = ConnectionManager()


class CreateRoomRequest(BaseModel):
    name: str
    playerName: str
    isPrivate: bool = False


class JoinRoomRequest(BaseModel):
    playerName: str


class MoveRequest(BaseModel):
    playerId: str
    from_: dict
    to_: dict

    class Config:
        populate_by_name = True


@app.get("/")
async def root():
    return {"status": "ok", "message": "Cờ Tướng Online API"}


@app.get("/api/rooms")
async def get_rooms():
    rooms = list(rooms_collection.find({
        "status": "waiting",
        "isPrivate": False
    }).sort("createdAt", -1).limit(20))

    for room in rooms:
        room["_id"] = str(room["_id"])
        room["id"] = str(room["_id"])
        if "createdAt" in room:
            room["createdAt"] = room["createdAt"].isoformat()

    return {"success": True, "data": rooms}


@app.post("/api/rooms")
async def create_room(request: CreateRoomRequest):
    if not request.name.strip():
        return {"success": False, "error": "Tên phòng không được trống"}

    if len(request.name) > 50:
        return {"success": False, "error": "Tên phòng tối đa 50 ký tự"}

    player_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
    room_code = generate_room_code()

    room = {
        "code": room_code,
        "name": request.name.strip(),
        "status": "waiting",
        "players": [
            {
                "id": player_id,
                "name": request.playerName.strip() or f"Player_{player_id[:4]}",
                "color": "red",
                "isConnected": True
            },
            None
        ],
        "maxPlayers": 2,
        "isPrivate": request.isPrivate,
        "createdAt": datetime.utcnow()
    }

    rooms_collection.insert_one(room)

    return {
        "success": True,
        "data": {
            "room": {
                "id": str(room["_id"]),
                "code": room["code"],
                "name": room["name"],
                "status": room["status"],
                "players": room["players"],
                "maxPlayers": room["maxPlayers"],
                "isPrivate": room["isPrivate"],
                "createdAt": room["createdAt"].isoformat()
            },
            "playerId": player_id
        }
    }


@app.get("/api/rooms/{code}")
async def get_room(code: str):
    room = rooms_collection.find_one({"code": code.upper()})

    if not room:
        return {"success": False, "error": "Phòng không tồn tại"}

    room["id"] = str(room["_id"])
    room["createdAt"] = room["createdAt"].isoformat()

    return {"success": True, "data": room}


@app.post("/api/rooms/{code}/join")
async def join_room(code: str, request: JoinRoomRequest):
    room = rooms_collection.find_one({"code": code.upper()})

    if not room:
        return {"success": False, "error": "Phòng không tồn tại"}

    if room["status"] != "waiting":
        return {"success": False, "error": "Phòng đã bắt đầu chơi"}

    player_count = sum(1 for p in room["players"] if p is not None)
    if player_count >= room["maxPlayers"]:
        return {"success": False, "error": "Phòng đã đầy"}

    player_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=16))
    player_name = request.playerName.strip() or f"Player_{player_id[:4]}"

    black_slot = 1 if room["players"][0] else 0
    room["players"][black_slot] = {
        "id": player_id,
        "name": player_name,
        "color": "black",
        "isConnected": True
    }

    if all(p is not None for p in room["players"]):
        room["status"] = "playing"

        game = {
            "roomCode": room["code"],
            "board": create_initial_board(),
            "currentTurn": 0,
            "moveHistory": [],
            "players": room["players"],
            "status": "playing",
            "timeBanks": [300, 300],
            "lastMove": None,
            "checkPosition": None,
            "createdAt": datetime.utcnow()
        }
        games_collection.insert_one(game)

    rooms_collection.update_one(
        {"_id": room["_id"]},
        {"$set": {"players": room["players"], "status": room["status"]}}
    )

    return {
        "success": True,
        "data": {
            "room": {
                "id": str(room["_id"]),
                "code": room["code"],
                "name": room["name"],
                "status": room["status"],
                "players": room["players"],
                "maxPlayers": room["maxPlayers"],
                "isPrivate": room["isPrivate"],
                "createdAt": room["createdAt"].isoformat()
            },
            "playerId": player_id
        }
    }


@app.post("/api/rooms/{code}/leave")
async def leave_room(code: str, request: dict):
    player_id = request.get("playerId")
    if not player_id:
        return {"success": False, "error": "Thiếu playerId"}

    room = rooms_collection.find_one({"code": code.upper()})
    if not room:
        return {"success": False, "error": "Phòng không tồn tại"}

    for i, player in enumerate(room["players"]):
        if player and player["id"] == player_id:
            room["players"][i] = None
            break

    if all(p is None for p in room["players"]):
        rooms_collection.delete_one({"_id": room["_id"]})
    else:
        rooms_collection.update_one(
            {"_id": room["_id"]},
            {"$set": {"players": room["players"], "status": "waiting"}}
        )

    return {"success": True}


@app.get("/api/games/{code}")
async def get_game(code: str):
    game = games_collection.find_one({"roomCode": code.upper()})

    if not game:
        room = rooms_collection.find_one({"code": code.upper()})
        if room:
            return {
                "success": True,
                "data": {
                    "board": create_initial_board(),
                    "currentTurn": 0,
                    "moveHistory": [],
                    "players": room["players"],
                    "status": room["status"],
                    "timeBanks": [300, 300],
                    "lastMove": None,
                    "checkPosition": None
                }
            }
        return {"success": False, "error": "Không tìm thấy trò chơi"}

    game["_id"] = str(game["_id"])
    if "createdAt" in game:
        game["createdAt"] = game["createdAt"].isoformat()

    return {"success": True, "data": game}


@app.post("/api/games/{code}/move")
async def make_move(code: str, request: MoveRequest):
    player_id = request.playerId
    from_row = request.from_["row"]
    from_col = request.from_["col"]
    to_row = request.to_["row"]
    to_col = request.to_["col"]

    game = games_collection.find_one({"roomCode": code.upper()})

    if not game:
        return {"success": False, "error": "Không tìm thấy trò chơi"}

    if game["status"] != "playing":
        return {"success": False, "error": "Trò chơi đã kết thúc"}

    player_index = None
    for i, player in enumerate(game["players"]):
        if player and player["id"] == player_id:
            player_index = i
            break

    if player_index is None:
        return {"success": False, "error": "Người chơi không trong phòng"}

    if game["currentTurn"] != player_index:
        return {"success": False, "error": "Chưa đến lượt bạn"}

    piece = game["board"][from_row][from_col]
    if not piece:
        return {"success": False, "error": "Không có quân ở vị trí này"}

    if piece["color"] != ("red" if player_index == 0 else "black"):
        return {"success": False, "error": "Không thể di chuyển quân đối thủ"}

    valid_moves = get_valid_moves(game["board"], from_row, from_col)
    if not any(m["row"] == to_row and m["col"] == to_col for m in valid_moves):
        return {"success": False, "error": "Nước đi không hợp lệ"}

    color = piece["color"]
    if not is_move_legal(game["board"], from_row, from_col, to_row, to_col, color):
        return {"success": False, "error": "Nước đi không hợp lệ: Tướng vẫn đang bị chiếu"}

    new_board, captured = make_move_on_board(game["board"], from_row, from_col, to_row, to_col)

    game["board"] = new_board
    game["lastMove"] = {
        "from": {"row": from_row, "col": from_col},
        "to": {"row": to_row, "col": to_col},
        "piece": piece,
        "captured": captured
    }

    game["currentTurn"] = 1 - game["currentTurn"]

    move_record = {
        "moveNumber": len(game["moveHistory"]) + 1,
        "from": {"row": from_row, "col": from_col},
        "to": {"row": to_row, "col": to_col},
        "piece": piece,
        "captured": captured,
        "timestamp": datetime.utcnow().isoformat()
    }
    game["moveHistory"].append(move_record)

    opponent_color = "black" if color == "red" else "red"
    check_pos = None
    if is_in_check(new_board, opponent_color):
        check_row, check_col = find_general(new_board, opponent_color)
        if check_row is not None:
            check_pos = {"row": check_row, "col": check_col}
        game["checkPosition"] = check_pos

        if is_checkmate(new_board, opponent_color):
            game["status"] = "finished"
            game["result"] = {
                "winner": player_index,
                "reason": "checkmate"
            }
            rooms_collection.update_one(
                {"code": code.upper()},
                {"$set": {"status": "finished"}}
            )

    game["timeBanks"][player_index] = max(0, game["timeBanks"][player_index] - 2)

    games_collection.update_one(
        {"_id": game["_id"]},
        {"$set": game}
    )

    await manager.broadcast(code.upper(), {
        "type": "game_update",
        "data": game
    })

    return {"success": True, "data": game}


@app.post("/api/games/{code}/resign")
async def resign(code: str, request: dict):
    player_id = request.get("playerId")
    if not player_id:
        return {"success": False, "error": "Thiếu playerId"}

    game = games_collection.find_one({"roomCode": code.upper()})

    if not game:
        return {"success": False, "error": "Không tìm thấy trò chơi"}

    if game["status"] != "playing":
        return {"success": False, "error": "Trò chơi đã kết thúc"}

    player_index = None
    for i, player in enumerate(game["players"]):
        if player and player["id"] == player_id:
            player_index = i
            break

    if player_index is None:
        return {"success": False, "error": "Người chơi không trong phòng"}

    winner = 1 - player_index
    game["status"] = "finished"
    game["result"] = {
        "winner": winner,
        "reason": "resign"
    }

    games_collection.update_one(
        {"_id": game["_id"]},
        {"$set": game}
    )
    rooms_collection.update_one(
        {"code": code.upper()},
        {"$set": {"status": "finished"}}
    )

    await manager.broadcast(code.upper(), {
        "type": "game_over",
        "data": game
    })

    return {"success": True, "data": game}


@app.post("/api/games/{code}/rematch")
async def rematch(code: str, request: dict):
    player_id = request.get("playerId")
    if not player_id:
        return {"success": False, "error": "Thiếu playerId"}

    game = games_collection.find_one({"roomCode": code.upper()})

    if not game:
        return {"success": False, "error": "Không tìm thấy trò chơi"}

    room = rooms_collection.find_one({"code": code.upper()})
    if not room:
        return {"success": False, "error": "Phòng không tồn tại"}

    new_game = {
        "roomCode": room["code"],
        "board": create_initial_board(),
        "currentTurn": 0,
        "moveHistory": [],
        "players": room["players"],
        "status": "playing",
        "timeBanks": [300, 300],
        "lastMove": None,
        "checkPosition": None,
        "createdAt": datetime.utcnow()
    }
    games_collection.insert_one(new_game)

    rooms_collection.update_one(
        {"_id": room["_id"]},
        {"$set": {"status": "playing"}}
    )

    await manager.broadcast(code.upper(), {
        "type": "game_update",
        "data": new_game
    })

    return {"success": True, "data": new_game}


@app.websocket("/ws/{code}")
async def websocket_endpoint(websocket: WebSocket, code: str):
    await manager.connect(websocket, code.upper())

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, code.upper())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
