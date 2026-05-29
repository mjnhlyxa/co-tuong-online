import { Board, Piece, Color, PieceType, BOARD_ROWS, BOARD_COLS, RIVER_ROW, RED_PALACE, BLACK_PALACE, Position, Move, MoveRecord, GameState } from './types';

// Create initial board setup for Vietnamese Chess
export function createInitialBoard(): Board {
  const board: Board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));

  // Helper to create pieces
  const piece = (type: PieceType, color: Color): Piece => ({ type, color });

  // Red pieces (top, rows 0-4)
  // Back row - Chariots at corners
  board[0][0] = piece('chariot', 'red');
  board[0][8] = piece('chariot', 'red');

  // Horses at inner corners
  board[0][1] = piece('horse', 'red');
  board[0][7] = piece('horse', 'red');

  // Elephants next to horses
  board[0][2] = piece('elephant', 'red');
  board[0][6] = piece('elephant', 'red');

  // Advisors next to General
  board[0][3] = piece('advisor', 'red');
  board[0][5] = piece('advisor', 'red');

  // General in center of palace
  board[0][4] = piece('general', 'red');

  // Cannons behind soldiers
  board[2][1] = piece('cannon', 'red');
  board[2][7] = piece('cannon', 'red');

  // Soldiers in front row
  board[3][0] = piece('soldier', 'red');
  board[3][2] = piece('soldier', 'red');
  board[3][4] = piece('soldier', 'red');
  board[3][6] = piece('soldier', 'red');
  board[3][8] = piece('soldier', 'red');

  // Black pieces (bottom, rows 5-9)
  // Back row - Chariots at corners
  board[9][0] = piece('chariot', 'black');
  board[9][8] = piece('chariot', 'black');

  // Horses at inner corners
  board[9][1] = piece('horse', 'black');
  board[9][7] = piece('horse', 'black');

  // Elephants next to horses
  board[9][2] = piece('elephant', 'black');
  board[9][6] = piece('elephant', 'black');

  // Advisors next to General
  board[9][3] = piece('advisor', 'black');
  board[9][5] = piece('advisor', 'black');

  // General in center of palace
  board[9][4] = piece('general', 'black');

  // Cannons behind soldiers
  board[7][1] = piece('cannon', 'black');
  board[7][7] = piece('cannon', 'black');

  // Soldiers in front row
  board[6][0] = piece('soldier', 'black');
  board[6][2] = piece('soldier', 'black');
  board[6][4] = piece('soldier', 'black');
  board[6][6] = piece('soldier', 'black');
  board[6][8] = piece('soldier', 'black');

  return board;
}

// Create initial game state
export function createInitialGameState(): GameState {
  return {
    board: createInitialBoard(),
    currentTurn: 0, // Red moves first
    moveHistory: [],
    players: [null, null],
    status: 'waiting',
    timeBanks: [300, 300], // 5 minutes each
    lastMove: null,
    checkPosition: null
  };
}

// Check if position is within board bounds
export function isValidPosition(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_ROWS && pos.col >= 0 && pos.col < BOARD_COLS;
}

// Check if position is within palace for given color
export function isInPalace(pos: Position, color: Color): boolean {
  if (color === 'red') {
    return pos.row >= RED_PALACE.minRow && pos.row <= RED_PALACE.maxRow &&
           pos.col >= RED_PALACE.minCol && pos.col <= RED_PALACE.maxCol;
  } else {
    return pos.row >= BLACK_PALACE.minRow && pos.row <= BLACK_PALACE.maxRow &&
           pos.col >= BLACK_PALACE.minCol && pos.col <= BLACK_PALACE.maxCol;
  }
}

// Check if position is across the river (for soldiers)
export function isAcrossRiver(pos: Position, color: Color): boolean {
  if (color === 'red') {
    return pos.row > RIVER_ROW;
  } else {
    return pos.row < BOARD_ROWS - 1 - RIVER_ROW;
  }
}

// Get piece at position
export function getPiece(board: Board, pos: Position): Piece | null {
  if (!isValidPosition(pos)) return null;
  return board[pos.row][pos.col];
}

// Check if a path is clear between two positions (excluding start and end)
export function isPathClear(board: Board, from: Position, to: Position): boolean {
  const dRow = Math.sign(to.row - from.row);
  const dCol = Math.sign(to.col - from.col);

  // Must be orthogonal or diagonal
  if (from.row !== to.row && from.col !== to.col) {
    // For horse and elephant moves, we check differently
    return false;
  }

  let r = from.row + dRow;
  let c = from.col + dCol;

  while (r !== to.row || c !== to.col) {
    if (board[r][c] !== null) {
      return false;
    }
    r += dRow;
    c += dCol;
  }

  return true;
}

// Count pieces between two positions (exclusive) - used for cannon
export function countPiecesBetween(board: Board, from: Position, to: Position): number {
  const dRow = Math.sign(to.row - from.row);
  const dCol = Math.sign(to.col - from.col);

  // Must be orthogonal
  if (from.row !== to.row && from.col !== to.col) {
    return -1;
  }

  let count = 0;
  let r = from.row + dRow;
  let c = from.col + dCol;

  while (r !== to.row || c !== to.col) {
    if (board[r][c] !== null) {
      count++;
    }
    r += dRow;
    c += dCol;
  }

  return count;
}

// Get valid moves for a piece at given position
export function getValidMoves(board: Board, pos: Position, onlyCaptures: boolean = false): Position[] {
  const piece = getPiece(board, pos);
  if (!piece) return [];

  const validMoves: Position[] = [];
  const addMove = (to: Position): boolean => {
    if (!isValidPosition(to)) return false;
    const target = getPiece(board, to);

    // Can't capture own piece
    if (target && target.color === piece.color) return false;

    // If only checking captures, skip non-captures
    if (onlyCaptures && !target) return false;

    validMoves.push(to);
    return true;
  };

  switch (piece.type) {
    case 'general':
      // Move one step orthogonally within palace
      const deltas = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dr, dc] of deltas) {
        const newPos = { row: pos.row + dr, col: pos.col + dc };
        if (isInPalace(newPos, piece.color)) {
          addMove(newPos);
        }
      }
      // Face-to-face rule: generals can face each other if no pieces between
      const opponentGeneralRow = piece.color === 'red' ? 9 : 0;
      if (pos.col === 4) {
        let count = 0;
        for (let r = pos.row + 1; r < BOARD_ROWS; r++) {
          const p = board[r][4];
          if (p) {
            if (p.type === 'general') {
              // Can move to opponent's general position if no pieces between
              if (count === 0) {
                addMove({ row: r, col: 4 });
              }
            }
            break;
          }
        }
      }
      break;

    case 'advisor':
      // Move one step diagonally within palace
      const advisorDeltas = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [dr, dc] of advisorDeltas) {
        const newPos = { row: pos.row + dr, col: pos.col + dc };
        if (isInPalace(newPos, piece.color)) {
          addMove(newPos);
        }
      }
      break;

    case 'elephant':
      // Move two steps diagonally, cannot cross river
      const elephantDeltas = [[2, 2], [2, -2], [-2, 2], [-2, -2]];
      const elephantBlockDeltas = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (let i = 0; i < elephantDeltas.length; i++) {
        const [dr, dc] = elephantDeltas[i];
        const [br, bc] = elephantBlockDeltas[i];
        const newPos = { row: pos.row + dr, col: pos.col + dc };
        const blockPos = { row: pos.row + br, col: pos.col + bc };

        // Elephant cannot cross river
        if (piece.color === 'red' && newPos.row <= RIVER_ROW) continue;
        if (piece.color === 'black' && newPos.row >= BOARD_ROWS - 1 - RIVER_ROW) continue;

        // Block cell must be empty
        if (!isValidPosition(blockPos) || board[blockPos.row][blockPos.col] !== null) continue;

        addMove(newPos);
      }
      break;

    case 'chariot':
      // Move any distance orthogonally
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (Math.abs(dr) + Math.abs(dc) !== 1) continue;
          for (let dist = 1; dist < Math.max(BOARD_ROWS, BOARD_COLS); dist++) {
            const newPos = { row: pos.row + dr * dist, col: pos.col + dc * dist };
            if (!addMove(newPos)) break;
            if (getPiece(board, newPos)) break; // Can capture but not go further
          }
        }
      }
      break;

    case 'horse':
      // Move one orthogonal then one diagonal (L-shape)
      const horseDeltas = [
        { leg: [-1, 0], dest: [-2, -1] },
        { leg: [-1, 0], dest: [-2, 1] },
        { leg: [1, 0], dest: [2, -1] },
        { leg: [1, 0], dest: [2, 1] },
        { leg: [0, -1], dest: [-1, -2] },
        { leg: [0, -1], dest: [1, -2] },
        { leg: [0, 1], dest: [-1, 2] },
        { leg: [0, 1], dest: [1, 2] }
      ];
      for (const { leg, dest } of horseDeltas) {
        const legPos = { row: pos.row + leg[0], col: pos.col + leg[1] };
        const newPos = { row: pos.row + dest[0], col: pos.col + dest[1] };

        // Leg cell must be empty
        if (!isValidPosition(legPos) || board[legPos.row][legPos.col] !== null) continue;

        addMove(newPos);
      }
      break;

    case 'cannon':
      // Move any distance orthogonally, capture requires exactly one screen piece
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (Math.abs(dr) + Math.abs(dc) !== 1) continue;
          for (let dist = 1; dist < Math.max(BOARD_ROWS, BOARD_COLS); dist++) {
            const newPos = { row: pos.row + dr * dist, col: pos.col + dc * dist };
            const target = getPiece(board, newPos);

            if (!target) {
              // Empty cell - can move through
              validMoves.push(newPos);
            } else {
              // Found a piece - check if we can capture
              const piecesBetween = countPiecesBetween(board, pos, newPos);
              if (piecesBetween === 1 && target.color !== piece.color) {
                validMoves.push(newPos);
              }
              break; // Can't go further in this direction
            }
          }
        }
      }
      break;

    case 'soldier':
      if (piece.color === 'red') {
        // Red soldier moves up (decreasing row)
        if (pos.row > 0) {
          // Forward move
          addMove({ row: pos.row - 1, col: pos.col });
        }
        // After crossing river, can also move sideways
        if (isAcrossRiver(pos, piece.color)) {
          if (pos.col > 0) addMove({ row: pos.row, col: pos.col - 1 });
          if (pos.col < BOARD_COLS - 1) addMove({ row: pos.row, col: pos.col + 1 });
        }
      } else {
        // Black soldier moves down (increasing row)
        if (pos.row < BOARD_ROWS - 1) {
          addMove({ row: pos.row + 1, col: pos.col });
        }
        // After crossing river, can also move sideways
        if (isAcrossRiver(pos, piece.color)) {
          if (pos.col > 0) addMove({ row: pos.row, col: pos.col - 1 });
          if (pos.col < BOARD_COLS - 1) addMove({ row: pos.row, col: pos.col + 1 });
        }
      }
      break;
  }

  return validMoves;
}

// Check if a move is valid
export function isValidMove(board: Board, from: Position, to: Position): boolean {
  const piece = getPiece(board, from);
  if (!piece) return false;

  const validMoves = getValidMoves(board, from);
  return validMoves.some(m => m.row === to.row && m.col === to.col);
}

// Make a move on the board (returns new board state)
export function makeMove(board: Board, move: Move): { newBoard: Board; captured: Piece | null } {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[move.from.row][move.from.col];

  newBoard[move.from.row][move.from.col] = null;
  const captured = newBoard[move.to.row][move.to.col];
  newBoard[move.to.row][move.to.col] = piece;

  return { newBoard, captured: captured || null };
}

// Find the general's position for a color
export function findGeneral(board: Board, color: Color): Position | null {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'general' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

// Check if a color's general is in check
export function isInCheck(board: Board, color: Color): Position | null {
  const generalPos = findGeneral(board, color);
  if (!generalPos) return null;

  const opponentColor = color === 'red' ? 'black' : 'red';

  // Check if any opponent piece can capture the general
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece && piece.color === opponentColor) {
        const captures = getValidMoves(board, { row, col }, true);
        if (captures.some(c => c.row === generalPos.row && c.col === generalPos.col)) {
          return generalPos;
        }
      }
    }
  }

  return null;
}

// Check if a color has any valid moves (for checkmate detection)
export function hasValidMoves(board: Board, color: Color): boolean {
  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const moves = getValidMoves(board, { row, col });
        if (moves.length > 0) {
          return true;
        }
      }
    }
  }
  return false;
}

// Check if a move would leave the general in check
export function isMoveLegal(board: Board, from: Position, to: Position, color: Color): boolean {
  const { newBoard } = makeMove(board, { from, to, piece: board[from.row][from.col]! });
  return !isInCheck(newBoard, color);
}

// Get all legal moves for a color
export function getLegalMoves(board: Board, color: Color): { from: Position; to: Position }[] {
  const legalMoves: { from: Position; to: Position }[] = [];

  for (let row = 0; row < BOARD_ROWS; row++) {
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const moves = getValidMoves(board, { row, col });
        for (const move of moves) {
          if (isMoveLegal(board, { row, col }, move, color)) {
            legalMoves.push({ from: { row, col }, to: move });
          }
        }
      }
    }
  }

  return legalMoves;
}

// Check for checkmate
export function isCheckmate(board: Board, color: Color): boolean {
  // First check if in check
  if (!isInCheck(board, color)) return false;

  // Then check if any legal move resolves the check
  return !hasValidMoves(board, color);
}

// Generate move notation
export function generateNotation(board: Board, move: Move): string {
  const piece = move.piece;
  const to = move.to;

  // Get column letter (1-9 from left to right)
  const colLetter = String(to.col + 1);

  // Get row number (1-10 from bottom to top, but Vietnamese notation is from top to bottom)
  // Red pieces count from row 0 (top), Black pieces count from row 9 (bottom)
  let rowNum: number;
  if (piece.color === 'red') {
    rowNum = 10 - to.row;
  } else {
    rowNum = to.row + 1;
  }

  return `${colLetter}${rowNum}`;
}
