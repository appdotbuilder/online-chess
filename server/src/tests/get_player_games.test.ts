
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { playersTable, gamesTable } from '../db/schema';
import { type GetPlayerGamesInput } from '../schema';
import { getPlayerGames } from '../handlers/get_player_games';

const testPlayer1Id = 'player1';
const testPlayer2Id = 'player2';
const testPlayer3Id = 'player3';

const testInput: GetPlayerGamesInput = {
  player_id: testPlayer1Id
};

describe('getPlayerGames', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return games where player is white player', async () => {
    // Create test players
    await db.insert(playersTable).values([
      { id: testPlayer1Id, username: 'player1' },
      { id: testPlayer2Id, username: 'player2' }
    ]).execute();

    // Create game where player1 is white
    await db.insert(gamesTable).values({
      white_player_id: testPlayer1Id,
      black_player_id: testPlayer2Id,
      board_state: [],
      move_history: [],
      status: 'active',
      current_turn: 'white'
    }).execute();

    const result = await getPlayerGames(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].white_player_id).toEqual(testPlayer1Id);
    expect(result[0].black_player_id).toEqual(testPlayer2Id);
    expect(result[0].status).toEqual('active');
    expect(result[0].board_state).toEqual([]);
    expect(result[0].move_history).toEqual([]);
  });

  it('should return games where player is black player', async () => {
    // Create test players
    await db.insert(playersTable).values([
      { id: testPlayer1Id, username: 'player1' },
      { id: testPlayer2Id, username: 'player2' }
    ]).execute();

    // Create game where player1 is black
    await db.insert(gamesTable).values({
      white_player_id: testPlayer2Id,
      black_player_id: testPlayer1Id,
      board_state: [],
      move_history: [],
      status: 'waiting',
      current_turn: 'white'
    }).execute();

    const result = await getPlayerGames(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].white_player_id).toEqual(testPlayer2Id);
    expect(result[0].black_player_id).toEqual(testPlayer1Id);
    expect(result[0].status).toEqual('waiting');
  });

  it('should return multiple games for a player', async () => {
    // Create test players
    await db.insert(playersTable).values([
      { id: testPlayer1Id, username: 'player1' },
      { id: testPlayer2Id, username: 'player2' },
      { id: testPlayer3Id, username: 'player3' }
    ]).execute();

    // Create multiple games involving player1
    await db.insert(gamesTable).values([
      {
        white_player_id: testPlayer1Id,
        black_player_id: testPlayer2Id,
        board_state: [],
        move_history: [],
        status: 'active',
        current_turn: 'white'
      },
      {
        white_player_id: testPlayer3Id,
        black_player_id: testPlayer1Id,
        board_state: [],
        move_history: [],
        status: 'finished',
        current_turn: 'black',
        result: 'white_wins'
      }
    ]).execute();

    const result = await getPlayerGames(testInput);

    expect(result).toHaveLength(2);
    
    // Check that both games involve player1
    const playerInvolved = result.every(game => 
      game.white_player_id === testPlayer1Id || game.black_player_id === testPlayer1Id
    );
    expect(playerInvolved).toBe(true);
  });

  it('should return empty array for player with no games', async () => {
    // Create test player
    await db.insert(playersTable).values({
      id: testPlayer1Id,
      username: 'player1'
    }).execute();

    // Create game with different players
    await db.insert(playersTable).values([
      { id: testPlayer2Id, username: 'player2' },
      { id: testPlayer3Id, username: 'player3' }
    ]).execute();

    await db.insert(gamesTable).values({
      white_player_id: testPlayer2Id,
      black_player_id: testPlayer3Id,
      board_state: [],
      move_history: [],
      status: 'active',
      current_turn: 'white'
    }).execute();

    const result = await getPlayerGames(testInput);

    expect(result).toHaveLength(0);
  });

  it('should handle games with only white player (waiting games)', async () => {
    // Create test player
    await db.insert(playersTable).values({
      id: testPlayer1Id,
      username: 'player1'
    }).execute();

    // Create waiting game with only white player
    await db.insert(gamesTable).values({
      white_player_id: testPlayer1Id,
      black_player_id: null,
      board_state: [],
      move_history: [],
      status: 'waiting',
      current_turn: 'white'
    }).execute();

    const result = await getPlayerGames(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].white_player_id).toEqual(testPlayer1Id);
    expect(result[0].black_player_id).toBeNull();
    expect(result[0].status).toEqual('waiting');
  });

  it('should preserve all game fields correctly', async () => {
    // Create test players
    await db.insert(playersTable).values([
      { id: testPlayer1Id, username: 'player1' },
      { id: testPlayer2Id, username: 'player2' }
    ]).execute();

    // Create game with all fields populated
    const testBoardState = [
      { type: 'king' as const, color: 'white' as const, position: { file: 'e', rank: 1 }, has_moved: false }
    ];
    const testMoveHistory = ['e2-e4', 'e7-e5'];

    await db.insert(gamesTable).values({
      white_player_id: testPlayer1Id,
      black_player_id: testPlayer2Id,
      board_state: testBoardState,
      move_history: testMoveHistory,
      status: 'finished',
      current_turn: 'black',
      result: 'draw',
      in_check: 'white'
    }).execute();

    const result = await getPlayerGames(testInput);

    expect(result).toHaveLength(1);
    const game = result[0];
    expect(game.id).toBeDefined();
    expect(game.white_player_id).toEqual(testPlayer1Id);
    expect(game.black_player_id).toEqual(testPlayer2Id);
    expect(game.current_turn).toEqual('black');
    expect(game.status).toEqual('finished');
    expect(game.result).toEqual('draw');
    expect(game.board_state).toEqual(testBoardState);
    expect(game.move_history).toEqual(testMoveHistory);
    expect(game.in_check).toEqual('white');
    expect(game.created_at).toBeInstanceOf(Date);
    expect(game.updated_at).toBeInstanceOf(Date);
  });
});
