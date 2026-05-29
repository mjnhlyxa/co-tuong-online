# Cờ Tướng Online

An online Vietnamese Chess (Cờ Tướng) platform for real-time 1v1 matches.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python), MongoDB
- **Real-time**: WebSocket via FastAPI

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- MongoDB (running locally or at `10.60.184.61:27017`)

### Setup

1. **Start the API server**:
```bash
cd apps/api
pip install fastapi uvicorn pymongo python-multipart websockets
python3 main.py
```

2. **Start the web app**:
```bash
cd apps/web
npm install
npm run dev
```

3. Open http://localhost:3000

### Environment Variables

For `apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For `apps/api/.env`:
```
MONGO_URL=mongodb://10.60.184.61:27017
```

## Game Rules

Cờ Tướng is Vietnamese Chess with 7 piece types:
- **Tướng (General)**: Moves 1 orthogonal step within palace
- **Sĩ (Advisor)**: Moves 1 diagonal step within palace
- **Tượng (Elephant)**: Moves 2 diagonal steps, blocked by river
- **Xe (Chariot)**: Moves any distance orthogonally
- **Mã (Horse)**: Moves L-shape (1 orthogonal + 1 diagonal)
- **Pháo (Cannon)**: Moves orthogonally, captures with 1 screen piece
- **Tốt (Soldier)**: Forward 1 (sideways after crossing river)

## Features

- Anonymous play (no signup required)
- Room codes for easy sharing
- Real-time multiplayer with WebSocket
- Check/checkmate detection
- Move history
- Time banks per player
