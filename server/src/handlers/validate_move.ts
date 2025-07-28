
import { db } from '../db';
import { gamesTable, playersTable } from '../db/schema';
import { type MakeMoveInput, type Game, type ChessPiece, type Position } from '../schema';
import { eq } from 'drizzle-orm';

export async function validateMove(input: MakeMoveInput): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Get game from database
    const gameResult = await db.select()
      .from(gamesTable)
      .where(eq(gamesTable.id, input.game_id))
      .execute();

    if (gameResult.length === 0) {
      return { isValid: false, error: 'Game not found' };
    }

    const game = gameResult[0];
    
    // Check if game is active
    if (game.status !== 'active') {
      return { isValid: false, error: 'Game is not active' };
    }

    // Verify player is part of the game
    if (input.player_id !== game.white_player_id && input.player_id !== game.black_player_id) {
      return { isValid: false, error: 'Player is not part of this game' };
    }

    // Get player color
    const playerColor = input.player_id === game.white_player_id ? 'white' : 'black';

    // Check if it's the player's turn
    if (game.current_turn !== playerColor) {
      return { isValid: false, error: 'Not your turn' };
    }

    // Parse board state
    const boardState = game.board_state as ChessPiece[];

    // Find piece at from position
    const piece = boardState.find(p => 
      p.position.file === input.from_position.file && 
      p.position.rank === input.from_position.rank
    );

    if (!piece) {
      return { isValid: false, error: 'No piece at source position' };
    }

    // Check if piece belongs to current player
    if (piece.color !== playerColor) {
      return { isValid: false, error: 'Cannot move opponent\'s piece' };
    }

    // Check if destination is within board bounds
    if (!isValidPosition(input.to_position)) {
      return { isValid: false, error: 'Invalid destination position' };
    }

    // Validate piece movement pattern FIRST
    const moveValidation = validatePieceMovement(piece, input.from_position, input.to_position, boardState);
    if (!moveValidation.isValid) {
      return { isValid: false, error: moveValidation.error };
    }

    // Check if there's a piece at destination
    const destinationPiece = boardState.find(p => 
      p.position.file === input.to_position.file && 
      p.position.rank === input.to_position.rank
    );

    // Cannot capture own piece
    if (destinationPiece && destinationPiece.color === playerColor) {
      return { isValid: false, error: 'Cannot capture your own piece' };
    }

    // Check for path obstruction (except knight)
    if (piece.type !== 'knight') {
      const pathValidation = validatePath(input.from_position, input.to_position, boardState);
      if (!pathValidation.isValid) {
        return { isValid: false, error: pathValidation.error };
      }
    }

    // Validate promotion requirements
    if (input.promotion_piece) {
      if (piece.type !== 'pawn') {
        return { isValid: false, error: 'Only pawns can be promoted' };
      }
      const isPromotionRank = (piece.color === 'white' && input.to_position.rank === 8) ||
                              (piece.color === 'black' && input.to_position.rank === 1);
      if (!isPromotionRank) {
        return { isValid: false, error: 'Promotion only allowed on back rank' };
      }
    }

    // For pawn promotion, check if promotion piece is required
    if (piece.type === 'pawn') {
      const isPromotionRank = (piece.color === 'white' && input.to_position.rank === 8) ||
                              (piece.color === 'black' && input.to_position.rank === 1);
      if (isPromotionRank && !input.promotion_piece) {
        return { isValid: false, error: 'Promotion piece required' };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('Move validation failed:', error);
    throw error;
  }
}

function isValidPosition(position: Position): boolean {
  return /^[a-h]$/.test(position.file) && position.rank >= 1 && position.rank <= 8;
}

function validatePieceMovement(
  piece: ChessPiece, 
  from: Position, 
  to: Position, 
  boardState: ChessPiece[]
): { isValid: boolean; error?: string } {
  const fileDiff = to.file.charCodeAt(0) - from.file.charCodeAt(0);
  const rankDiff = to.rank - from.rank;
  const absFileDiff = Math.abs(fileDiff);
  const absRankDiff = Math.abs(rankDiff);

  switch (piece.type) {
    case 'pawn':
      return validatePawnMovement(piece, from, to, boardState, fileDiff, rankDiff);
    
    case 'rook':
      if (fileDiff !== 0 && rankDiff !== 0) {
        return { isValid: false, error: 'Rook can only move horizontally or vertically' };
      }
      break;
    
    case 'knight':
      if (!((absFileDiff === 2 && absRankDiff === 1) || (absFileDiff === 1 && absRankDiff === 2))) {
        return { isValid: false, error: 'Knight must move in L-shape' };
      }
      break;
    
    case 'bishop':
      if (absFileDiff !== absRankDiff) {
        return { isValid: false, error: 'Bishop can only move diagonally' };
      }
      break;
    
    case 'queen':
      if (fileDiff !== 0 && rankDiff !== 0 && absFileDiff !== absRankDiff) {
        return { isValid: false, error: 'Queen can move horizontally, vertically, or diagonally' };
      }
      break;
    
    case 'king':
      if (absFileDiff > 1 || absRankDiff > 1) {
        return { isValid: false, error: 'King can only move one square' };
      }
      break;
  }

  return { isValid: true };
}

function validatePawnMovement(
  piece: ChessPiece, 
  from: Position, 
  to: Position, 
  boardState: ChessPiece[],
  fileDiff: number,
  rankDiff: number
): { isValid: boolean; error?: string } {
  const direction = piece.color === 'white' ? 1 : -1;
  const startRank = piece.color === 'white' ? 2 : 7;
  
  // Check if moving in correct direction
  if (Math.sign(rankDiff) !== direction && rankDiff !== 0) {
    return { isValid: false, error: 'Pawn cannot move backwards' };
  }

  // Forward movement
  if (fileDiff === 0) {
    // Single step forward
    if (rankDiff === direction) {
      const destinationPiece = boardState.find(p => 
        p.position.file === to.file && p.position.rank === to.rank
      );
      if (destinationPiece) {
        return { isValid: false, error: 'Pawn cannot capture moving forward' };
      }
      return { isValid: true };
    }
    
    // Double step from starting position
    if (rankDiff === 2 * direction && from.rank === startRank) {
      const destinationPiece = boardState.find(p => 
        p.position.file === to.file && p.position.rank === to.rank
      );
      if (destinationPiece) {
        return { isValid: false, error: 'Pawn cannot capture moving forward' };
      }
      return { isValid: true };
    }
    
    return { isValid: false, error: 'Invalid pawn forward movement' };
  }
  
  // Diagonal capture
  if (Math.abs(fileDiff) === 1 && rankDiff === direction) {
    const destinationPiece = boardState.find(p => 
      p.position.file === to.file && p.position.rank === to.rank
    );
    if (!destinationPiece) {
      return { isValid: false, error: 'Pawn can only move diagonally to capture' };
    }
    return { isValid: true };
  }
  
  return { isValid: false, error: 'Invalid pawn movement' };
}

function validatePath(
  from: Position, 
  to: Position, 
  boardState: ChessPiece[]
): { isValid: boolean; error?: string } {
  const fileDiff = to.file.charCodeAt(0) - from.file.charCodeAt(0);
  const rankDiff = to.rank - from.rank;
  
  const fileStep = fileDiff === 0 ? 0 : Math.sign(fileDiff);
  const rankStep = rankDiff === 0 ? 0 : Math.sign(rankDiff);
  
  let currentFile = from.file.charCodeAt(0) + fileStep;
  let currentRank = from.rank + rankStep;
  
  while (currentFile !== to.file.charCodeAt(0) || currentRank !== to.rank) {
    const currentPosition = {
      file: String.fromCharCode(currentFile),
      rank: currentRank
    };
    
    const pieceAtPosition = boardState.find(p => 
      p.position.file === currentPosition.file && 
      p.position.rank === currentPosition.rank
    );
    
    if (pieceAtPosition) {
      return { isValid: false, error: 'Path is blocked' };
    }
    
    currentFile += fileStep;
    currentRank += rankStep;
  }
  
  return { isValid: true };
}
