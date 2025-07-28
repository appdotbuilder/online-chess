
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { playersTable, gamesTable } from '../db/schema';
import { getAvailableGames } from '../handlers/get_available_games';
import { type ChessPiece } from '../schema';

// Initial chess board state with proper typing
const initialBoardState: ChessPiece[] = [
  // White pieces
  { type: 'rook' as const, color: 'white' as const, position: { file: 'a', rank: 1 }, has_moved: false },
  { type: 'knight' as const, color: 'white' as const, position: { file: 'b', rank: 1 }, has_moved: false },
  { type: 'bishop' as const, color: 'white' as const, position: { file: 'c', rank: 1 }, has_moved: false },
  { type: 'queen' as const, color: 'white' as const, position: { file: 'd', rank: 1 }, has_moved: false },
  { type: 'king' as const, color: 'white' as const, position: { file: 'e', rank: 1 }, has_moved: false },
  { type: 'bishop' as const, color: 'white' as const, position: { file: 'f', rank: 1 }, has_moved: false },
  { type: 'knight' as const, color: 'white' as const, position: { file: 'g', rank: 1 }, has_moved: false },
  { type: 'rook' as const, color: 'white' as const, position: { file: 'h', rank: 1 }, has_moved: false },
  // White pawns
  { type: 'pawn' as const, color: 'white' as const, position: { file: 'a', rank: 2 }, has_moved: false },
  { type: 'pawn' as const, color: 'white' as const, position: { file: 'b', rank: 2 }, has_moved: false },
  { type: 'pawn' as const, color: 'white' as const, position: { file: 'c', rank: 2 }, has_moved: false },
  { type: 'pawn' as const, color: 'white' as const, position: { file: 'd', rank: 2 }, has_moved: false },
  { type: 'pawn' as const, color: 'white' as const, position: { file: 'e', rank: 2 }, has_moved: false },
  { type: 'pawn' as const, color: 'white' as const, position: { file: 'f', rank: 2 }, has_moved: false },
  { type: 'pawn' as const, color: 'white' as const, position: { file: 'g', rank: 2 }, has_moved: false },
  { type: 'pawn' as const, color: 'white' as const, position: { file: 'h', rank: 2 }, has_moved: false },
  // Black pieces
  { type: 'rook' as const, color: 'black' as const, position: { file: 'a', rank: 8 }, has_moved: false },
  { type: 'knight' as const, color: 'black' as const, position: { file: 'b', rank: 8 }, has_moved: false },
  { type: 'bishop' as const, color: 'black' as const, position: { file: 'c', rank: 8 }, has_moved: false },
  { type: 'queen' as const, color: 'black' as const, position: { file: 'd', rank: 8 }, has_moved: false },
  { type: 'king' as const, color: 'black' as const, position: { file: 'e', rank: 8 }, has_moved: false },
  { type: 'bishop' as const, color: 'black' as const, position: { file: 'f', rank: 8 }, has_moved: false },
  { type: 'knight' as const, color: 'black' as const, position: { file: 'g', rank: 8 }, has_moved: false },
  { type: 'rook' as const, color: 'black' as const, position: { file: 'h', rank: 8 }, has_moved: false },
  // Black pawns
  { type: 'pawn' as const, color: 'black' as const, position: { file: 'a', rank: 7 }, has_moved: false },
  { type: 'pawn' as const, color: 'black' as const, position: { file: 'b', rank: 7 }, has_moved: false },
  { type: 'pawn' as const, color: 'black' as const, position: { file: 'c', rank: 7 }, has_moved: false },
  { type: 'pawn' as const, color: 'black' as const, position: { file: 'd', rank: 7 }, has_moved: false },
  { type: 'pawn' as const, color: 'black' as const, position: { file: 'e', rank: 7 }, has_moved: false },
  { type: 'pawn' as const, color: 'black' as const, position: { file: 'f', rank: 7 }, has_moved: false },
  { type: 'pawn' as const, color: 'black' as const, position: { file: 'g', rank: 7 }, has_moved: false },
  { type: 'pawn' as const, color: 'black' as const, position: { file: 'h', rank: 7 }, has_moved: false }
];

describe('getAvailableGames', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no games exist', async () => {
    const result = await getAvailableGames();
    expect(result).toEqual([]);
  });

  it('should return games with waiting status', async () => {
    // Create test player
    await db.insert(playersTable).values({
      id: 'player1',
      username: 'TestPlayer1'
    }).execute();

    // Create a waiting game
    await db.insert(gamesTable).values({
      white_player_id: 'player1',
      black_player_id: null,
      current_turn: 'white',
      status: 'waiting',
      board_state: initialBoardState,
      move_history: []
    }).execute();

    const result = await getAvailableGames();

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('waiting');
    expect(result[0].white_player_id).toEqual('player1');
    expect(result[0].black_player_id).toBeNull();
    expect(result[0].board_state).toEqual(initialBoardState);
    expect(result[0].move_history).toEqual([]);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should not return games with active status', async () => {
    // Create test players
    await db.insert(playersTable).values([
      { id: 'player1', username: 'TestPlayer1' },
      { id: 'player2', username: 'TestPlayer2' }
    ]).execute();

    // Create an active game
    await db.insert(gamesTable).values({
      white_player_id: 'player1',
      black_player_id: 'player2',
      current_turn: 'white',
      status: 'active',
      board_state: initialBoardState,
      move_history: []
    }).execute();

    const result = await getAvailableGames();
    expect(result).toHaveLength(0);
  });

  it('should not return games with finished status', async () => {
    // Create test players
    await db.insert(playersTable).values([
      { id: 'player1', username: 'TestPlayer1' },
      { id: 'player2', username: 'TestPlayer2' }
    ]).execute();

    // Create a finished game
    await db.insert(gamesTable).values({
      white_player_id: 'player1',
      black_player_id: 'player2',
      current_turn: 'white',
      status: 'finished',
      result: 'white_wins',
      board_state: initialBoardState,
      move_history: []
    }).execute();

    const result = await getAvailableGames();
    expect(result).toHaveLength(0);
  });

  it('should return multiple waiting games', async () => {
    // Create test players
    await db.insert(playersTable).values([
      { id: 'player1', username: 'TestPlayer1' },
      { id: 'player2', username: 'TestPlayer2' }
    ]).execute();

    // Create multiple waiting games
    await db.insert(gamesTable).values([
      {
        white_player_id: 'player1',
        black_player_id: null,
        current_turn: 'white',
        status: 'waiting',
        board_state: initialBoardState,
        move_history: []
      },
      {
        white_player_id: 'player2',
        black_player_id: null,
        current_turn: 'white',
        status: 'waiting',
        board_state: initialBoardState,
        move_history: []
      }
    ]).execute();

    const result = await getAvailableGames();

    expect(result).toHaveLength(2);
    expect(result.every(game => game.status === 'waiting')).toBe(true);
    expect(result.every(game => game.black_player_id === null)).toBe(true);
  });

  it('should return only waiting games when mixed statuses exist', async () => {
    // Create test players
    await db.insert(playersTable).values([
      { id: 'player1', username: 'TestPlayer1' },
      { id: 'player2', username: 'TestPlayer2' },
      { id: 'player3', username: 'TestPlayer3' }
    ]).execute();

    // Create games with different statuses
    await db.insert(gamesTable).values([
      {
        white_player_id: 'player1',
        black_player_id: null,
        current_turn: 'white',
        status: 'waiting',
        board_state: initialBoardState,
        move_history: []
      },
      {
        white_player_id: 'player2',
        black_player_id: 'player3',
        current_turn: 'white',
        status: 'active',
        board_state: initialBoardState,
        move_history: []
      },
      {
        white_player_id: 'player3',
        black_player_id: null,
        current_turn: 'white',
        status: 'waiting',
        board_state: initialBoardState,
        move_history: []
      }
    ]).execute();

    const result = await getAvailableGames();

    expect(result).toHaveLength(2);
    expect(result.every(game => game.status === 'waiting')).toBe(true);
  });
});
