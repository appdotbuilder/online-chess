
import { db } from '../db';
import { gamesTable, playersTable } from '../db/schema';
import { type JoinGameInput, type Game } from '../schema';
import { eq, and, isNull } from 'drizzle-orm';

export const joinGame = async (input: JoinGameInput): Promise<Game> => {
  try {
    // First, verify the player exists
    const player = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, input.player_id))
      .execute();

    if (player.length === 0) {
      throw new Error('Player not found');
    }

    // Get the game and verify it's in waiting status and has no black player
    const existingGame = await db.select()
      .from(gamesTable)
      .where(
        and(
          eq(gamesTable.id, input.game_id),
          eq(gamesTable.status, 'waiting'),
          isNull(gamesTable.black_player_id)
        )
      )
      .execute();

    if (existingGame.length === 0) {
      throw new Error('Game not found or not available to join');
    }

    const game = existingGame[0];

    // Prevent player from joining their own game
    if (game.white_player_id === input.player_id) {
      throw new Error('Cannot join your own game');
    }

    // Update the game to add the black player and change status to active
    const updatedGame = await db.update(gamesTable)
      .set({
        black_player_id: input.player_id,
        status: 'active',
        updated_at: new Date()
      })
      .where(eq(gamesTable.id, input.game_id))
      .returning()
      .execute();

    const result = updatedGame[0];

    // Parse JSON fields and return properly typed game object
    return {
      ...result,
      board_state: Array.isArray(result.board_state) ? result.board_state : [],
      move_history: Array.isArray(result.move_history) ? result.move_history : []
    };
  } catch (error) {
    console.error('Join game failed:', error);
    throw error;
  }
};
