import { useState } from "react";
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
import { Copy, Check, Users, Clock } from "lucide-react";
import { toast } from "sonner";

interface ShareableRoomProps {
  gameId: string;
  onBackToLobby: () => void;
}

export function ShareableRoom({ gameId, onBackToLobby }: ShareableRoomProps) {
  const [copied, setCopied] = useState(false);

  const shareMessage = `I challenge you to duel a penalty game with me.
here is my room details:
Game ID: ${gameId}

come join and proof you're the worthy opponent.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      toast.success("Challenge message copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleCopyGameId = async () => {
    try {
      await navigator.clipboard.writeText(gameId);
      toast.success("Game ID copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy Game ID");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader className="text-center">
          <PenalSUIHeader />
          <CardDescription className="text-lg">
            Real-time penalty shootout game on SUI blockchain
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 animate-pulse" />
            Waiting for Opponent
          </CardTitle>
          <CardDescription>
            Your game room is ready! Share the details below to invite an
            opponent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Game Status */}
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              <Users className="h-4 w-4 mr-1" />
              1/2 Players
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              <Clock className="h-4 w-4 mr-1" />
              Waiting
            </Badge>
          </div>

          {/* Game ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Game ID:</label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                {gameId}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyGameId}
                className="shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Shareable Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Challenge Message:</label>
            <div className="relative">
              <div className="p-4 bg-muted rounded-md text-sm whitespace-pre-line border">
                {shareMessage}
              </div>
              <Button
                onClick={handleCopy}
                className="absolute top-2 right-2"
                size="sm"
                variant={copied ? "default" : "outline"}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              📱 How to share:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Copy the challenge message above</li>
              <li>• Send it to your friend via chat, email, or social media</li>
              <li>• They can copy the Game ID and join through the lobby</li>
              <li>• The game will start automatically when they join!</li>
            </ul>
          </div>

          {/* Back to Lobby */}
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={onBackToLobby}>
              Back to Lobby
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
