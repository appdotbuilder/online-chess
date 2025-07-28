
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { playersTable } from '../db/schema';
import { type CreatePlayerInput } from '../schema';
import { createPlayer } from '../handlers/create_player';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreatePlayerInput = {
  username: 'TestPlayer123'
};

describe('createPlayer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a player', async () => {
    const result = await createPlayer(testInput);

    // Basic field validation
    expect(result.username).toEqual('TestPlayer123');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save player to database', async () => {
    const result = await createPlayer(testInput);

    // Query using proper drizzle syntax
    const players = await db.select()
      .from(playersTable)
      .where(eq(playersTable.id, result.id))
      .execute();

    expect(players).toHaveLength(1);
    expect(players[0].username).toEqual('TestPlayer123');
    expect(players[0].id).toEqual(result.id);
    expect(players[0].created_at).toBeInstanceOf(Date);
  });

  it('should generate unique player IDs', async () => {
    const input1: CreatePlayerInput = { username: 'Player1' };
    const input2: CreatePlayerInput = { username: 'Player2' };

    const result1 = await createPlayer(input1);
    const result2 = await createPlayer(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.username).toEqual('Player1');
    expect(result2.username).toEqual('Player2');
  });

  it('should reject duplicate usernames', async () => {
    // Create first player
    await createPlayer(testInput);

    // Try to create second player with same username
    await expect(createPlayer(testInput)).rejects.toThrow(/username already exists/i);
  });

  it('should allow different usernames', async () => {
    const input1: CreatePlayerInput = { username: 'FirstPlayer' };
    const input2: CreatePlayerInput = { username: 'SecondPlayer' };

    const result1 = await createPlayer(input1);
    const result2 = await createPlayer(input2);

    expect(result1.username).toEqual('FirstPlayer');
    expect(result2.username).toEqual('SecondPlayer');
    expect(result1.id).not.toEqual(result2.id);

    // Verify both players exist in database
    const allPlayers = await db.select()
      .from(playersTable)
      .execute();

    expect(allPlayers).toHaveLength(2);
    const usernames = allPlayers.map(p => p.username).sort();
    expect(usernames).toEqual(['FirstPlayer', 'SecondPlayer']);
  });
});
