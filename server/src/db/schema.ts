
import { serial, text, pgTable, timestamp, jsonb, pgEnum, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const pieceTypeEnum = pgEnum('piece_type', ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king']);
export const pieceColorEnum = pgEnum('piece_color', ['white', 'black']);
export const gameStatusEnum = pgEnum('game_status', ['waiting', 'active', 'finished']);
export const gameResultEnum = pgEnum('game_result', ['white_wins', 'black_wins', 'draw', 'abandoned']);

// Players table
export const playersTable = pgTable('players', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Games table
export const gamesTable = pgTable('games', {
  id: serial('id').primaryKey(),
  white_player_id: text('white_player_id').notNull().references(() => playersTable.id),
  black_player_id: text('black_player_id').references(() => playersTable.id),
  current_turn: pieceColorEnum('current_turn').notNull().default('white'),
  status: gameStatusEnum('status').notNull().default('waiting'),
  result: gameResultEnum('result'),
  board_state: jsonb('board_state').notNull(),
  move_history: jsonb('move_history').notNull().default('[]'),
  in_check: pieceColorEnum('in_check'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Moves table for detailed move history
export const movesTable = pgTable('moves', {
  id: serial('id').primaryKey(),
  game_id: integer('game_id').notNull().references(() => gamesTable.id),
  player_id: text('player_id').notNull().references(() => playersTable.id),
  from_position: jsonb('from_position').notNull(),
  to_position: jsonb('to_position').notNull(),
  piece_type: pieceTypeEnum('piece_type').notNull(),
  piece_color: pieceColorEnum('piece_color').notNull(),
  captured_piece: jsonb('captured_piece'),
  is_castling: boolean('is_castling').notNull().default(false),
  is_en_passant: boolean('is_en_passant').notNull().default(false),
  promotion_piece: pieceTypeEnum('promotion_piece'),
  notation: text('notation').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const playersRelations = relations(playersTable, ({ many }) => ({
  whiteGames: many(gamesTable, { relationName: 'whitePlayer' }),
  blackGames: many(gamesTable, { relationName: 'blackPlayer' }),
  moves: many(movesTable)
}));

export const gamesRelations = relations(gamesTable, ({ one, many }) => ({
  whitePlayer: one(playersTable, {
    fields: [gamesTable.white_player_id],
    references: [playersTable.id],
    relationName: 'whitePlayer'
  }),
  blackPlayer: one(playersTable, {
    fields: [gamesTable.black_player_id],
    references: [playersTable.id],
    relationName: 'blackPlayer'
  }),
  moves: many(movesTable)
}));

export const movesRelations = relations(movesTable, ({ one }) => ({
  game: one(gamesTable, {
    fields: [movesTable.game_id],
    references: [gamesTable.id]
  }),
  player: one(playersTable, {
    fields: [movesTable.player_id],
    references: [playersTable.id]
  })
}));

// TypeScript types
export type Player = typeof playersTable.$inferSelect;
export type NewPlayer = typeof playersTable.$inferInsert;
export type Game = typeof gamesTable.$inferSelect;
export type NewGame = typeof gamesTable.$inferInsert;
export type Move = typeof movesTable.$inferSelect;
export type NewMove = typeof movesTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  players: playersTable,
  games: gamesTable,
  moves: movesTable
};
