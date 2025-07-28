
import { db } from '../db';
import { gamesTable } from '../db/schema';
import { type Game } from '../schema';
import { eq } from 'drizzle-orm';

export const getAvailableGames = async (): Promise<Game[]> => {
  try {
    // Query games that are waiting for a second player
    const results = await db.select()
      .from(gamesTable)
      .where(eq(gamesTable.status, 'waiting'))
      .execute();

    // Convert database results to match schema types
    return results.map(game => ({
      ...game,
      board_state: game.board_state as any[], // JSONB field
      move_history: game.move_history as string[], // JSONB field
      created_at: new Date(game.created_at),
      updated_at: new Date(game.updated_at)
    }));
  } catch (error) {
    console.error('Failed to get available games:', error);
    throw error;
  }
};
