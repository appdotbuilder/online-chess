
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { gamesTable, playersTable } from '../db/schema';
import { type GetGameInput, type ChessPiece } from '../schema';
import { getGame } from '../handlers/get_game';

describe('getGame', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get a game by ID', async () => {
    // Create test player first
    await db.insert(playersTable)
      .values({
        id: 'player1',
        username: 'testplayer'
      })
      .execute();

    // Create test game
    const gameResult = await db.insert(gamesTable)
      .values({
        white_player_id: 'player1',
        black_player_id: null,
        current_turn: 'white',
        status: 'waiting',
        result: null,
        board_state: [],
        move_history: [],
        in_check: null
      })
      .returning()
      .execute();

    const createdGame = gameResult[0];
    const input: GetGameInput = {
      game_id: createdGame.id
    };

    const result = await getGame(input);

    // Verify all fields
    expect(result.id).toEqual(createdGame.id);
    expect(result.white_player_id).toEqual('player1');
    expect(result.black_player_id).toBeNull();
    expect(result.current_turn).toEqual('white');
    expect(result.status).toEqual('waiting');
    expect(result.result).toBeNull();
    expect(result.board_state).toEqual([]);
    expect(result.move_history).toEqual([]);
    expect(result.in_check).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle game with board state and move history', async () => {
    // Create test player
    await db.insert(playersTable)
      .values({
        id: 'player1',
        username: 'testplayer'
      })
      .execute();

    // Create game with board state and move history
    const testBoardState: ChessPiece[] = [
      {
        type: 'pawn',
        color: 'white',
        position: { file: 'e', rank: 4 },
        has_moved: true
      }
    ];
    const testMoveHistory = ['e2-e4', 'e7-e5'];

    const gameResult = await db.insert(gamesTable)
      .values({
        white_player_id: 'player1',
        black_player_id: null,
        current_turn: 'black',
        status: 'active',
        result: null,
        board_state: testBoardState,
        move_history: testMoveHistory,
        in_check: 'white'
      })
      .returning()
      .execute();

    const createdGame = gameResult[0];
    const input: GetGameInput = {
      game_id: createdGame.id
    };

    const result = await getGame(input);

    expect(result.board_state).toEqual(testBoardState);
    expect(result.move_history).toEqual(testMoveHistory);
    expect(result.current_turn).toEqual('black');
    expect(result.status).toEqual('active');
    expect(result.in_check).toEqual('white');
  });

  it('should throw error when game not found', async () => {
    const input: GetGameInput = {
      game_id: 999
    };

    await expect(getGame(input)).rejects.toThrow(/Game with ID 999 not found/i);
  });

  it('should handle finished game with result', async () => {
    // Create test players
    await db.insert(playersTable)
      .values([
        { id: 'player1', username: 'player1' },
        { id: 'player2', username: 'player2' }
      ])
      .execute();

    // Create finished game
    const gameResult = await db.insert(gamesTable)
      .values({
        white_player_id: 'player1',
        black_player_id: 'player2',
        current_turn: 'white',
        status: 'finished',
        result: 'white_wins',
        board_state: [],
        move_history: ['e2-e4', 'e7-e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'],
        in_check: null
      })
      .returning()
      .execute();

    const createdGame = gameResult[0];
    const input: GetGameInput = {
      game_id: createdGame.id
    };

    const result = await getGame(input);

    expect(result.white_player_id).toEqual('player1');
    expect(result.black_player_id).toEqual('player2');
    expect(result.status).toEqual('finished');
    expect(result.result).toEqual('white_wins');
    expect(result.move_history).toHaveLength(7);
  });
});
