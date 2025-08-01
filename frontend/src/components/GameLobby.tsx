import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import {
  useCreateGame,
  useJoinGame,
  useAvailableGames,
} from "../hooks/useGameContract";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";

import { Loader2, Plus, Users, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";

interface GameLobbyProps {
  onGameCreated: (gameId: string) => void;
  onGameJoined: (gameId: string) => void;
}

export function GameLobby({ onGameCreated, onGameJoined }: GameLobbyProps) {
  const [gameIdToJoin, setGameIdToJoin] = useState("");
  const currentAccount = useCurrentAccount();
  const createGameMutation = useCreateGame();
  const joinGameMutation = useJoinGame();
  const {
    data: availableGames,
    isLoading: gamesLoading,
    refetch: refetchGames,
  } = useAvailableGames();

  // Debug logging
  console.log("GameLobby Debug:", {
    availableGames,
    gamesLoading,
    currentAccount: currentAccount?.address,
  });

  const handleCreateGame = async () => {
    if (!currentAccount) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      const result = await createGameMutation.mutateAsync();

      // Extract game ID from the result
      const gameId = (result as any).gameId;

      if (gameId) {
        toast.success("Game created successfully!");
        onGameCreated(gameId);
      } else {
        toast.error("Failed to create game - no game ID found");
        console.error("Create game result:", result);
      }
    } catch (error) {
      console.error("Error creating game:", error);
      toast.error(
        `Failed to create game: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleJoinGame = async (gameId?: string) => {
    if (!currentAccount) {
      toast.error("Please connect your wallet first");
      return;
    }

    const targetGameId = gameId || gameIdToJoin.trim();
    if (!targetGameId) {
      toast.error("Please enter a game ID");
      return;
    }

    try {
      await joinGameMutation.mutateAsync(targetGameId);
      toast.success("Joined game successfully!");
      onGameJoined(targetGameId);
      setGameIdToJoin(""); // Clear the input after successful join
    } catch (error) {
      console.error("Error joining game:", error);
      toast.error(
        `Failed to join game: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  if (!currentAccount) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">⚽ PenalSUI</CardTitle>
          <CardDescription>
            Connect your wallet to start playing penalty shootout games on SUI
            blockchain
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 flex flex-col gap-2">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            ⚽ PenalSUI
          </CardTitle>
          <CardDescription className="text-lg">
            Real-time penalty shootout game on SUI blockchain
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Game */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Game
            </CardTitle>
            <CardDescription>
              Start a new penalty shootout match and wait for an opponent
            </CardDescription>
          </CardHeader>
          <CardFooter className="mt-auto">
            <Button
              onClick={handleCreateGame}
              disabled={createGameMutation.isPending}
              className="w-full"
              size="lg"
            >
              {createGameMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Game...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Game
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Join Game */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Join Existing Game
            </CardTitle>
            <CardDescription>
              Enter a game ID to join an existing match
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex flex-col gap-2">
            <div className="space-y-2 flex flex-col gap-2">
              <Label htmlFor="gameId">Game ID</Label>
              <Input
                id="gameId"
                placeholder="0x..."
                value={gameIdToJoin}
                onChange={(e) => setGameIdToJoin(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <Button
              onClick={() => handleJoinGame()}
              disabled={joinGameMutation.isPending || !gameIdToJoin.trim()}
              className="w-full"
              size="lg"
            >
              {joinGameMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining Game...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Join Game
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Available Games Browser */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Available Games
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchGames()}
              disabled={gamesLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${gamesLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </CardTitle>
          <CardDescription>
            Join an existing game waiting for a second player
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gamesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading available games...</span>
            </div>
          ) : availableGames && availableGames.length > 0 ? (
            <div className="space-y-3">
              {availableGames.map(({ gameId, gameState }) => (
                <div
                  key={gameId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">Waiting for Player</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>
                        Creator: {gameState.player1.slice(0, 6)}...
                        {gameState.player1.slice(-4)}
                      </div>
                      <div className="font-mono text-xs mt-1">
                        ID: {gameId.slice(0, 8)}...{gameId.slice(-6)}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleJoinGame(gameId)}
                    disabled={
                      joinGameMutation.isPending ||
                      gameState.player1 === currentAccount?.address
                    }
                    size="sm"
                  >
                    {gameState.player1 === currentAccount?.address ? (
                      "Your Game"
                    ) : joinGameMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Join Game"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 flex flex-col gap-2 justify-center items-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No available games at the moment</p>
              <p className="text-sm">Create a new game or check back later!</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">🎮 How to Play:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <strong>1. Create/Join</strong>
                <br />
                Start or join a game with another player
              </div>
              <div>
                <strong>2. Take Turns</strong>
                <br />
                Alternate between shooting and goalkeeping
              </div>
              <div>
                <strong>3. Win</strong>
                <br />
                Score more goals in 5 rounds to win!
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
