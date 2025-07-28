
import { db } from '../db';
import { gamesTable } from '../db/schema';
import { type GetGameInput, type Game } from '../schema';
import { eq } from 'drizzle-orm';

export const getGame = async (input: GetGameInput): Promise<Game> => {
  try {
    // Query the game by ID
    const results = await db.select()
      .from(gamesTable)
      .where(eq(gamesTable.id, input.game_id))
      .execute();

    if (results.length === 0) {
      throw new Error(`Game with ID ${input.game_id} not found`);
    }

    const game = results[0];

    // Return the game data with proper type conversion
    return {
      id: game.id,
      white_player_id: game.white_player_id,
      black_player_id: game.black_player_id,
      current_turn: game.current_turn,
      status: game.status,
      result: game.result,
      board_state: Array.isArray(game.board_state) ? game.board_state : [],
      move_history: Array.isArray(game.move_history) ? game.move_history : [],
      in_check: game.in_check,
      created_at: game.created_at,
      updated_at: game.updated_at
    };
  } catch (error) {
    console.error('Get game failed:', error);
    throw error;
  }
};
