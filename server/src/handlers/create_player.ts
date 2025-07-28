
import { db } from '../db';
import { playersTable } from '../db/schema';
import { type CreatePlayerInput, type Player } from '../schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const createPlayer = async (input: CreatePlayerInput): Promise<Player> => {
  try {
    // Check if username already exists
    const existingPlayer = await db.select()
      .from(playersTable)
      .where(eq(playersTable.username, input.username))
      .execute();

    if (existingPlayer.length > 0) {
      throw new Error('Username already exists');
    }

    // Generate unique player ID
    const playerId = randomUUID();

    // Insert player record
    const result = await db.insert(playersTable)
      .values({
        id: playerId,
        username: input.username
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Player creation failed:', error);
    throw error;
  }
};
