
import { z } from 'zod';

// Chess piece types and colors
export const pieceTypeSchema = z.enum(['pawn', 'rook', 'knight', 'bishop', 'queen', 'king']);
export const pieceColorSchema = z.enum(['white', 'black']);
export const gameStatusSchema = z.enum(['waiting', 'active', 'finished']);
export const gameResultSchema = z.enum(['white_wins', 'black_wins', 'draw', 'abandoned']).nullable();

// Position schema for chess board coordinates
export const positionSchema = z.object({
  file: z.string().regex(/^[a-h]$/, 'File must be a-h'),
  rank: z.number().int().min(1).max(8)
});

export type Position = z.infer<typeof positionSchema>;

// Chess piece schema
export const chessPieceSchema = z.object({
  type: pieceTypeSchema,
  color: pieceColorSchema,
  position: positionSchema,
  has_moved: z.boolean().default(false)
});

export type ChessPiece = z.infer<typeof chessPieceSchema>;

// Game schema
export const gameSchema = z.object({
  id: z.number(),
  white_player_id: z.string(),
  black_player_id: z.string().nullable(),
  current_turn: pieceColorSchema,
  status: gameStatusSchema,
  result: gameResultSchema,
  board_state: z.array(chessPieceSchema),
  move_history: z.array(z.string()),
  in_check: pieceColorSchema.nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Game = z.infer<typeof gameSchema>;

// Player schema
export const playerSchema = z.object({
  id: z.string(),
  username: z.string(),
  created_at: z.coerce.date()
});

export type Player = z.infer<typeof playerSchema>;

// Move schema
export const moveSchema = z.object({
  id: z.number(),
  game_id: z.number(),
  player_id: z.string(),
  from_position: positionSchema,
  to_position: positionSchema,
  piece_type: pieceTypeSchema,
  piece_color: pieceColorSchema,
  captured_piece: chessPieceSchema.nullable(),
  is_castling: z.boolean().default(false),
  is_en_passant: z.boolean().default(false),
  promotion_piece: pieceTypeSchema.nullable(),
  notation: z.string(),
  created_at: z.coerce.date()
});

export type Move = z.infer<typeof moveSchema>;

// Input schemas
export const createGameInputSchema = z.object({
  white_player_id: z.string(),
  black_player_id: z.string().optional()
});

export type CreateGameInput = z.infer<typeof createGameInputSchema>;

export const joinGameInputSchema = z.object({
  game_id: z.number(),
  player_id: z.string()
});

export type JoinGameInput = z.infer<typeof joinGameInputSchema>;

export const makeMoveInputSchema = z.object({
  game_id: z.number(),
  player_id: z.string(),
  from_position: positionSchema,
  to_position: positionSchema,
  promotion_piece: pieceTypeSchema.optional()
});

export type MakeMoveInput = z.infer<typeof makeMoveInputSchema>;

export const createPlayerInputSchema = z.object({
  username: z.string().min(1).max(50)
});

export type CreatePlayerInput = z.infer<typeof createPlayerInputSchema>;

export const getGameInputSchema = z.object({
  game_id: z.number()
});

export type GetGameInput = z.infer<typeof getGameInputSchema>;

export const getPlayerGamesInputSchema = z.object({
  player_id: z.string()
});

export type GetPlayerGamesInput = z.infer<typeof getPlayerGamesInputSchema>;
