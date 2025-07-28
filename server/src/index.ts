
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createPlayerInputSchema,
  createGameInputSchema,
  joinGameInputSchema,
  makeMoveInputSchema,
  getGameInputSchema,
  getPlayerGamesInputSchema
} from './schema';

// Import handlers
import { createPlayer } from './handlers/create_player';
import { createGame } from './handlers/create_game';
import { joinGame } from './handlers/join_game';
import { makeMove } from './handlers/make_move';
import { getGame } from './handlers/get_game';
import { getPlayerGames } from './handlers/get_player_games';
import { getAvailableGames } from './handlers/get_available_games';
import { validateMove } from './handlers/validate_move';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Player management
  createPlayer: publicProcedure
    .input(createPlayerInputSchema)
    .mutation(({ input }) => createPlayer(input)),

  // Game management
  createGame: publicProcedure
    .input(createGameInputSchema)
    .mutation(({ input }) => createGame(input)),

  joinGame: publicProcedure
    .input(joinGameInputSchema)
    .mutation(({ input }) => joinGame(input)),

  getGame: publicProcedure
    .input(getGameInputSchema)
    .query(({ input }) => getGame(input)),

  getPlayerGames: publicProcedure
    .input(getPlayerGamesInputSchema)
    .query(({ input }) => getPlayerGames(input)),

  getAvailableGames: publicProcedure
    .query(() => getAvailableGames()),

  // Game actions
  makeMove: publicProcedure
    .input(makeMoveInputSchema)
    .mutation(({ input }) => makeMove(input)),

  validateMove: publicProcedure
    .input(makeMoveInputSchema)
    .query(({ input }) => validateMove(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC Chess Game server listening at port: ${port}`);
}

start();
