
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { gamesTable, playersTable } from '../db/schema';
import { type CreateGameInput } from '../schema';
import { createGame } from '../handlers/create_game';
import { eq } from 'drizzle-orm';

// Test players
const whitePlayer = {
  id: 'white-player-123',
  username: 'WhitePlayer'
};

const blackPlayer = {
  id: 'black-player-456',
  username: 'BlackPlayer'
};

describe('createGame', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test players
    await db.insert(playersTable)
      .values([whitePlayer, blackPlayer])
      .execute();
  });

  afterEach(resetDB);

  it('should create a game with both players', async () => {
    const input: CreateGameInput = {
      white_player_id: whitePlayer.id,
      black_player_id: blackPlayer.id
    };

    const result = await createGame(input);

    // Basic field validation
    expect(result.white_player_id).toEqual(whitePlayer.id);
    expect(result.black_player_id).toEqual(blackPlayer.id);
    expect(result.current_turn).toEqual('white');
    expect(result.status).toEqual('active');
    expect(result.result).toBeNull();
    expect(result.in_check).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Validate board state
    expect(Array.isArray(result.board_state)).toBe(true);
    expect(result.board_state).toHaveLength(32); // 16 pieces per side
    expect(Array.isArray(result.move_history)).toBe(true);
    expect(result.move_history).toHaveLength(0);
  });

  it('should create a waiting game with only white player', async () => {
    const input: CreateGameInput = {
      white_player_id: whitePlayer.id
    };

    const result = await createGame(input);

    expect(result.white_player_id).toEqual(whitePlayer.id);
    expect(result.black_player_id).toBeNull();
    expect(result.status).toEqual('waiting');
    expect(result.current_turn).toEqual('white');
  });

  it('should initialize correct chess board state', async () => {
    const input: CreateGameInput = {
      white_player_id: whitePlayer.id,
      black_player_id: blackPlayer.id
    };

    const result = await createGame(input);

    // Check white pieces setup
    const whiteKing = result.board_state.find(piece => 
      piece.type === 'king' && piece.color === 'white'
    );
    expect(whiteKing).toBeDefined();
    expect(whiteKing?.position).toEqual({ file: 'e', rank: 1 });
    expect(whiteKing?.has_moved).toBe(false);

    // Check black pieces setup
    const blackKing = result.board_state.find(piece => 
      piece.type === 'king' && piece.color === 'black'
    );
    expect(blackKing).toBeDefined();
    expect(blackKing?.position).toEqual({ file: 'e', rank: 8 });

    // Check pawn setup
    const whitePawns = result.board_state.filter(piece => 
      piece.type === 'pawn' && piece.color === 'white'
    );
    const blackPawns = result.board_state.filter(piece => 
      piece.type === 'pawn' && piece.color === 'black'
    );
    
    expect(whitePawns).toHaveLength(8);
    expect(blackPawns).toHaveLength(8);
    
    // All white pawns should be on rank 2
    whitePawns.forEach(pawn => {
      expect(pawn.position.rank).toBe(2);
      expect(pawn.has_moved).toBe(false);
    });

    // All black pawns should be on rank 7
    blackPawns.forEach(pawn => {
      expect(pawn.position.rank).toBe(7);
      expect(pawn.has_moved).toBe(false);
    });
  });

  it('should save game to database', async () => {
    const input: CreateGameInput = {
      white_player_id: whitePlayer.id,
      black_player_id: blackPlayer.id
    };

    const result = await createGame(input);

    // Query database to verify game was saved
    const games = await db.select()
      .from(gamesTable)
      .where(eq(gamesTable.id, result.id))
      .execute();

    expect(games).toHaveLength(1);
    const dbGame = games[0];
    
    expect(dbGame.white_player_id).toEqual(whitePlayer.id);
    expect(dbGame.black_player_id).toEqual(blackPlayer.id);
    expect(dbGame.status).toEqual('active');
    
    // Verify jsonb fields are properly handled
    expect(Array.isArray(dbGame.board_state)).toBe(true);
    expect(dbGame.board_state).toHaveLength(32);
    expect(Array.isArray(dbGame.move_history)).toBe(true);
    expect(dbGame.move_history).toHaveLength(0);
  });

  it('should throw error for non-existent white player', async () => {
    const input: CreateGameInput = {
      white_player_id: 'non-existent-player',
      black_player_id: blackPlayer.id
    };

    await expect(createGame(input)).rejects.toThrow(/White player.*not found/i);
  });

  it('should throw error for non-existent black player', async () => {
    const input: CreateGameInput = {
      white_player_id: whitePlayer.id,
      black_player_id: 'non-existent-player'
    };

    await expect(createGame(input)).rejects.toThrow(/Black player.*not found/i);
  });
});
