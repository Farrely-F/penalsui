import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import {
  useCreateGame,
  useJoinGame,
  useAvailableGames,
  useUserActiveGames,
  useGameState,
} from "../hooks/useGameContract";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  PenalSUIHeader,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

import {
  Loader2,
  Plus,
  Users,
  RefreshCw,
  Clock,
  Play,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import CopyButton from "./ui/copy-button";

interface GameLobbyProps {
  onGameCreated: (gameId: string) => void;
  onGameJoined: (gameId: string) => void;
  currentGameId?: string | null;
  onLeaveGame?: () => void;
}

export function GameLobby({
  onGameCreated,
  onGameJoined,
  currentGameId,
  onLeaveGame,
}: GameLobbyProps) {
  const [gameIdToJoin, setGameIdToJoin] = useState("");
  const currentAccount = useCurrentAccount();
  const createGameMutation = useCreateGame();
  const joinGameMutation = useJoinGame();
  const {
    data: availableGames,
    isLoading: gamesLoading,
    refetch: refetchGames,
  } = useAvailableGames();

  const {
    data: userActiveGames,
    isLoading: userActiveGamesLoading,
    refetch: refetchUserActiveGames,
  } = useUserActiveGames();

  // Find if user is a participant in any available game (as creator)
  const userActiveGame = availableGames?.find(
    ({ gameState }) =>
      currentAccount && gameState.player1 === currentAccount.address,
  );

  // Find user's active game from the new hook
  const userActiveGameFromHook = userActiveGames?.[0]; // Take the first active game

  // Use the detected active game, user's active game from hook, or the provided currentGameId
  const effectiveGameId =
    userActiveGame?.gameId || userActiveGameFromHook?.gameId || currentGameId;
  const { data: currentGameState } = useGameState(effectiveGameId || null);

  // Check if current user is a participant in the game
  const isUserInGame =
    currentGameState &&
    currentAccount &&
    (currentGameState.player1 === currentAccount.address ||
      currentGameState.player2 === currentAccount.address);

  // Determine if the game can be rejoined
  const canRejoinGame =
    effectiveGameId &&
    currentGameState &&
    !currentGameState.finished &&
    isUserInGame;

  // Note: We detect userActiveGame but don't automatically set it
  // Users can manually rejoin from the available games list

  // Debug logging
  // console.log("GameLobby Debug:", {
  //   availableGames,
  //   gamesLoading,
  //   currentAccount: currentAccount?.address,
  // });

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
        throw new Error("Game ID not found in transaction result");
      }
    } catch (error) {
      console.error("Error creating game:", error);
      toast.error(
        `Failed to create game: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
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
      // Check if this is a rejoin case (user is already a participant in available or user active games)
      const targetGame =
        availableGames?.find((game) => game.gameId === targetGameId) ||
        userActiveGames?.find((game) => game.gameId === targetGameId);
      const isRejoinCase =
        targetGame &&
        currentAccount &&
        (targetGame.gameState.player1 === currentAccount.address ||
          targetGame.gameState.player2 === currentAccount.address);

      if (isRejoinCase) {
        // Direct rejoin without contract call
        toast.success("Rejoined your game!");
        onGameJoined(targetGameId);
        setGameIdToJoin("");
        return;
      }

      // Check if this is the user's current active game and they can rejoin
      if (targetGameId === effectiveGameId && canRejoinGame) {
        toast.success("Rejoined your active game!");
        onGameJoined(targetGameId);
        setGameIdToJoin("");
        return;
      }

      // If trying to join current game but can't rejoin, show appropriate message
      if (targetGameId === effectiveGameId && !canRejoinGame) {
        if (currentGameState?.finished) {
          toast.error("This game has already finished");
        } else if (!isUserInGame) {
          toast.error("You are not a participant in this game");
        } else {
          toast.error("Cannot rejoin this game");
        }
        return;
      }

      // Regular join case - call the contract
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

  const handleResumeGame = () => {
    if (effectiveGameId && canRejoinGame) {
      onGameJoined(effectiveGameId);
      toast.success("Resumed your active game!");
    } else {
      toast.error("Cannot resume this game");
    }
  };

  if (!currentAccount) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <CardTitle className="text-2xl font-bold">⚽ PenalSUI</CardTitle>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <CardDescription>
                Connect your wallet to start playing penalty shootout games on
                SUI blockchain
              </CardDescription>
            </motion.div>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto space-y-6 flex flex-col gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="text-center">
            <PenalSUIHeader />
            <CardDescription className="text-lg">
              Real-time penalty shootout game on SUI blockchain
            </CardDescription>
          </CardHeader>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Tabs
          defaultValue={canRejoinGame ? "active" : "available"}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Available Games
            </TabsTrigger>
            <TabsTrigger
              value="active"
              className="flex items-center gap-2"
              disabled={!canRejoinGame}
            >
              <Play className="h-4 w-4" />
              My Active Game
              {canRejoinGame && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  1
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Create Game */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <motion.div
                        animate={{ y: [-2, 0, -2] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        ⚽
                      </motion.div>
                      Create New Game
                    </CardTitle>
                    <CardDescription>
                      Start a new penalty shootout match and wait for an
                      opponent
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="mt-auto">
                    <motion.div
                      className="w-full"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
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
                    </motion.div>
                  </CardFooter>
                </Card>
              </motion.div>

              {/* Join Game */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Join Existing Game
                    </CardTitle>
                    <CardDescription>
                      Enter a game ID to join an existing match
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="gameId">Game ID</Label>
                      <Input
                        id="gameId"
                        placeholder="Enter game ID..."
                        value={gameIdToJoin}
                        onChange={(e) => setGameIdToJoin(e.target.value)}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !joinGameMutation.isPending
                          ) {
                            handleJoinGame();
                          }
                        }}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      onClick={() => handleJoinGame()}
                      disabled={
                        joinGameMutation.isPending || !gameIdToJoin.trim()
                      }
                      className="w-full"
                      size="lg"
                    >
                      {joinGameMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        <>
                          <Users className="mr-2 h-4 w-4" />
                          Join Game
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
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
                    onClick={() => {
                      refetchGames();
                      refetchUserActiveGames();
                    }}
                    disabled={gamesLoading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${gamesLoading ? "animate-spin" : ""}`}
                    />
                  </Button>
                </CardTitle>
                <CardDescription>
                  Join an existing game or rejoin your active games
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[calc(100vh-30rem)] overflow-auto">
                {gamesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading available games...</span>
                  </div>
                ) : availableGames && availableGames.length > 0 ? (
                  <div className="space-y-3">
                    {availableGames.map(({ gameId, gameState }) => {
                      const isUserParticipant =
                        currentAccount &&
                        (gameState.player1 === currentAccount.address ||
                          gameState.player2 === currentAccount.address);
                      const isCreator =
                        gameState.player1 === currentAccount?.address;
                      const isPlayer2 =
                        gameState.player2 === currentAccount?.address;

                      return (
                        <div
                          key={gameId}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {isUserParticipant ? (
                                <Badge
                                  variant="default"
                                  className="bg-green-600"
                                >
                                  Your Active Game
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Waiting for Player
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <div>
                                Creator: {gameState.player1.slice(0, 6)}...
                                {gameState.player1.slice(-4)}
                                {isCreator && " (You)"}
                              </div>
                              {gameState.player2 && (
                                <div>
                                  Player 2: {gameState.player2.slice(0, 6)}...
                                  {gameState.player2.slice(-4)}
                                  {isPlayer2 && " (You)"}
                                </div>
                              )}
                              <div className="font-mono text-xs mt-1 flex items-center gap-2">
                                ID: {gameId.slice(0, 8)}...{gameId.slice(-6)}
                                <CopyButton text={gameId} variant="icon" />
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleJoinGame(gameId)}
                            disabled={joinGameMutation.isPending}
                            size="sm"
                            variant={isUserParticipant ? "default" : "outline"}
                          >
                            {joinGameMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                {isUserParticipant
                                  ? "Rejoining..."
                                  : "Joining..."}
                              </>
                            ) : isUserParticipant ? (
                              <>
                                <Play className="mr-2 h-3 w-3" />
                                Rejoin Game
                              </>
                            ) : (
                              "Join Game"
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 flex flex-col gap-2 justify-center items-center text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No available games at the moment</p>
                    <p className="text-sm">
                      Create a new game or check back later!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="active" className="space-y-6">
            {canRejoinGame && (
              <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Play className="h-5 w-5" />
                    Resume Active Game
                  </CardTitle>
                  <CardDescription className="text-green-600 dark:text-green-400">
                    You have an active game in progress
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Game ID:</span>
                      <span className="font-mono text-xs">
                        {effectiveGameId?.slice(0, 8)}...
                        {effectiveGameId?.slice(-6)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant="secondary">
                        {!currentGameState?.started
                          ? "Waiting for opponent"
                          : currentGameState?.finished
                            ? "Finished"
                            : "In Progress"}
                      </Badge>
                    </div>
                    {currentGameState?.started && (
                      <div className="flex justify-between">
                        <span>Score:</span>
                        <span className="font-mono">
                          {currentGameState.player1Score} -{" "}
                          {currentGameState.player2Score}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleResumeGame}
                      className="flex-1"
                      size="sm"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Resume Game
                    </Button>
                    {onLeaveGame && (
                      <Button
                        onClick={onLeaveGame}
                        variant="destructive"
                        size="sm"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Leave Game
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Show user active games */}
            {userActiveGames && userActiveGames.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Your Active Games
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        refetchGames();
                        refetchUserActiveGames();
                      }}
                      disabled={userActiveGamesLoading}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${userActiveGamesLoading ? "animate-spin" : ""}`}
                      />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Your active games that you can rejoin
                  </CardDescription>
                </CardHeader>
                <CardContent className="max-h-[calc(100vh-30rem)] overflow-auto">
                  {userActiveGamesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading your active games...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userActiveGames.map(({ gameId, gameState }) => {
                        const isPlayer1 =
                          gameState.player1 === currentAccount?.address;
                        const isPlayer2 =
                          gameState.player2 === currentAccount?.address;

                        return (
                          <div
                            key={gameId}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="default"
                                  className="bg-green-600"
                                >
                                  Your Active Game{" "}
                                  {isPlayer1 ? "(Creator)" : "(Player 2)"}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                <div>
                                  Creator: {gameState.player1.slice(0, 6)}...
                                  {gameState.player1.slice(-4)}
                                  {isPlayer1 && " (You)"}
                                </div>
                                {gameState.player2 && (
                                  <div>
                                    Player 2: {gameState.player2.slice(0, 6)}...
                                    {gameState.player2.slice(-4)}
                                    {isPlayer2 && " (You)"}
                                  </div>
                                )}
                                <div className="font-mono text-xs mt-1 flex items-center gap-2">
                                  ID: {gameId.slice(0, 8)}...{gameId.slice(-6)}
                                  <CopyButton text={gameId} variant="icon" />
                                </div>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleJoinGame(gameId)}
                              disabled={joinGameMutation.isPending}
                              size="sm"
                              variant="default"
                            >
                              {joinGameMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                  Rejoining...
                                </>
                              ) : (
                                <>
                                  <Play className="mr-2 h-3 w-3" />
                                  Rejoin Game
                                </>
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Show empty state when no active or user active games */}
            {!canRejoinGame &&
              (!userActiveGames || userActiveGames.length === 0) && (
                <div className="text-center py-8 flex flex-col gap-2 justify-center items-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active games</p>
                  <p className="text-sm">
                    Create a new game or join an available game to get started!
                  </p>
                </div>
              )}
          </TabsContent>
        </Tabs>
      </motion.div>

      <Card>
        <CardHeader className="text-center">
          <p className="mb-2">🎮 How to Play:</p>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-muted-foreground">
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
    </motion.div>
  );
}
