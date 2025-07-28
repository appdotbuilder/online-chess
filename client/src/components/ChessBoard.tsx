
import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { Game, Player, ChessPiece, Position, MakeMoveInput } from '../../../server/src/schema';

interface ChessBoardProps {
  game: Game;
  currentPlayer: Player;
  onMoveCompleted: () => void;
}

type SelectedSquare = {
  position: Position;
  piece: ChessPiece;
} | null;

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

const PIECE_SYMBOLS = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙'
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟'
  }
} as const;

export function ChessBoard({ game, currentPlayer, onMoveCompleted }: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<SelectedSquare>(null);
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  const playerColor = game.white_player_id === currentPlayer.id ? 'white' : 'black';
  const isPlayerTurn = game.current_turn === playerColor;
  const canMove = game.status === 'active' && isPlayerTurn;

  // Get piece at specific position
  const getPieceAtPosition = useCallback((file: string, rank: number): ChessPiece | null => {
    return game.board_state.find(piece => 
      piece.position.file === file && piece.position.rank === rank
    ) || null;
  }, [game.board_state]);

  // Validate and get possible moves for a piece (stub implementation)
  const getPossibleMoves = useCallback(async (piece: ChessPiece): Promise<Position[]> => {
    // STUB: This should validate moves according to chess rules
    // For now, return basic moves based on piece type
    const moves: Position[] = [];
    const { file, rank } = piece.position;
    const fileIndex = FILES.indexOf(file as typeof FILES[number]);

    try {
      // Basic move validation - this is a simplified stub
      switch (piece.type) {
        case 'pawn': {
          const direction = piece.color === 'white' ? 1 : -1;
          const newRank = rank + direction;
          if (newRank >= 1 && newRank <= 8) {
            moves.push({ file, rank: newRank });
            // Double move from starting position
            if (!piece.has_moved && newRank + direction >= 1 && newRank + direction <= 8) {
              moves.push({ file, rank: newRank + direction });
            }
          }
          // Capture moves (diagonal)
          if (fileIndex > 0 && newRank >= 1 && newRank <= 8) {
            moves.push({ file: FILES[fileIndex - 1], rank: newRank });
          }
          if (fileIndex < 7 && newRank >= 1 && newRank <= 8) {
            moves.push({ file: FILES[fileIndex + 1], rank: newRank });
          }
          break;
        }
        
        case 'rook': {
          // Horizontal and vertical moves
          for (let i = 0; i < 8; i++) {
            if (i !== fileIndex) moves.push({ file: FILES[i], rank });
            if (i + 1 !== rank) moves.push({ file, rank: i + 1 });
          }
          break;
        }
        
        case 'knight': {
          const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
          ];
          knightMoves.forEach(([df, dr]) => {
            const newFile = fileIndex + df;
            const newRank = rank + dr;
            if (newFile >= 0 && newFile < 8 && newRank >= 1 && newRank <= 8) {
              moves.push({ file: FILES[newFile], rank: newRank });
            }
          });
          break;
        }
        
        case 'bishop': {
          // Diagonal moves
          for (let i = 1; i < 8; i++) {
            if (fileIndex + i < 8 && rank + i <= 8) moves.push({ file: FILES[fileIndex + i], rank: rank + i });
            if (fileIndex + i < 8 && rank - i >= 1) moves.push({ file: FILES[fileIndex + i], rank: rank - i });
            if (fileIndex - i >= 0 && rank + i <= 8) moves.push({ file: FILES[fileIndex - i], rank: rank + i });
            if (fileIndex - i >= 0 && rank - i >= 1) moves.push({ file: FILES[fileIndex - i], rank: rank - i });
          }
          break;
        }
        
        case 'queen': {
          // Combination of rook and bishop moves
          for (let i = 0; i < 8; i++) {
            if (i !== fileIndex) moves.push({ file: FILES[i], rank });
            if (i + 1 !== rank) moves.push({ file, rank: i + 1 });
          }
          for (let i = 1; i < 8; i++) {
            if (fileIndex + i < 8 && rank + i <= 8) moves.push({ file: FILES[fileIndex + i], rank: rank + i });
            if (fileIndex + i < 8 && rank - i >= 1) moves.push({ file: FILES[fileIndex + i], rank: rank - i });
            if (fileIndex - i >= 0 && rank + i <= 8) moves.push({ file: FILES[fileIndex - i], rank: rank + i });
            if (fileIndex - i >= 0 && rank - i >= 1) moves.push({ file: FILES[fileIndex - i], rank: rank - i });
          }
          break;
        }
        
        case 'king': {
          // One square in any direction
          for (let df = -1; df <= 1; df++) {
            for (let dr = -1; dr <= 1; dr++) {
              if (df === 0 && dr === 0) continue;
              const newFile = fileIndex + df;
              const newRank = rank + dr;
              if (newFile >= 0 && newFile < 8 && newRank >= 1 && newRank <= 8) {
                moves.push({ file: FILES[newFile], rank: newRank });
              }
            }
          }
          break;
        }
      }

      // Filter out moves to squares occupied by own pieces
      return moves.filter(move => {
        const pieceAtTarget = getPieceAtPosition(move.file, move.rank);
        return !pieceAtTarget || pieceAtTarget.color !== piece.color;
      });
    } catch (error) {
      console.error('Error calculating possible moves:', error);
      return [];
    }
  }, [getPieceAtPosition]);

  const handleSquareClick = async (file: string, rank: number) => {
    if (!canMove) return;

    const clickedPiece = getPieceAtPosition(file, rank);
    const clickedPosition: Position = { file, rank };

    // If clicking on a possible move
    if (selectedSquare && possibleMoves.some(move => 
      move.file === file && move.rank === rank
    )) {
      await makeMove(selectedSquare.position, clickedPosition);
      return;
    }

    // If clicking on own piece, select it
    if (clickedPiece && clickedPiece.color === playerColor) {
      setSelectedSquare({ position: clickedPosition, piece: clickedPiece });
      setMoveError(null);
      
      try {
        const moves = await getPossibleMoves(clickedPiece);
        setPossibleMoves(moves);
      } catch (error) {
        console.error('Failed to get possible moves:', error);
        setPossibleMoves([]);
      }
    } else {
      // Clear selection
      setSelectedSquare(null);
      setPossibleMoves([]);
    }
  };

  const makeMove = async (from: Position, to: Position) => {
    setIsMoving(true);
    setMoveError(null);

    try {
      const moveData: MakeMoveInput = {
        game_id: game.id,
        player_id: currentPlayer.id,
        from_position: from,
        to_position: to
      };

      await trpc.makeMove.mutate(moveData);
      setSelectedSquare(null);
      setPossibleMoves([]);
      onMoveCompleted();
    } catch (error) {
      console.error('Failed to make move:', error);
      setMoveError('Invalid move. Please try again.');
    } finally {
      setIsMoving(false);
    }
  };

  const isSquareSelected = (file: string, rank: number): boolean => {
    return selectedSquare?.position.file === file && selectedSquare?.position.rank === rank;
  };

  const isSquarePossibleMove = (file: string, rank: number): boolean => {
    return possibleMoves.some(move => move.file === file && move.rank === rank);
  };

  const getSquareColor = (file: string, rank: number): string => {
    const fileIndex = FILES.indexOf(file as typeof FILES[number]);
    const isLight = (fileIndex + rank) % 2 === 1;
    
    if (isSquareSelected(file, rank)) {
      return 'bg-blue-400';
    }
    if (isSquarePossibleMove(file, rank)) {
      return isLight ? 'bg-green-200' : 'bg-green-300';
    }
    return isLight ? 'bg-amber-100' : 'bg-amber-800';
  };

  return (
    <div className="space-y-4">
      {moveError && (
        <Alert variant="destructive">
          <AlertDescription>{moveError}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant={canMove ? 'default' : 'secondary'}>
            {canMove ? 'Your Turn' : 'Opponent\'s Turn'}
          </Badge>
          {game.in_check && (
            <Badge variant="destructive">
              Check!
            </Badge>
          )}
        </div>
        {isMoving && (
          <Badge variant="outline">Making move...</Badge>
        )}
      </div>

      <div className="inline-block border-4 border-gray-800 bg-gray-800">
        {/* Board squares */}
        <div className="grid grid-cols-8 gap-0">
          {RANKS.map(rank => 
            FILES.map(file => {
              const piece = getPieceAtPosition(file, rank);
              const squareColor = getSquareColor(file, rank);
              
              return (
                <div
                  key={`${file}${rank}`}
                  className={`w-16 h-16 flex items-center justify-center cursor-pointer relative ${squareColor} hover:brightness-110 transition-all`}
                  onClick={() => handleSquareClick(file, rank)}
                >
                  {/* Coordinate labels */}
                  {file === 'a' && (
                    <span className="absolute top-1 left-1 text-xs font-bold opacity-60">
                      {rank}
                    </span>
                  )}
                  {rank === 1 && (
                    <span className="absolute bottom-1 right-1 text-xs font-bold opacity-60">
                      {file}
                    </span>
                  )}
                  
                  {/* Chess piece */}
                  {piece && (
                    <span className="text-4xl select-none">
                      {PIECE_SYMBOLS[piece.color][piece.type]}
                    </span>
                  )}
                  
                  {/* Possible move indicator */}
                  {isSquarePossibleMove(file, rank) && !piece && (
                    <div className="w-4 h-4 bg-green-600 rounded-full opacity-60"></div>
                  )}
                  
                  {/* Attack indicator */}
                  {isSquarePossibleMove(file, rank) && piece && (
                    <div className="absolute inset-0 border-4 border-red-500 rounded opacity-60"></div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Game status */}
      <div className="text-sm text-gray-600">
        <p>Playing as: <span className="font-semibold capitalize">{playerColor}</span></p>
        {game.status === 'waiting' && (
          <p>Waiting for opponent to join...</p>
        )}
        {game.status === 'finished' && game.result && (
          <p className="font-semibold">Game finished: {game.result.replace('_', ' ')}</p>
        )}
      </div>
    </div>
  );
}
