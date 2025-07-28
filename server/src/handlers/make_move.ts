
import { db } from '../db';
import { gamesTable, movesTable, playersTable } from '../db/schema';
import { type MakeMoveInput, type Game, type ChessPiece, type Position } from '../schema';
import { eq, and } from 'drizzle-orm';

// Standard chess starting position
const getInitialBoard = (): ChessPiece[] => [
  // White pieces
  { type: 'rook', color: 'white', position: { file: 'a', rank: 1 }, has_moved: false },
  { type: 'knight', color: 'white', position: { file: 'b', rank: 1 }, has_moved: false },
  { type: 'bishop', color: 'white', position: { file: 'c', rank: 1 }, has_moved: false },
  { type: 'queen', color: 'white', position: { file: 'd', rank: 1 }, has_moved: false },
  { type: 'king', color: 'white', position: { file: 'e', rank: 1 }, has_moved: false },
  { type: 'bishop', color: 'white', position: { file: 'f', rank: 1 }, has_moved: false },
  { type: 'knight', color: 'white', position: { file: 'g', rank: 1 }, has_moved: false },
  { type: 'rook', color: 'white', position: { file: 'h', rank: 1 }, has_moved: false },
  ...Array.from({ length: 8 }, (_, i) => ({
    type: 'pawn' as const,
    color: 'white' as const,
    position: { file: String.fromCharCode(97 + i) as any, rank: 2 },
    has_moved: false
  })),
  // Black pieces
  { type: 'rook', color: 'black', position: { file: 'a', rank: 8 }, has_moved: false },
  { type: 'knight', color: 'black', position: { file: 'b', rank: 8 }, has_moved: false },
  { type: 'bishop', color: 'black', position: { file: 'c', rank: 8 }, has_moved: false },
  { type: 'queen', color: 'black', position: { file: 'd', rank: 8 }, has_moved: false },
  { type: 'king', color: 'black', position: { file: 'e', rank: 8 }, has_moved: false },
  { type: 'bishop', color: 'black', position: { file: 'f', rank: 8 }, has_moved: false },
  { type: 'knight', color: 'black', position: { file: 'g', rank: 8 }, has_moved: false },
  { type: 'rook', color: 'black', position: { file: 'h', rank: 8 }, has_moved: false },
  ...Array.from({ length: 8 }, (_, i) => ({
    type: 'pawn' as const,
    color: 'black' as const,
    position: { file: String.fromCharCode(97 + i) as any, rank: 7 },
    has_moved: false
  }))
];

const positionsEqual = (pos1: Position, pos2: Position): boolean => {
  return pos1.file === pos2.file && pos1.rank === pos2.rank;
};

const getPieceAt = (board: ChessPiece[], position: Position): ChessPiece | null => {
  return board.find(piece => positionsEqual(piece.position, position)) || null;
};

const isValidMove = (piece: ChessPiece, from: Position, to: Position, board: ChessPiece[]): boolean => {
  const fileDiff = to.file.charCodeAt(0) - from.file.charCodeAt(0);
  const rankDiff = to.rank - from.rank;
  const targetPiece = getPieceAt(board, to);

  // Can't capture own piece
  if (targetPiece && targetPiece.color === piece.color) {
    return false;
  }

  switch (piece.type) {
    case 'pawn':
      const direction = piece.color === 'white' ? 1 : -1;
      const startRank = piece.color === 'white' ? 2 : 7;
      
      // Forward move
      if (fileDiff === 0) {
        if (targetPiece) return false; // Can't capture forward
        if (rankDiff === direction) return true; // One square forward
        if (from.rank === startRank && rankDiff === 2 * direction && !getPieceAt(board, to)) {
          return true; // Two squares from start
        }
      }
      // Diagonal capture
      if (Math.abs(fileDiff) === 1 && rankDiff === direction && targetPiece) {
        return true;
      }
      return false;

    case 'rook':
      if (fileDiff === 0 || rankDiff === 0) {
        return !isPathBlocked(from, to, board);
      }
      return false;

    case 'knight':
      return (Math.abs(fileDiff) === 2 && Math.abs(rankDiff) === 1) ||
             (Math.abs(fileDiff) === 1 && Math.abs(rankDiff) === 2);

    case 'bishop':
      if (Math.abs(fileDiff) === Math.abs(rankDiff)) {
        return !isPathBlocked(from, to, board);
      }
      return false;

    case 'queen':
      if (fileDiff === 0 || rankDiff === 0 || Math.abs(fileDiff) === Math.abs(rankDiff)) {
        return !isPathBlocked(from, to, board);
      }
      return false;

    case 'king':
      return Math.abs(fileDiff) <= 1 && Math.abs(rankDiff) <= 1;

    default:
      return false;
  }
};

const isPathBlocked = (from: Position, to: Position, board: ChessPiece[]): boolean => {
  const fileDiff = to.file.charCodeAt(0) - from.file.charCodeAt(0);
  const rankDiff = to.rank - from.rank;
  
  const fileStep = fileDiff === 0 ? 0 : fileDiff / Math.abs(fileDiff);
  const rankStep = rankDiff === 0 ? 0 : rankDiff / Math.abs(rankDiff);
  
  let currentFile = from.file.charCodeAt(0) + fileStep;
  let currentRank = from.rank + rankStep;
  
  while (currentFile !== to.file.charCodeAt(0) || currentRank !== to.rank) {
    const checkPos: Position = {
      file: String.fromCharCode(currentFile),
      rank: currentRank
    };
    
    if (getPieceAt(board, checkPos)) {
      return true; // Path is blocked
    }
    
    currentFile += fileStep;
    currentRank += rankStep;
  }
  
  return false;
};

const isInCheck = (board: ChessPiece[], color: 'white' | 'black'): boolean => {
  const king = board.find(piece => piece.type === 'king' && piece.color === color);
  if (!king) return false;
  
  const enemyPieces = board.filter(piece => piece.color !== color);
  
  return enemyPieces.some(piece => 
    isValidMove(piece, piece.position, king.position, board)
  );
};

const createMoveNotation = (piece: ChessPiece, from: Position, to: Position, captured: boolean): string => {
  const pieceSymbol = piece.type === 'pawn' ? '' : piece.type.charAt(0).toUpperCase();
  const captureSymbol = captured ? 'x' : '';
  return `${pieceSymbol}${from.file}${from.rank}${captureSymbol}${to.file}${to.rank}`;
};

export const makeMove = async (input: MakeMoveInput): Promise<Game> => {
  try {
    // Get game data
    const games = await db.select()
      .from(gamesTable)
      .where(eq(gamesTable.id, input.game_id))
      .execute();

    if (games.length === 0) {
      throw new Error('Game not found');
    }

    const gameData = games[0];
    const board = gameData.board_state as ChessPiece[] || getInitialBoard();
    const moveHistory = gameData.move_history as string[] || [];

    // Validate game is active
    if (gameData.status !== 'active') {
      throw new Error('Game is not active');
    }

    // Validate player is in the game
    const isWhitePlayer = gameData.white_player_id === input.player_id;
    const isBlackPlayer = gameData.black_player_id === input.player_id;
    
    if (!isWhitePlayer && !isBlackPlayer) {
      throw new Error('Player not in this game');
    }

    // Determine player color and validate turn
    const playerColor = isWhitePlayer ? 'white' : 'black';
    if (gameData.current_turn !== playerColor) {
      throw new Error('Not your turn');
    }

    // Find the piece to move
    const piece = getPieceAt(board, input.from_position);
    if (!piece) {
      throw new Error('No piece at source position');
    }

    if (piece.color !== playerColor) {
      throw new Error('Cannot move opponent piece');
    }

    // Validate move is legal
    if (!isValidMove(piece, input.from_position, input.to_position, board)) {
      throw new Error('Invalid move');
    }

    // Handle pawn promotion validation early
    if (piece.type === 'pawn' && 
        ((piece.color === 'white' && input.to_position.rank === 8) ||
         (piece.color === 'black' && input.to_position.rank === 1))) {
      if (!input.promotion_piece) {
        throw new Error('Pawn promotion requires promotion piece');
      }
    }

    // Check if move would leave king in check (simplified validation)
    const targetPiece = getPieceAt(board, input.to_position);
    const newBoard = board.filter(p => !positionsEqual(p.position, input.to_position));
    const pieceIndex = newBoard.findIndex(p => p === piece);
    newBoard[pieceIndex] = {
      ...piece,
      position: input.to_position,
      has_moved: true
    };

    if (isInCheck(newBoard, playerColor)) {
      throw new Error('Move would leave king in check');
    }

    // Handle pawn promotion
    let finalPiece = { ...piece, position: input.to_position, has_moved: true };
    if (piece.type === 'pawn' && 
        ((piece.color === 'white' && input.to_position.rank === 8) ||
         (piece.color === 'black' && input.to_position.rank === 1))) {
      finalPiece.type = input.promotion_piece!; // We already validated it exists
    }

    // Update board state
    const updatedBoard = board
      .filter(p => !positionsEqual(p.position, input.from_position) && 
                   !positionsEqual(p.position, input.to_position))
      .concat([finalPiece]);

    // Create move notation
    const notation = createMoveNotation(piece, input.from_position, input.to_position, !!targetPiece);
    const updatedMoveHistory = [...moveHistory, notation];

    // Check if opponent is in check
    const nextTurn = playerColor === 'white' ? 'black' : 'white';
    const opponentInCheck = isInCheck(updatedBoard, nextTurn);

    // Update game in database
    const updatedGame = await db.update(gamesTable)
      .set({
        current_turn: nextTurn,
        board_state: updatedBoard,
        move_history: updatedMoveHistory,
        in_check: opponentInCheck ? nextTurn : null,
        updated_at: new Date()
      })
      .where(eq(gamesTable.id, input.game_id))
      .returning()
      .execute();

    // Record the move
    await db.insert(movesTable)
      .values({
        game_id: input.game_id,
        player_id: input.player_id,
        from_position: input.from_position,
        to_position: input.to_position,
        piece_type: piece.type,
        piece_color: piece.color,
        captured_piece: targetPiece,
        is_castling: false, // Simplified - no castling logic yet
        is_en_passant: false, // Simplified - no en passant logic yet
        promotion_piece: input.promotion_piece || null,
        notation
      })
      .execute();

    const result = updatedGame[0];
    return {
      ...result,
      board_state: result.board_state as ChessPiece[],
      move_history: result.move_history as string[]
    };

  } catch (error) {
    console.error('Move failed:', error);
    throw error;
  }
};
