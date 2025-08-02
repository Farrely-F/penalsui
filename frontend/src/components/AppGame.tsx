import { useState, useEffect } from "react";
import { useCurrentAccount, ConnectButton } from "@mysten/dapp-kit";
import { GameLobby } from "./GameLobby";
import { GameInterface } from "./GameInterface";
import { ShareableRoom } from "./ShareableRoom";
import { useGameState } from "../hooks/useGameContract";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";

type AppState = "lobby" | "waiting" | "game";

export function AppGame() {
  const [appState, setAppState] = useState<AppState>("lobby");
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const currentAccount = useCurrentAccount();
  const { data: gameState } = useGameState(currentGameId);
  const navigate = useNavigate();

  // Game state persistence
  useEffect(() => {
    if (currentAccount) {
      const savedGameId = localStorage.getItem(
        `penalsui_game_${currentAccount.address}`,
      );
      if (savedGameId && !currentGameId) {
        setCurrentGameId(savedGameId);
        setAppState("game");
        toast.info("Resumed your previous game!");
      }
    }
  }, [currentAccount, currentGameId]);

  // Save game ID to localStorage when it changes
  useEffect(() => {
    if (currentAccount && currentGameId) {
      localStorage.setItem(
        `penalsui_game_${currentAccount.address}`,
        currentGameId,
      );
    }
  }, [currentAccount, currentGameId]);

  // Clear saved game if it's finished
  useEffect(() => {
    if (currentAccount && gameState?.finished) {
      localStorage.removeItem(`penalsui_game_${currentAccount.address}`);
    }
  }, [currentAccount, gameState?.finished]);

  // Auto-transition from waiting to game when second player joins
  useEffect(() => {
    if (appState === "waiting" && gameState?.player2) {
      setAppState("game");
      toast.success("Opponent joined! Game starting...");
    }
  }, [appState, gameState?.player2]);

  const handleGameCreated = (gameId: string) => {
    setCurrentGameId(gameId);
    setAppState("waiting");
  };

  const handleGameJoined = (gameId: string) => {
    setCurrentGameId(gameId);
    setAppState("game");
  };

  const handleBackToLobby = () => {
    setAppState("lobby");
    // Don't clear the current game ID or localStorage immediately
    // This allows users to rejoin their active game
  };

  const handleLeaveGame = () => {
    setAppState("lobby");
    setCurrentGameId(null);
    // Clear saved game when user explicitly leaves
    if (currentAccount) {
      localStorage.removeItem(`penalsui_game_${currentAccount.address}`);
    }
  };

  const handleBackToHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Header */}
      <header className="z-50 sticky top-0 left-0 flex justify-center items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-full">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {(appState === "game" || appState === "waiting") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToLobby}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Lobby
                </Button>
              )}
              {appState === "lobby" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToHome}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Home
                </Button>
              )}
              <img src="/icon.png" className="size-8" />
              <h1 className="text-xl font-bold">PenalSUI</h1>
            </div>

            <div className="flex items-center gap-4">
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 backdrop-blur-sm">
        <AnimatePresence mode="wait">
          {appState === "lobby" && (
            <motion.div
              key="lobby"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GameLobby
                onGameCreated={handleGameCreated}
                onGameJoined={handleGameJoined}
                currentGameId={currentGameId}
                onLeaveGame={handleLeaveGame}
              />
            </motion.div>
          )}

          {appState === "waiting" && currentGameId && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ShareableRoom
                gameId={currentGameId}
                onBackToLobby={handleBackToLobby}
                onLeaveGame={handleLeaveGame}
              />
            </motion.div>
          )}

          {appState === "game" && currentGameId && (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GameInterface
                gameId={currentGameId}
                onBackToLobby={handleBackToLobby}
                onLeaveGame={handleLeaveGame}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
