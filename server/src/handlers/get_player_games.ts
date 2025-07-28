
import { db } from '../db';
import { gamesTable } from '../db/schema';
import { type GetPlayerGamesInput, type Game } from '../schema';
import { eq, or } from 'drizzle-orm';

export async function getPlayerGames(input: GetPlayerGamesInput): Promise<Game[]> {
  try {
    // Query games where player is either white or black player
    const result = await db.select()
      .from(gamesTable)
      .where(
        or(
          eq(gamesTable.white_player_id, input.player_id),
          eq(gamesTable.black_player_id, input.player_id)
        )
      )
      .execute();

    // Map results to match Game schema format
    return result.map(game => ({
      ...game,
      board_state: Array.isArray(game.board_state) ? game.board_state : [],
      move_history: Array.isArray(game.move_history) ? game.move_history : []
    }));
  } catch (error) {
    console.error('Get player games failed:', error);
    throw error;
  }
}
