import { useState, useEffect } from "react";
import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { GameLobby } from "./components/GameLobby";
import { GameInterface } from "./components/GameInterface";
import { useGameState } from "./hooks/useGameContract";
import { Button } from "./components/ui/button";
import { Card, CardContent } from "./components/ui/card";
import { Toaster } from "./components/ui/sonner";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type AppState = "lobby" | "game";

function App() {
  const [appState, setAppState] = useState<AppState>("lobby");
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const currentAccount = useCurrentAccount();
  const { data: gameState } = useGameState(currentGameId);

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

  const handleGameCreated = (gameId: string) => {
    setCurrentGameId(gameId);
    setAppState("game");
  };

  const handleGameJoined = (gameId: string) => {
    setCurrentGameId(gameId);
    setAppState("game");
  };

  const handleBackToLobby = () => {
    setAppState("lobby");
    setCurrentGameId(null);
    // Clear saved game when manually going back to lobby
    if (currentAccount) {
      localStorage.removeItem(`penalsui_game_${currentAccount.address}`);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
        {/* Header */}
        <header className="flex justify-center items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-full">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {appState === "game" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToLobby}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}
                <h1 className="text-xl font-bold">⚽ PenalSUI</h1>
              </div>

              <div className="flex items-center gap-4">
                <ConnectButton />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container min-h-dvh lg:max-h-[1080px] mx-auto px-4 py-8 flex flex-col justify-center items-center">
          {!currentAccount ? (
            <Card className="w-full max-w-md mx-auto">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="text-6xl mb-4">⚽</div>
                  <h2 className="text-2xl font-bold">Welcome to PenalSUI</h2>
                  <p className="text-muted-foreground">
                    Connect your SUI wallet to start playing penalty shootout
                    games on the blockchain!
                  </p>
                  <div className="pt-4">
                    <ConnectButton />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {appState === "lobby" && (
                <GameLobby
                  onGameCreated={handleGameCreated}
                  onGameJoined={handleGameJoined}
                />
              )}

              {appState === "game" && currentGameId && (
                <GameInterface
                  gameId={currentGameId}
                  onBackToLobby={handleBackToLobby}
                />
              )}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t mt-auto w-full flex flex-col justify-between items-center">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Built on{" "}
                <a
                  href="https://sui.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-4"
                >
                  SUI Blockchain
                </a>{" "}
                • Real-time PvP Penalty Shootout Game
              </p>
            </div>
          </div>
        </footer>
      </div>

      <Toaster />
    </>
  );
}

export default App;
