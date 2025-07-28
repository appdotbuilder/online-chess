
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { gamesTable, playersTable } from '../db/schema';
import { type JoinGameInput } from '../schema';
import { joinGame } from '../handlers/join_game';
import { eq } from 'drizzle-orm';

const testInput: JoinGameInput = {
  game_id: 1,
  player_id: 'black_player_123'
};

describe('joinGame', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should allow a player to join a waiting game', async () => {
    // Create test players
    await db.insert(playersTable).values([
      { id: 'white_player_123', username: 'WhitePlayer' },
      { id: 'black_player_123', username: 'BlackPlayer' }
    ]).execute();

    // Create a waiting game
    await db.insert(gamesTable).values({
      id: 1,
      white_player_id: 'white_player_123',
      black_player_id: null,
      current_turn: 'white',
      status: 'waiting',
      result: null,
      board_state: [],
      move_history: []
    }).execute();

    const result = await joinGame(testInput);

    expect(result.id).toEqual(1);
    expect(result.white_player_id).toEqual('white_player_123');
    expect(result.black_player_id).toEqual('black_player_123');
    expect(result.status).toEqual('active');
    expect(result.current_turn).toEqual('white');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update the game in the database', async () => {
    // Create test players
    await db.insert(playersTable).values([
      { id: 'white_player_123', username: 'WhitePlayer' },
      { id: 'black_player_123', username: 'BlackPlayer' }
    ]).execute();

    // Create a waiting game
    await db.insert(gamesTable).values({
      id: 1,
      white_player_id: 'white_player_123',
      black_player_id: null,
      current_turn: 'white',
      status: 'waiting',
      result: null,
      board_state: [],
      move_history: []
    }).execute();

    await joinGame(testInput);

    // Verify the game was updated in the database
    const games = await db.select()
      .from(gamesTable)
      .where(eq(gamesTable.id, 1))
      .execute();

    expect(games).toHaveLength(1);
    const game = games[0];
    expect(game.black_player_id).toEqual('black_player_123');
    expect(game.status).toEqual('active');
    expect(game.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error if player does not exist', async () => {
    // Create only white player
    await db.insert(playersTable).values({
      id: 'white_player_123',
      username: 'WhitePlayer'
    }).execute();

    // Create a waiting game
    await db.insert(gamesTable).values({
      id: 1,
      white_player_id: 'white_player_123',
      black_player_id: null,
      current_turn: 'white',
      status: 'waiting',
      result: null,
      board_state: [],
      move_history: []
    }).execute();

    await expect(joinGame(testInput)).rejects.toThrow(/player not found/i);
  });

  it('should throw error if game does not exist', async () => {
    // Create test player
    await db.insert(playersTable).values({
      id: 'black_player_123',
      username: 'BlackPlayer'
    }).execute();

    const nonExistentGameInput: JoinGameInput = {
      game_id: 999,
      player_id: 'black_player_123'
    };

    await expect(joinGame(nonExistentGameInput)).rejects.toThrow(/game not found/i);
  });

  it('should throw error if game is not in waiting status', async () => {
    // Create test players
    await db.insert(playersTable).values([
      { id: 'white_player_123', username: 'WhitePlayer' },
      { id: 'existing_black_player', username: 'ExistingBlackPlayer' },
      { id: 'black_player_123', username: 'BlackPlayer' }
    ]).execute();

    // Create an active game (not waiting) - has both players and active status
    await db.insert(gamesTable).values({
      id: 1,
      white_player_id: 'white_player_123',
      black_player_id: 'existing_black_player',
      current_turn: 'white',
      status: 'active',
      result: null,
      board_state: [],
      move_history: []
    }).execute();

    await expect(joinGame(testInput)).rejects.toThrow(/not available to join/i);
  });

  it('should throw error if player tries to join their own game', async () => {
    // Create test player
    await db.insert(playersTable).values({
      id: 'white_player_123',
      username: 'WhitePlayer'
    }).execute();

    // Create a waiting game where white player tries to join as black
    await db.insert(gamesTable).values({
      id: 1,
      white_player_id: 'white_player_123',
      black_player_id: null,
      current_turn: 'white',
      status: 'waiting',
      result: null,
      board_state: [],
      move_history: []
    }).execute();

    const selfJoinInput: JoinGameInput = {
      game_id: 1,
      player_id: 'white_player_123'
    };

    await expect(joinGame(selfJoinInput)).rejects.toThrow(/cannot join your own game/i);
  });

  it('should throw error if game already has a black player', async () => {
    // Create test players
    await db.insert(playersTable).values([
      { id: 'white_player_123', username: 'WhitePlayer' },
      { id: 'existing_black_player', username: 'ExistingBlackPlayer' },
      { id: 'black_player_123', username: 'BlackPlayer' }
    ]).execute();

    // Create a game that has a black player but is still in waiting status
    // This should not be joinable because black_player_id is not null
    await db.insert(gamesTable).values({
      id: 1,
      white_player_id: 'white_player_123',
      black_player_id: 'existing_black_player',
      current_turn: 'white',
      status: 'waiting',
      result: null,
      board_state: [],
      move_history: []
    }).execute();

    await expect(joinGame(testInput)).rejects.toThrow(/not available to join/i);
  });
});
