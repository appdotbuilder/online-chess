
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { gamesTable, playersTable } from '../db/schema';
import { type MakeMoveInput, type ChessPiece } from '../schema';
import { makeMove } from '../handlers/make_move';
import { eq } from 'drizzle-orm';

// Test data
const whitePlayerId = 'white_player_123';
const blackPlayerId = 'black_player_456';

const testInput: MakeMoveInput = {
  game_id: 1,
  player_id: whitePlayerId,
  from_position: { file: 'e', rank: 2 },
  to_position: { file: 'e', rank: 4 }
};

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

describe('makeMove', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create test players
    await db.insert(playersTable)
      .values([
        { id: whitePlayerId, username: 'WhitePlayer' },
        { id: blackPlayerId, username: 'BlackPlayer' }
      ])
      .execute();

    // Create test game
    await db.insert(gamesTable)
      .values({
        id: 1,
        white_player_id: whitePlayerId,
        black_player_id: blackPlayerId,
        current_turn: 'white',
        status: 'active',
        board_state: getInitialBoard(),
        move_history: []
      })
      .execute();
  });

  it('should make a valid pawn move', async () => {
    const result = await makeMove(testInput);

    expect(result.id).toBe(1);
    expect(result.current_turn).toBe('black');
    expect(result.move_history).toHaveLength(1);
    expect(result.move_history[0]).toBe('e2e4');
    
    // Check that piece moved on board
    const movedPawn = result.board_state.find(piece => 
      piece.position.file === 'e' && piece.position.rank === 4
    );
    expect(movedPawn).toBeDefined();
    expect(movedPawn?.type).toBe('pawn');
    expect(movedPawn?.color).toBe('white');
    expect(movedPawn?.has_moved).toBe(true);

    // Check that old position is empty
    const oldPosition = result.board_state.find(piece => 
      piece.position.file === 'e' && piece.position.rank === 2
    );
    expect(oldPosition).toBeUndefined();
  });

  it('should reject move when not player turn', async () => {
    const blackMoveInput: MakeMoveInput = {
      ...testInput,
      player_id: blackPlayerId,
      from_position: { file: 'e', rank: 7 },
      to_position: { file: 'e', rank: 5 }
    };

    await expect(makeMove(blackMoveInput)).rejects.toThrow(/not your turn/i);
  });

  it('should reject invalid move', async () => {
    const invalidMoveInput: MakeMoveInput = {
      ...testInput,
      from_position: { file: 'e', rank: 2 },
      to_position: { file: 'e', rank: 5 } // Pawn can't move 3 squares
    };

    await expect(makeMove(invalidMoveInput)).rejects.toThrow(/invalid move/i);
  });

  it('should reject move of non-existent piece', async () => {
    const emptySquareInput: MakeMoveInput = {
      ...testInput,
      from_position: { file: 'e', rank: 3 }, // Empty square
      to_position: { file: 'e', rank: 4 }
    };

    await expect(makeMove(emptySquareInput)).rejects.toThrow(/no piece at source position/i);
  });

  it('should reject move of opponent piece', async () => {
    const opponentPieceInput: MakeMoveInput = {
      ...testInput,
      from_position: { file: 'e', rank: 7 }, // Black pawn
      to_position: { file: 'e', rank: 5 }
    };

    await expect(makeMove(opponentPieceInput)).rejects.toThrow(/cannot move opponent piece/i);
  });

  it('should handle pawn promotion', async () => {
    // Create a custom board with white pawn ready for promotion
    const promotionBoard: ChessPiece[] = [
      // Essential pieces for valid game state
      { type: 'king', color: 'white', position: { file: 'e', rank: 1 }, has_moved: false },
      { type: 'king', color: 'black', position: { file: 'e', rank: 8 }, has_moved: false },
      // White pawn ready for promotion
      { type: 'pawn', color: 'white', position: { file: 'a', rank: 7 }, has_moved: true }
    ];

    await db.update(gamesTable)
      .set({ board_state: promotionBoard })
      .where(eq(gamesTable.id, 1))
      .execute();

    const promotionInput: MakeMoveInput = {
      ...testInput,
      from_position: { file: 'a', rank: 7 },
      to_position: { file: 'a', rank: 8 },
      promotion_piece: 'queen'
    };

    const result = await makeMove(promotionInput);

    const promotedPiece = result.board_state.find(piece => 
      piece.position.file === 'a' && piece.position.rank === 8
    );
    expect(promotedPiece?.type).toBe('queen');
    expect(promotedPiece?.color).toBe('white');
  });

  it('should require promotion piece for pawn promotion', async () => {
    // Create a custom board with white pawn ready for promotion
    const promotionBoard: ChessPiece[] = [
      // Essential pieces for valid game state
      { type: 'king', color: 'white', position: { file: 'e', rank: 1 }, has_moved: false },
      { type: 'king', color: 'black', position: { file: 'e', rank: 8 }, has_moved: false },
      // White pawn ready for promotion
      { type: 'pawn', color: 'white', position: { file: 'a', rank: 7 }, has_moved: true }
    ];

    await db.update(gamesTable)
      .set({ board_state: promotionBoard })
      .where(eq(gamesTable.id, 1))
      .execute();

    const promotionInput: MakeMoveInput = {
      ...testInput,
      from_position: { file: 'a', rank: 7 },
      to_position: { file: 'a', rank: 8 }
      // Missing promotion_piece
    };

    await expect(makeMove(promotionInput)).rejects.toThrow(/pawn promotion requires promotion piece/i);
  });

  it('should reject move for non-existent game', async () => {
    const nonExistentGameInput: MakeMoveInput = {
      ...testInput,
      game_id: 999
    };

    await expect(makeMove(nonExistentGameInput)).rejects.toThrow(/game not found/i);
  });

  it('should update game state in database', async () => {
    await makeMove(testInput);

    const games = await db.select()
      .from(gamesTable)
      .where(eq(gamesTable.id, 1))
      .execute();

    expect(games).toHaveLength(1);
    const game = games[0];
    expect(game.current_turn).toBe('black');
    expect(game.move_history).toHaveLength(1);
    expect((game.move_history as string[])[0]).toBe('e2e4');
    expect(game.updated_at).toBeInstanceOf(Date);
  });
});
