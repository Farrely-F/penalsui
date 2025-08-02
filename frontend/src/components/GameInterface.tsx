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
import {
  Loader2,
  Target,
  Shield,
  Trophy,
  Play,
  LogOut,
  Loader,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import CopyButton from "./ui/copy-button";

interface GameInterfaceProps {
  gameId: string;
  onBackToLobby: () => void;
  onLeaveGame?: () => void;
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

export function GameInterface({
  gameId,
  onBackToLobby,
  onLeaveGame,
}: GameInterfaceProps) {
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
      <motion.div
        className="grid grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, staggerChildren: 0.1 }}
      >
        {directions.map((direction, index) => (
          <motion.div
            key={direction}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant={selectedDirection === direction ? "default" : "outline"}
              size="lg"
              onClick={() => setSelectedDirection(direction)}
              className="h-20 flex flex-col gap-2 w-full transition-all duration-200"
            >
              <motion.span
                className="text-2xl"
                animate={
                  selectedDirection === direction
                    ? {
                        scale: [1, 1.2, 1],
                        rotate: [0, 10, -10, 0],
                      }
                    : {}
                }
                transition={{ duration: 0.3 }}
              >
                {DIRECTION_EMOJIS[direction]}
              </motion.span>
              <span className="text-sm">{DIRECTION_NAMES[direction]}</span>
            </Button>
          </motion.div>
        ))}
      </motion.div>
    );
  };

  const renderGameStatus = () => {
    if (!gameState) return null;

    if (!gameState.started) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Loader className="h-5 w-5" />
                </motion.div>
                Waiting to Start
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="text-center">
                <motion.p
                  className="text-sm text-muted-foreground mb-4"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {gameState.player2
                    ? "Both players joined! Ready to start?"
                    : "Waiting for second player..."}
                </motion.p>

                <AnimatePresence>
                  {gameState.player2 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                    >
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
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              <Play className="mr-2 h-4 w-4" />
                            </motion.div>
                            Start Game
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
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
        </motion.div>
      );
    }

    if (gameState.finished) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <motion.div
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                    scale: { duration: 1, repeat: Infinity },
                  }}
                >
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </motion.div>
                Game Finished!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center flex flex-col gap-4">
              <motion.div
                className="text-2xl font-bold"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              >
                Final Score: {gameState.player1Score} - {gameState.player2Score}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {gameState.winner ? (
                  <motion.div
                    className="text-lg"
                    animate={
                      gameState.winner === currentAccount?.address
                        ? {
                            scale: [1, 1.1, 1],
                            color: ["#000", "#22c55e", "#000"],
                          }
                        : {}
                    }
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🏆 Winner:{" "}
                    {gameState.winner === currentAccount?.address
                      ? "You!"
                      : "Opponent"}
                  </motion.div>
                ) : (
                  <div className="text-lg">🤝 It's a draw!</div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex justify-center gap-2 mt-4"
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button onClick={onBackToLobby} variant="outline">
                    Back to Lobby
                  </Button>
                </motion.div>
                {onLeaveGame && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button onClick={onLeaveGame} variant="destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Leave Game
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
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
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Score and Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <motion.div
                  className="text-3xl font-bold"
                  key={`${gameState.player1Score}-${gameState.player2Score}`}
                  initial={{ scale: 1.2, color: "#22c55e" }}
                  animate={{ scale: 1, color: "inherit" }}
                  transition={{ duration: 0.3 }}
                >
                  {gameState.player1Score} - {gameState.player2Score}
                </motion.div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      Round {gameState.currentRound} of{" "}
                      {CONTRACT_CONFIG.MAX_ROUNDS}
                    </span>
                    <span>{Math.round(progress)}% Complete</span>
                  </div>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                  >
                    <Progress value={progress} className="h-2" />
                  </motion.div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Current Round */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isShooter ? (
                  <>
                    <motion.div
                      animate={{
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Target className="h-5 w-5 text-red-500" />
                    </motion.div>
                    Your Turn to Shoot
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{
                        x: [-2, 2, -2, 2, 0],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Shield className="h-5 w-5 text-blue-500" />
                    </motion.div>
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
        </motion.div>
      </motion.div>
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
            <div className="flex gap-2 justify-center">
              <Button onClick={onBackToLobby} variant="outline">
                Back to Lobby
              </Button>
              {onLeaveGame && (
                <Button onClick={onLeaveGame} variant="destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Leave Game
                </Button>
              )}
            </div>
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
          <CardDescription className="text-center flex items-center gap-2 justify-center">
            Game ID:{" "}
            <span className="font-mono text-xs">
              {gameId.slice(0, 8)}...{gameId.slice(-6)}
            </span>
            <CopyButton text={gameId} variant="icon" />
          </CardDescription>
        </CardHeader>
      </Card>

      {renderGameStatus()}
      {renderGameplay()}
    </div>
  );
}
