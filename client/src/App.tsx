
import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChessBoard } from '@/components/ChessBoard';
import { GameLobby } from '@/components/GameLobby';
import { PlayerSetup } from '@/components/PlayerSetup';
import type { Game, Player } from '../../server/src/schema';

function App() {
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [playerGames, setPlayerGames] = useState<Game[]>([]);
  const [gameRefreshInterval, setGameRefreshInterval] = useState<number | null>(null);

  // Load available games
  const loadAvailableGames = useCallback(async () => {
    try {
      const games = await trpc.getAvailableGames.query();
      setAvailableGames(games);
    } catch (error) {
      console.error('Failed to load available games:', error);
    }
  }, []);

  // Load player games
  const loadPlayerGames = useCallback(async () => {
    if (!currentPlayer) return;
    try {
      const games = await trpc.getPlayerGames.query({ player_id: currentPlayer.id });
      setPlayerGames(games);
    } catch (error) {
      console.error('Failed to load player games:', error);
    }
  }, [currentPlayer]);

  // Refresh active game state
  const refreshActiveGame = useCallback(async () => {
    if (!activeGame) return;
    try {
      const updatedGame = await trpc.getGame.query({ game_id: activeGame.id });
      setActiveGame(updatedGame);
    } catch (error) {
      console.error('Failed to refresh game:', error);
    }
  }, [activeGame]);

  // Set up auto-refresh for active game
  useEffect(() => {
    if (activeGame && activeGame.status === 'active') {
      const interval = window.setInterval(refreshActiveGame, 2000); // Refresh every 2 seconds
      setGameRefreshInterval(interval);
      return () => {
        window.clearInterval(interval);
        setGameRefreshInterval(null);
      };
    } else if (gameRefreshInterval) {
      window.clearInterval(gameRefreshInterval);
      setGameRefreshInterval(null);
    }
  }, [activeGame, refreshActiveGame, gameRefreshInterval]);

  // Load initial data
  useEffect(() => {
    loadAvailableGames();
  }, [loadAvailableGames]);

  useEffect(() => {
    if (currentPlayer) {
      loadPlayerGames();
    }
  }, [currentPlayer, loadPlayerGames]);

  const handlePlayerCreated = (player: Player) => {
    setCurrentPlayer(player);
  };

  const handleGameJoined = (game: Game) => {
    setActiveGame(game);
    loadAvailableGames(); // Refresh available games
    loadPlayerGames(); // Refresh player games
  };

  const handleGameLeft = () => {
    setActiveGame(null);
    loadPlayerGames(); // Refresh player games
  };

  const handleMoveCompleted = () => {
    // Game state will be refreshed by the interval
    loadPlayerGames(); // Update player games list
  };

  if (!currentPlayer) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">♟️ Chess Online</h1>
          <p className="text-lg text-gray-600">Challenge players worldwide to a game of chess</p>
        </div>
        <PlayerSetup onPlayerCreated={handlePlayerCreated} />
      </div>
    );
  }

  if (activeGame) {
    return (
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Game #{activeGame.id}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant={activeGame.status === 'active' ? 'default' : 'secondary'}>
                    {activeGame.status}
                  </Badge>
                  {activeGame.in_check && (
                    <Badge variant="destructive">
                      {activeGame.in_check} in check!
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={handleGameLeft}>
                ← Back to Lobby
              </Button>
            </div>
            <ChessBoard 
              game={activeGame} 
              currentPlayer={currentPlayer}
              onMoveCompleted={handleMoveCompleted}
            />
          </div>
          
          <div className="lg:w-80">
            <Card>
              <CardHeader>
                <CardTitle>Game Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Players</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-white border-2 border-gray-400 rounded"></div>
                      <span className="text-sm">White: {activeGame.white_player_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gray-800 rounded"></div>
                      <span className="text-sm">
                        Black: {activeGame.black_player_id || 'Waiting...'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Current Turn</h4>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${
                      activeGame.current_turn === 'white' 
                        ? 'bg-white border-2 border-gray-400' 
                        : 'bg-gray-800'
                    }`}></div>
                    <span className="text-sm capitalize">{activeGame.current_turn}</span>
                  </div>
                </div>

                {activeGame.move_history.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Recent Moves</h4>
                    <div className="max-h-32 overflow-y-auto text-sm space-y-1 move-history">
                      {activeGame.move_history.slice(-5).map((move: string, index: number) => (
                        <div key={index} className="text-gray-600">
                          {activeGame.move_history.length - 4 + index}. {move}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeGame.result && (
                  <div>
                    <h4 className="font-semibold mb-2">Result</h4>
                    <Badge variant="outline" className="capitalize">
                      {activeGame.result.replace('_', ' ')}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">♟️ Chess Lobby</h1>
            <p className="text-gray-600 mt-1">Welcome, {currentPlayer.username}!</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setCurrentPlayer(null)}
          >
            Switch Player
          </Button>
        </div>
      </div>

      <Tabs defaultValue="lobby" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lobby">Game Lobby</TabsTrigger>
          <TabsTrigger value="my-games">My Games ({playerGames.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="lobby">
          <GameLobby 
            currentPlayer={currentPlayer}
            availableGames={availableGames}
            onGameJoined={handleGameJoined}
            onGamesUpdated={loadAvailableGames}
          />
        </TabsContent>

        <TabsContent value="my-games">
          <div className="space-y-4">
            {playerGames.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-gray-600">No games yet. Create or join a game to get started!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {playerGames.map((game: Game) => (
                  <Card key={game.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Game #{game.id}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>vs {game.white_player_id === currentPlayer.id ? 
                              (game.black_player_id || 'Waiting...') : 
                              game.white_player_id}
                            </span>
                            <Badge variant={game.status === 'active' ? 'default' : 'secondary'}>
                              {game.status}
                            </Badge>
                            {game.current_turn === (game.white_player_id === currentPlayer.id ? 'white' : 'black') && 
                             game.status === 'active' && (
                              <Badge variant="outline">Your Turn</Badge>
                            )}
                          </div>
                        </div>
                        <Button 
                          onClick={() => setActiveGame(game)}
                          size="sm"
                        >
                          {game.status === 'waiting' ? 'Wait' : 'Play'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default App;
