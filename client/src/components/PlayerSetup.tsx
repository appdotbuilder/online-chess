
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import type { Player, CreatePlayerInput } from '../../../server/src/schema';

interface PlayerSetupProps {
  onPlayerCreated: (player: Player) => void;
}

export function PlayerSetup({ onPlayerCreated }: PlayerSetupProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const playerData: CreatePlayerInput = { username: username.trim() };
      const player = await trpc.createPlayer.mutate(playerData);
      onPlayerCreated(player);
    } catch (error) {
      console.error('Failed to create player:', error);
      setError('Failed to create player. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Create Your Player Profile</CardTitle>
          <CardDescription>
            Choose a username to start playing chess online
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                maxLength={50}
                required
                className="text-center"
              />
            </div>
            
            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              disabled={isLoading || !username.trim()}
              className="w-full"
            >
              {isLoading ? 'Creating Player...' : 'Start Playing ♟️'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
