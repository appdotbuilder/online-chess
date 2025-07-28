
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Game, Player, CreateGameInput, JoinGameInput } from '../../../server/src/schema';

interface GameLobbyProps {
  currentPlayer: Player;
  availableGames: Game[];
  onGameJoined: (game: Game) => void;
  onGamesUpdated: () => void;
}

export function GameLobby({ currentPlayer, availableGames, onGameJoined, onGamesUpdated }: GameLobbyProps) {
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [joiningGameId, setJoiningGameId] = useState<number | null>(null);

  const handleCreateGame = async () => {
    setIsCreatingGame(true);
    try {
      const gameData: CreateGameInput = {
        white_player_id: currentPlayer.id
      };
      const game = await trpc.createGame.mutate(gameData);
      onGameJoined(game);
      onGamesUpdated();
    } catch (error) {
      console.error('Failed to create game:', error);
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleJoinGame = async (gameId: number) => {
    setJoiningGameId(gameId);
    try {
      const joinData: JoinGameInput = {
        game_id: gameId,
        player_id: currentPlayer.id
      };
      const game = await trpc.joinGame.mutate(joinData);
      onGameJoined(game);
      onGamesUpdated();
    } catch (error) {
      console.error('Failed to join game:', error);
    } finally {
      setJoiningGameId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Start New Game</CardTitle>
          <CardDescription>
            Create a new game and wait for an opponent to join
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleCreateGame}
            disabled={isCreatingGame}
            size="lg"
            className="w-full"
          >
            {isCreatingGame ? 'Creating Game...' : '🎯 Create New Game'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Games ({availableGames.length})</CardTitle>
          <CardDescription>
            Join an existing game waiting for a second player
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableGames.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>No games available right now.</p>
              <p className="text-sm mt-2">Create a new game to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableGames.map((game: Game) => (
                <div 
                  key={game.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">Game #{game.id}</h3>
                      <Badge variant="secondary">Waiting</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      White: {game.white_player_id}
                      <span className="mx-2">•</span>
                      Black: <span className="text-gray-400">Waiting...</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Created: {game.created_at.toLocaleString()}
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => handleJoinGame(game.id)}
                    disabled={joiningGameId === game.id || game.white_player_id === currentPlayer.id}
                    size="sm"
                  >
                    {joiningGameId === game.id ? 'Joining...' : 
                     game.white_player_id === currentPlayer.id ? 'Your Game' : 
                     '⚡ Join Game'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
