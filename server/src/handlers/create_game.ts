
import { db } from '../db';
import { gamesTable, playersTable } from '../db/schema';
import { type CreateGameInput, type Game } from '../schema';
import { eq } from 'drizzle-orm';

export async function createGame(input: CreateGameInput): Promise<Game> {
  try {
    // Verify white player exists
    const whitePlayer = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, input.white_player_id))
      .execute();

    if (whitePlayer.length === 0) {
      throw new Error(`White player with id ${input.white_player_id} not found`);
    }

    // Verify black player exists if provided
    if (input.black_player_id) {
      const blackPlayer = await db.select()
        .from(playersTable)
        .where(eq(playersTable.id, input.black_player_id))
        .execute();

      if (blackPlayer.length === 0) {
        throw new Error(`Black player with id ${input.black_player_id} not found`);
      }
    }

    // Initialize standard chess board
    const initialBoardState = [
      // White pieces
      { type: 'rook', color: 'white', position: { file: 'a', rank: 1 }, has_moved: false },
      { type: 'knight', color: 'white', position: { file: 'b', rank: 1 }, has_moved: false },
      { type: 'bishop', color: 'white', position: { file: 'c', rank: 1 }, has_moved: false },
      { type: 'queen', color: 'white', position: { file: 'd', rank: 1 }, has_moved: false },
      { type: 'king', color: 'white', position: { file: 'e', rank: 1 }, has_moved: false },
      { type: 'bishop', color: 'white', position: { file: 'f', rank: 1 }, has_moved: false },
      { type: 'knight', color: 'white', position: { file: 'g', rank: 1 }, has_moved: false },
      { type: 'rook', color: 'white', position: { file: 'h', rank: 1 }, has_moved: false },
      // White pawns
      ...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(file => ({
        type: 'pawn' as const,
        color: 'white' as const,
        position: { file, rank: 2 },
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
      // Black pawns
      ...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(file => ({
        type: 'pawn' as const,
        color: 'black' as const,
        position: { file, rank: 7 },
        has_moved: false
      }))
    ];

    // Determine game status
    const status = input.black_player_id ? 'active' : 'waiting';

    // Insert game into database
    const result = await db.insert(gamesTable)
      .values({
        white_player_id: input.white_player_id,
        black_player_id: input.black_player_id || null,
        current_turn: 'white',
        status: status,
        result: null,
        board_state: initialBoardState, // jsonb handles JSON conversion automatically
        move_history: [], // jsonb handles JSON conversion automatically
        in_check: null
      })
      .returning()
      .execute();

    const game = result[0];

    // Return the game directly - jsonb fields are already properly typed
    return game as Game;
  } catch (error) {
    console.error('Game creation failed:', error);
    throw error;
  }
}
