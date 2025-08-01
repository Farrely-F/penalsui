import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import {
  useGameState,
  useCurrentRoundInfo,
  useStartGame,
  useShoot,
  useKeep,
} from "../hooks/useGameContract";
import { useGoalAudio } from "../hooks/useGoalAudio";
import { CONTRACT_CONFIG, Direction } from "../contracts/config";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PenalSUIHeader,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Progress } from "./ui/progress";
import { Loader2, Target, Shield, Trophy, Users, Play } from "lucide-react";
import { toast } from "sonner";

interface GameInterfaceProps {
  gameId: string;
  onBackToLobby: () => void;
}

const DIRECTION_NAMES = {
  [CONTRACT_CONFIG.DIRECTIONS.LEFT]: "Left",
  [CONTRACT_CONFIG.DIRECTIONS.CENTER]: "Center",
  [CONTRACT_CONFIG.DIRECTIONS.RIGHT]: "Right",
} as const;

const DIRECTION_EMOJIS = {
  [CONTRACT_CONFIG.DIRECTIONS.LEFT]: "⬅️",
  [CONTRACT_CONFIG.DIRECTIONS.CENTER]: "⬆️",
  [CONTRACT_CONFIG.DIRECTIONS.RIGHT]: "➡️",
} as const;

export function GameInterface({ gameId, onBackToLobby }: GameInterfaceProps) {
  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(
    null,
  );
  const currentAccount = useCurrentAccount();

  const { data: gameState, isLoading: gameLoading } = useGameState(gameId);
  const { data: roundInfo, isLoading: roundLoading } =
    useCurrentRoundInfo(gameId);

  const startGameMutation = useStartGame();
  const shootMutation = useShoot();
  const keepMutation = useKeep();

  // Hook to play goal audio when user scores
  useGoalAudio(gameState);

  const isLoading = gameLoading || roundLoading;

  // Determine if current user is shooter or keeper this round
  const isShooter = roundInfo?.shooter === currentAccount?.address;
  const isKeeper = roundInfo?.keeper === currentAccount?.address;

  // Debug logging
  // console.log("GameInterface Debug:", {
  //   roundInfo,
  //   currentAccount: currentAccount?.address,
  //   isShooter,
  //   isKeeper,
  //   gameState,
  // });

  const handleStartGame = async () => {
    try {
      await startGameMutation.mutateAsync(gameId);
      toast.success("Game started!");
    } catch (error) {
      console.error("Error starting game:", error);
      toast.error("Failed to start game");
    }
  };

  const handleSubmitMove = async () => {
    if (selectedDirection === null) {
      toast.error("Please select a direction");
      return;
    }

    try {
      if (isShooter) {
        await shootMutation.mutateAsync({
          gameId,
          direction: selectedDirection!,
        });
        toast.success("Shot submitted!");
      } else if (isKeeper) {
        await keepMutation.mutateAsync({
          gameId,
          direction: selectedDirection!,
        });
        toast.success("Dive submitted!");
      }
      setSelectedDirection(null);
    } catch (error) {
      console.error("Error submitting move:", error);
      toast.error("Failed to submit move");
    }
  };

  const renderDirectionButtons = () => {
    const directions: Direction[] = [
      CONTRACT_CONFIG.DIRECTIONS.LEFT,
      CONTRACT_CONFIG.DIRECTIONS.CENTER,
      CONTRACT_CONFIG.DIRECTIONS.RIGHT,
    ];

    return (
      <div className="grid grid-cols-3 gap-4">
        {directions.map((direction) => (
          <Button
            key={direction}
            variant={selectedDirection === direction ? "default" : "outline"}
            size="lg"
            onClick={() => setSelectedDirection(direction)}
            className="h-20 flex flex-col gap-2"
          >
            <span className="text-2xl">{DIRECTION_EMOJIS[direction]}</span>
            <span className="text-sm">{DIRECTION_NAMES[direction]}</span>
          </Button>
        ))}
      </div>
    );
  };

  const renderGameStatus = () => {
    if (!gameState) return null;

    if (!gameState.started) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Waiting to Start
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {gameState.player2
                  ? "Both players joined! Ready to start?"
                  : "Waiting for second player..."}
              </p>

              {gameState.player2 && (
                <Button
                  onClick={handleStartGame}
                  disabled={startGameMutation.isPending}
                >
                  {startGameMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Game
                    </>
                  )}
                </Button>
              )}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Player 1:</span>
                <span className="font-mono text-xs">
                  {gameState.player1.slice(0, 6)}...
                  {gameState.player1.slice(-4)}
                </span>
              </div>
              {gameState.player2 && (
                <div className="flex justify-between">
                  <span>Player 2:</span>
                  <span className="font-mono text-xs">
                    {gameState.player2.slice(0, 6)}...
                    {gameState.player2.slice(-4)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (gameState.finished) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5" />
              Game Finished!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center flex flex-col gap-4">
            <div className="text-2xl font-bold">
              Final Score: {gameState.player1Score} - {gameState.player2Score}
            </div>

            {gameState.winner ? (
              <div className="text-lg">
                🏆 Winner:{" "}
                {gameState.winner === currentAccount?.address
                  ? "You!"
                  : "Opponent"}
              </div>
            ) : (
              <div className="text-lg">🤝 It's a draw!</div>
            )}

            <Button onClick={onBackToLobby} className="mt-4">
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  const renderGameplay = () => {
    if (!gameState?.started || gameState.finished || !roundInfo) {
      return null;
    }

    const progress =
      ((gameState.currentRound - 1) / CONTRACT_CONFIG.MAX_ROUNDS) * 100;

    return (
      <div className="space-y-6">
        {/* Score and Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-3xl font-bold">
                {gameState.player1Score} - {gameState.player2Score}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    Round {gameState.currentRound} of{" "}
                    {CONTRACT_CONFIG.MAX_ROUNDS}
                  </span>
                  <span>{Math.round(progress)}% Complete</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Round */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isShooter ? (
                <>
                  <Target className="h-5 w-5" />
                  Your Turn to Shoot
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  Your Turn to Dive
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isShooter
                ? "Choose where to shoot the ball"
                : "Guess where the opponent will shoot"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {(() => {
              // Check if current player has already submitted their move
              const hasSubmittedMove = isShooter
                ? roundInfo.shootSubmitted
                : roundInfo.keepSubmitted;

              // If both moves submitted, show resolving message
              if (roundInfo.shootSubmitted && roundInfo.keepSubmitted) {
                return (
                  <div className="text-center py-8">
                    <div className="text-lg font-medium mb-2">
                      ⏳ Resolving round...
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Both players have submitted their moves
                    </div>
                  </div>
                );
              }

              // If current player hasn't submitted, allow them to play
              if (!hasSubmittedMove) {
                return (
                  <>
                    {renderDirectionButtons()}

                    <Button
                      onClick={handleSubmitMove}
                      disabled={
                        selectedDirection === null ||
                        shootMutation.isPending ||
                        keepMutation.isPending
                      }
                      className="w-full"
                      size="lg"
                    >
                      {shootMutation.isPending || keepMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>{isShooter ? "🥅 Shoot!" : "🧤 Dive!"}</>
                      )}
                    </Button>
                  </>
                );
              }

              // Current player has submitted, waiting for opponent
              return (
                <div className="text-center py-8">
                  <div className="text-lg font-medium mb-2">
                    ✅ Move submitted!
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Waiting for opponent to submit their move...
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Round Status */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <Badge
                  variant={roundInfo.shootSubmitted ? "default" : "secondary"}
                >
                  {roundInfo.shootSubmitted
                    ? "✅ Shot Submitted"
                    : "⏳ Waiting for Shot"}
                </Badge>
              </div>
              <div>
                <Badge
                  variant={roundInfo.keepSubmitted ? "default" : "secondary"}
                >
                  {roundInfo.keepSubmitted
                    ? "✅ Dive Submitted"
                    : "⏳ Waiting for Dive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading game...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!gameState) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-lg font-medium mb-4">Game not found</p>
            <Button onClick={onBackToLobby}>Back to Lobby</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-4">
      <Card>
        <CardHeader>
          <PenalSUIHeader />
          <CardDescription className="text-center">
            Game ID:{" "}
            <span className="font-mono text-xs">
              {gameId.slice(0, 8)}...{gameId.slice(-6)}
            </span>
          </CardDescription>
        </CardHeader>
      </Card>

      {renderGameStatus()}
      {renderGameplay()}
    </div>
  );
}
