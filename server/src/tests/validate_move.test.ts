
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { gamesTable, playersTable } from '../db/schema';
import { type MakeMoveInput, type ChessPiece } from '../schema';
import { validateMove } from '../handlers/validate_move';
import { eq } from 'drizzle-orm';

const testPlayer1 = {
  id: 'player1',
  username: 'testuser1'
};

const testPlayer2 = {
  id: 'player2',
  username: 'testuser2'
};

const initialBoardState: ChessPiece[] = [
  // White pieces
  { type: 'rook', color: 'white', position: { file: 'a', rank: 1 }, has_moved: false },
  { type: 'knight', color: 'white', position: { file: 'b', rank: 1 }, has_moved: false },
  { type: 'bishop', color: 'white', position: { file: 'c', rank: 1 }, has_moved: false },
  { type: 'queen', color: 'white', position: { file: 'd', rank: 1 }, has_moved: false },
  { type: 'king', color: 'white', position: { file: 'e', rank: 1 }, has_moved: false },
  { type: 'bishop', color: 'white', position: { file: 'f', rank: 1 }, has_moved: false },
  { type: 'knight', color: 'white', position: { file: 'g', rank: 1 }, has_moved: false },
  { type: 'rook', color: 'white', position: { file: 'h', rank: 1 }, has_moved: false },
  { type: 'pawn', color: 'white', position: { file: 'a', rank: 2 }, has_moved: false },
  { type: 'pawn', color: 'white', position: { file: 'b', rank: 2 }, has_moved: false },
  { type: 'pawn', color: 'white', position: { file: 'c', rank: 2 }, has_moved: false },
  { type: 'pawn', color: 'white', position: { file: 'd', rank: 2 }, has_moved: false },
  { type: 'pawn', color: 'white', position: { file: 'e', rank: 2 }, has_moved: false },
  { type: 'pawn', color: 'white', position: { file: 'f', rank: 2 }, has_moved: false },
  { type: 'pawn', color: 'white', position: { file: 'g', rank: 2 }, has_moved: false },
  { type: 'pawn', color: 'white', position: { file: 'h', rank: 2 }, has_moved: false },
  // Black pieces
  { type: 'rook', color: 'black', position: { file: 'a', rank: 8 }, has_moved: false },
  { type: 'knight', color: 'black', position: { file: 'b', rank: 8 }, has_moved: false },
  { type: 'bishop', color: 'black', position: { file: 'c', rank: 8 }, has_moved: false },
  { type: 'queen', color: 'black', position: { file: 'd', rank: 8 }, has_moved: false },
  { type: 'king', color: 'black', position: { file: 'e', rank: 8 }, has_moved: false },
  { type: 'bishop', color: 'black', position: { file: 'f', rank: 8 }, has_moved: false },
  { type: 'knight', color: 'black', position: { file: 'g', rank: 8 }, has_moved: false },
  { type: 'rook', color: 'black', position: { file: 'h', rank: 8 }, has_moved: false },
  { type: 'pawn', color: 'black', position: { file: 'a', rank: 7 }, has_moved: false },
  { type: 'pawn', color: 'black', position: { file: 'b', rank: 7 }, has_moved: false },
  { type: 'pawn', color: 'black', position: { file: 'c', rank: 7 }, has_moved: false },
  { type: 'pawn', color: 'black', position: { file: 'd', rank: 7 }, has_moved: false },
  { type: 'pawn', color: 'black', position: { file: 'e', rank: 7 }, has_moved: false },
  { type: 'pawn', color: 'black', position: { file: 'f', rank: 7 }, has_moved: false },
  { type: 'pawn', color: 'black', position: { file: 'g', rank: 7 }, has_moved: false },
  { type: 'pawn', color: 'black', position: { file: 'h', rank: 7 }, has_moved: false }
];

describe('validateMove', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let gameId: number;

  beforeEach(async () => {
    // Create players
    await db.insert(playersTable).values([testPlayer1, testPlayer2]).execute();

    // Create active game
    const gameResult = await db.insert(gamesTable).values({
      white_player_id: testPlayer1.id,
      black_player_id: testPlayer2.id,
      current_turn: 'white',
      status: 'active',
      board_state: initialBoardState,
      move_history: []
    }).returning().execute();

    gameId = gameResult[0].id;
  });

  it('should validate a legal pawn move', async () => {
    const input: MakeMoveInput = {
      game_id: gameId,
      player_id: testPlayer1.id,
      from_position: { file: 'e', rank: 2 },
      to_position: { file: 'e', rank: 4 }
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(true);
  });

  it('should reject move when game not found', async () => {
    const input: MakeMoveInput = {
      game_id: 99999,
      player_id: testPlayer1.id,
      from_position: { file: 'e', rank: 2 },
      to_position: { file: 'e', rank: 4 }
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Game not found');
  });

  it('should reject move when player not part of game', async () => {
    const input: MakeMoveInput = {
      game_id: gameId,
      player_id: 'unknown_player',
      from_position: { file: 'e', rank: 2 },
      to_position: { file: 'e', rank: 4 }
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Player is not part of this game');
  });

  it('should reject move when not player\'s turn', async () => {
    const input: MakeMoveInput = {
      game_id: gameId,
      player_id: testPlayer2.id, // Black player trying to move when it's white's turn
      from_position: { file: 'e', rank: 7 },
      to_position: { file: 'e', rank: 5 }
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Not your turn');
  });

  it('should reject move when no piece at source position', async () => {
    const input: MakeMoveInput = {
      game_id: gameId,
      player_id: testPlayer1.id,
      from_position: { file: 'e', rank: 4 }, // Empty square
      to_position: { file: 'e', rank: 5 }
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('No piece at source position');
  });

  it('should reject move when trying to move opponent\'s piece', async () => {
    const input: MakeMoveInput = {
      game_id: gameId,
      player_id: testPlayer1.id, // White player
      from_position: { file: 'e', rank: 7 }, // Black pawn
      to_position: { file: 'e', rank: 5 }
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Cannot move opponent\'s piece');
  });

  it('should reject move when trying to capture own piece', async () => {
    const input: MakeMoveInput = {
      game_id: gameId,
      player_id: testPlayer1.id,
      from_position: { file: 'd', rank: 1 }, // White queen
      to_position: { file: 'e', rank: 2 } // White pawn position
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Cannot capture your own piece');
  });

  it('should validate knight moves correctly', async () => {
    const input: MakeMoveInput = {
      game_id: gameId,
      player_id: testPlayer1.id,
      from_position: { file: 'b', rank: 1 }, // White knight
      to_position: { file: 'c', rank: 3 } // Valid L-shape move
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid knight move', async () => {
    const input: MakeMoveInput = {
      game_id: gameId,
      player_id: testPlayer1.id,
      from_position: { file: 'b', rank: 1 }, // White knight
      to_position: { file: 'c', rank: 4 } // Invalid move for knight (not L-shape, empty square)
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Knight must move in L-shape');
  });

  it('should reject rook move when path is blocked', async () => {
    const input: MakeMoveInput = {
      game_id: gameId,
      player_id: testPlayer1.id,
      from_position: { file: 'a', rank: 1 }, // White rook
      to_position: { file: 'a', rank: 3 } // Blocked by pawn at a2
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Path is blocked');
  });

  it('should reject pawn trying to capture forward', async () => {
    // Create a board state where there's a piece blocking the pawn's forward movement
    const modifiedBoardState = [...initialBoardState];
    modifiedBoardState.push({ type: 'pawn', color: 'black', position: { file: 'e', rank: 3 }, has_moved: false });

    await db.update(gamesTable)
      .set({ board_state: modifiedBoardState })
      .where(eq(gamesTable.id, gameId))
      .execute();

    const input: MakeMoveInput = {
      game_id: gameId,
      player_id: testPlayer1.id,
      from_position: { file: 'e', rank: 2 }, // White pawn
      to_position: { file: 'e', rank: 3 } // Blocked square
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Pawn cannot capture moving forward');
  });

  it('should validate pawn diagonal capture', async () => {
    // Create a board state with a black piece at d3 for white pawn to capture
    const modifiedBoardState = [...initialBoardState];
    modifiedBoardState.push({ type: 'pawn', color: 'black', position: { file: 'd', rank: 3 }, has_moved: false });

    await db.update(gamesTable)
      .set({ board_state: modifiedBoardState })
      .where(eq(gamesTable.id, gameId))
      .execute();

    const input: MakeMoveInput = {
      game_id: gameId,
      player_id: testPlayer1.id,
      from_position: { file: 'e', rank: 2 }, // White pawn
      to_position: { file: 'd', rank: 3 } // Diagonal capture
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(true);
  });

  it('should require promotion piece when pawn reaches back rank', async () => {
    // Create a minimal board state with white pawn at 7th rank and no obstruction
    const modifiedBoardState: ChessPiece[] = [
      { type: 'king', color: 'white', position: { file: 'a', rank: 1 }, has_moved: false },
      { type: 'king', color: 'black', position: { file: 'a', rank: 8 }, has_moved: false },
      { type: 'pawn', color: 'white', position: { file: 'e', rank: 7 }, has_moved: true }
    ];

    await db.update(gamesTable)
      .set({ board_state: modifiedBoardState })
      .where(eq(gamesTable.id, gameId))
      .execute();

    const input: MakeMoveInput = {
      game_id: gameId,
      player_id: testPlayer1.id,
      from_position: { file: 'e', rank: 7 },
      to_position: { file: 'e', rank: 8 }
      // Missing promotion_piece
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Promotion piece required');
  });

  it('should validate promotion with promotion piece', async () => {
    // Create a minimal board state with white pawn at 7th rank and no obstruction
    const modifiedBoardState: ChessPiece[] = [
      { type: 'king', color: 'white', position: { file: 'a', rank: 1 }, has_moved: false },
      { type: 'king', color: 'black', position: { file: 'a', rank: 8 }, has_moved: false },
      { type: 'pawn', color: 'white', position: { file: 'e', rank: 7 }, has_moved: true }
    ];

    await db.update(gamesTable)
      .set({ board_state: modifiedBoardState })
      .where(eq(gamesTable.id, gameId))
      .execute();

    const input: MakeMoveInput = {
      game_id: gameId,
      player_id: testPlayer1.id,
      from_position: { file: 'e', rank: 7 },
      to_position: { file: 'e', rank: 8 },
      promotion_piece: 'queen'
    };

    const result = await validateMove(input);
    expect(result.isValid).toBe(true);
  });
});
