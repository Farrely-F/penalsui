import {
  useSuiClient,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CONTRACT_CONFIG,
  FUNCTION_NAMES,
  GameState,
  RoundInfo,
  Direction,
} from "../contracts/config";

// Helper function to convert byte array to address
const parseAddress = (value: any): string => {
  // Handle different possible formats
  if (Array.isArray(value)) {
    if (value.length === 65) {
      // Convert byte array to hex string (skip first byte which is the type)
      const hexBytes = value
        .slice(1)
        .map((b: number) => b.toString(16).padStart(2, "0"))
        .join("");
      return `0x${hexBytes}`;
    } else if (value.length === 64) {
      // Convert byte array to hex string (no type byte to skip)
      const hexBytes = value
        .map((b: number) => b.toString(16).padStart(2, "0"))
        .join("");
      return `0x${hexBytes}`;
    } else if (value.length === 32) {
      // 32-byte address
      const hexBytes = value
        .map((b: number) => b.toString(16).padStart(2, "0"))
        .join("");
      return `0x${hexBytes}`;
    }
  }

  // Handle string format that might contain comma-separated bytes
const valueStr = String(value || "");
  if (valueStr.includes(",")) {
    // Try to parse as comma-separated numbers
    const bytesStr = valueStr.replace(",address", "").trim();
    const bytes = bytesStr
      .split(",")
      .map((s) => {
        const num = parseInt(s.trim());
        return isNaN(num) ? null : num;
      })
      .filter((b) => b !== null);

    if (bytes.length >= 20) {
      // At least 20 bytes for a valid address
      // Take the last 32 bytes if more than 32, or pad if less
      const addressBytes = bytes.length > 32 ? bytes.slice(-32) : bytes;
      const hexBytes = addressBytes
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return `0x${hexBytes.padStart(64, "0")}`;
    }
  }

  return valueStr;
};

// Helper function to parse boolean from byte array
const parseBoolean = (value: any): boolean => {
  // Handle array format - Move booleans are often wrapped in arrays
  if (Array.isArray(value)) {
    if (value.length === 1) {
      const innerValue = value[0];
      if (typeof innerValue === "boolean") {
        return innerValue;
      }
      return innerValue === 1 || innerValue === true;
    }
    // Handle nested array format
    if (value.length > 1 && Array.isArray(value[0])) {
      return value[0][0] === 1 || value[0][0] === true;
    }
  }

  // Handle string format
  const valueStr = String(value || "").toLowerCase();
  if (valueStr === "true" || valueStr === "1") {
    return true;
  }
  if (valueStr === "false" || valueStr === "0") {
    return false;
  }

  // Handle direct boolean
  if (typeof value === "boolean") {
    return value;
  }

  // Handle number
  if (typeof value === "number") {
    return value === 1;
  }

  return false;
};

// Hook for creating a new game
export function useCreateGame() {
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.CREATE_GAME}`,
        arguments: [tx.object(CONTRACT_CONFIG.GAME_REGISTRY_ID)],
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      // Debug: Log the initial result structure
      // console.log(
      //   "Initial transaction result:",
      //   JSON.stringify(result, null, 2),
      // );

      // Fetch full transaction details with parsed data (with retry for network propagation)
      let fullTxResult: any = null;
      let retries = 0;
      const maxRetries = 5;

      while (retries < maxRetries) {
        try {
          fullTxResult = await suiClient.getTransactionBlock({
            digest: result.digest,
            options: {
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
            },
          });
          break; // Success, exit retry loop
        } catch (error) {
          console.log(
            `Attempt ${retries + 1} failed, retrying in ${(retries + 1) * 1000}ms...`,
            error,
          );
          retries++;
          if (retries >= maxRetries) {
            throw new Error(
              `Failed to fetch transaction after ${maxRetries} attempts: ${error}`,
            );
          }
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, retries * 1000));
        }
      }

      if (!fullTxResult) {
        throw new Error(
          "Failed to fetch transaction details after all retries",
        );
      }

      // console.log(
      //   "Full transaction result:",
      //   JSON.stringify(fullTxResult, null, 2),
      // );

      // Try multiple approaches to extract game ID
      let gameId = null;

      // Approach 1: Check objectChanges for shared objects
      if (fullTxResult.objectChanges) {
        const sharedObject = fullTxResult.objectChanges.find(
          (change: any) =>
            change.type === "created" &&
            change.owner &&
            typeof change.owner === "object" &&
            "Shared" in change.owner &&
            change.objectType?.includes("::game::Game"),
        ) as any;
        if (sharedObject) {
          gameId = sharedObject.objectId;
          // console.log("Found game ID in objectChanges:", gameId);
        }
      }

      // Approach 2: Check effects.created for shared objects
      if (!gameId && fullTxResult.effects?.created) {
        const sharedObject = fullTxResult.effects.created.find((obj: any) => {
          // console.log("Checking effects.created object:", obj);
          return (
            obj.owner && typeof obj.owner === "object" && "Shared" in obj.owner
          );
        });
        if (sharedObject) {
          gameId = sharedObject.reference?.objectId;
          // console.log("Found game ID in effects.created:", gameId);
        }
      }

      // Approach 3: Check events for GameCreated
      if (!gameId && fullTxResult.events) {
        const gameCreatedEvent = fullTxResult.events.find((event: any) =>
          event.type?.includes("::game::GameCreated"),
        );
        if (gameCreatedEvent && (gameCreatedEvent.parsedJson as any)?.game_id) {
          gameId = (gameCreatedEvent.parsedJson as any).game_id;
          // console.log("Found game ID in events:", gameId);
        }
      }

      // console.log("Final extracted game ID:", gameId);

      return { ...result, gameId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["available-games"] });
    },
  });
}

// Hook for fetching user's active games (where user is either player1 or player2)
export function useUserActiveGames() {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();

  return useQuery({
    queryKey: ["user-active-games", currentAccount?.address],
    queryFn: async (): Promise<
      Array<{ gameId: string; gameState: GameState }>
    > => {
      if (!currentAccount) {
        return [];
      }

      try {
        // Get all games first
        const result = await suiClient.devInspectTransactionBlock({
          transactionBlock: (() => {
            const tx = new Transaction();
            tx.moveCall({
              target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::get_available_games`,
              arguments: [tx.object(CONTRACT_CONFIG.GAME_REGISTRY_ID)],
            });
            return tx;
          })(),
          sender:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
        });

        if (!result.results?.[0]?.returnValues?.[0]) {
          return [];
        }

        const gameIds: string[] = [];
        const returnValue = result.results[0].returnValues[0];

        // Parse game IDs (same logic as useAvailableGames)
        if (Array.isArray(returnValue) && Array.isArray(returnValue[0])) {
          const gameIdData = returnValue[0];

          if (Array.isArray(gameIdData) && gameIdData.length >= 1) {
            const length = gameIdData[0];

            if (length > 0) {
              const totalBytes = gameIdData.length - 1;
              const bytesPerGameId = 32;
              const numGameIds = Math.floor(totalBytes / bytesPerGameId);

              for (let i = 0; i < numGameIds && i < length; i++) {
                const startIndex = 1 + i * bytesPerGameId;
                const endIndex = startIndex + bytesPerGameId;

                if (endIndex <= gameIdData.length) {
                  const bytes = gameIdData.slice(startIndex, endIndex);
                  const hexBytes = bytes
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("");
                  const gameId = `0x${hexBytes}`;
                  gameIds.push(gameId);
                }
              }
            }
          }
        }

        // Filter for user's active games (where user is either player1 or player2)
        const userActiveGames = [];
        for (const gameId of gameIds) {
          try {
            const gameStateResult = await suiClient.devInspectTransactionBlock({
              transactionBlock: (() => {
                const tx = new Transaction();
                tx.moveCall({
                  target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::get_game_state`,
                  arguments: [tx.object(gameId)],
                });
                return tx;
              })(),
              sender:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
            });

            if (gameStateResult.results?.[0]?.returnValues) {
              const values = gameStateResult.results[0].returnValues;

              const player1 = parseAddress(values[0]);
              let player2 = null;
              if (
                values[1] &&
                Array.isArray(values[1]) &&
                values[1].length > 0
              ) {
                player2 = parseAddress(values[1][0]);
              }
              const started = parseBoolean(values[2]);
              const finished = parseBoolean(values[3]);

              const gameState: GameState = {
                player1,
                player2,
                started,
                finished,
                currentRound: parseInt(String(values[4]?.[0] || 1)),
                player1Score: parseInt(String(values[5]?.[0] || 0)),
                player2Score: parseInt(String(values[6]?.[0] || 0)),
                winner: values[7]?.[0] ? parseAddress(values[7]) : null,
              };

              // Include games where user is either player1 or player2 and game is not finished
              const isUserPlayer1 = gameState.player1 === currentAccount.address;
              const isUserPlayer2 = gameState.player2 === currentAccount.address;
              const isUserParticipant = isUserPlayer1 || isUserPlayer2;
              
              // Debug: Uncomment to see user active games filtering
              // console.log(`👤 User active game ${gameId} check:`, {
              //   player1: gameState.player1,
              //   player2: gameState.player2,
              //   currentUser: currentAccount.address,
              //   isUserPlayer1,
              //   isUserPlayer2,
              //   isUserParticipant,
              //   finished: gameState.finished,
              //   willInclude: isUserParticipant && !gameState.finished
              // });
              
              if (isUserParticipant && !gameState.finished) {
                userActiveGames.push({ gameId, gameState });
              }
            }
          } catch (error) {
            console.error(`Error fetching game state for ${gameId}:`, error);
          }
        }

        return userActiveGames;
      } catch (error) {
        console.error("Error fetching user active games:", error);
        return [];
      }
    },
    enabled: !!currentAccount,
    refetchInterval: 5000,
  });
}

// Hook for joining a game
export function useJoinGame() {
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gameId: string) => {
      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.JOIN_GAME}`,
        arguments: [tx.object(gameId)],
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      return result;
    },
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
      queryClient.invalidateQueries({ queryKey: ["available-games"] });
    },
  });
}

// Hook for starting a game
export function useStartGame() {
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gameId: string) => {
      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.START_GAME}`,
        arguments: [tx.object(gameId)],
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      return result;
    },
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
    },
  });
}

// Hook for shooting
export function useShoot() {
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      direction,
    }: {
      gameId: string;
      direction: Direction;
    }) => {
      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.SHOOT}`,
        arguments: [tx.object(gameId), tx.pure.u8(direction)],
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      return result;
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
    },
  });
}

// Hook for keeping
export function useKeep() {
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      direction,
    }: {
      gameId: string;
      direction: Direction;
    }) => {
      const tx = new Transaction();

      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.KEEP}`,
        arguments: [tx.object(gameId), tx.pure.u8(direction)],
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      return result;
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ["game", gameId] });
    },
  });
}

// Hook for getting game state
export function useGameState(gameId: string | null) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["game", gameId],
    queryFn: async (): Promise<GameState | null> => {
      if (!gameId) return null;

      try {
        const result = await suiClient.getObject({
          id: gameId,
          options: {
            showContent: true,
          },
        });

        if (result.data?.content?.dataType === "moveObject") {
          const fields = (result.data.content as any).fields;

          return {
            player1: parseAddress(fields.player1),
            player2: fields.player2 ? parseAddress(fields.player2) : null,
            started: parseBoolean(fields.started),
            finished: parseBoolean(fields.finished),
            currentRound: fields.current_round,
            player1Score: fields.player1_score,
            player2Score: fields.player2_score,
            winner: fields.winner ? parseAddress(fields.winner) : null,
          };
        }

        return null;
      } catch (error) {
        console.error("Error fetching game state:", error);
        return null;
      }
    },
    enabled: !!gameId,
    refetchInterval: 2000, // Poll every 2 seconds for real-time updates
  });
}

// Hook for getting current round info
export function useCurrentRoundInfo(gameId: string | null) {
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["round-info", gameId],
    queryFn: async (): Promise<RoundInfo | null> => {
      if (!gameId) return null;

      try {
        const result = await suiClient.devInspectTransactionBlock({
          transactionBlock: (() => {
            const tx = new Transaction();
            tx.moveCall({
              target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.GET_CURRENT_ROUND_INFO}`,
              arguments: [tx.object(gameId)],
            });
            return tx;
          })(),
          sender:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
        });

        if (result.results?.[0]?.returnValues) {
          const values = result.results[0].returnValues;
          // console.log("Round info raw values:", values);

          const roundNumber = parseInt(String(values[0]) || "0");
          const shooter = parseAddress(values[1]);
          const keeper = parseAddress(values[2]);
          const shootSubmitted = parseBoolean(values[3]);
          const keepSubmitted = parseBoolean(values[4]);

          // console.log("Parsed values:", {
          //   roundNumber,
          //   shooter,
          //   keeper,
          //   shootSubmitted,
          //   keepSubmitted,
          // });

          return {
            roundNumber,
            shooter,
            keeper,
            shootSubmitted,
            keepSubmitted,
          };
        }

        return null;
      } catch (error) {
        console.error("Error fetching round info:", error);
        return null;
      }
    },
    enabled: !!gameId,
    refetchInterval: 1000,
  });
}

// Hook for getting current turn
export function useCurrentTurn(gameId: string | null) {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();

  return useQuery({
    queryKey: ["current-turn", gameId],
    queryFn: async (): Promise<{
      isMyTurn: boolean;
      currentPlayer: string | null;
    }> => {
      if (!gameId || !currentAccount) {
        return { isMyTurn: false, currentPlayer: null };
      }

      try {
        const result = await suiClient.devInspectTransactionBlock({
          transactionBlock: (() => {
            const tx = new Transaction();
            tx.moveCall({
              target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.GET_CURRENT_TURN}`,
              arguments: [tx.object(gameId)],
            });
            return tx;
          })(),
          sender:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
        });

        if (result.results?.[0]?.returnValues?.[0]) {
          const currentPlayer = `0x${String(result.results[0].returnValues[0][0])}`;
          const isMyTurn = currentPlayer === currentAccount.address;

          return { isMyTurn, currentPlayer };
        }

        // If no specific player returned, it means either:
        // 1. Both players can play (neither submitted)
        // 2. Both players submitted (waiting for resolution)
        // We need to check round info to determine which case
        return { isMyTurn: true, currentPlayer: null }; // Allow both to play by default
      } catch (error) {
        console.error("Error fetching current turn:", error);
        return { isMyTurn: false, currentPlayer: null };
      }
    },
    enabled: !!gameId && !!currentAccount,
    refetchInterval: 1000,
  });
}

// Hook for fetching available games
export function useAvailableGames() {
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();

  return useQuery({
    queryKey: ["available-games", currentAccount?.address],
    queryFn: async (): Promise<
      Array<{ gameId: string; gameState: GameState }>
    > => {
      console.log("🔍 Starting useAvailableGames query");

      if (!currentAccount) {
        console.log("❌ No wallet connected");
        return [];
      }

      try {
        // Get all games first
        const result = await suiClient.devInspectTransactionBlock({
          transactionBlock: (() => {
            const tx = new Transaction();
            tx.moveCall({
              target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::get_available_games`,
              arguments: [tx.object(CONTRACT_CONFIG.GAME_REGISTRY_ID)],
            });
            return tx;
          })(),
          sender:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
        });

        // console.log("Raw result:", result);

        if (!result.results?.[0]?.returnValues?.[0]) {
          console.log("No return values found");
          return [];
        }

        const gameIds: string[] = [];
        const returnValue = result.results[0].returnValues[0];

        // The structure is: [[[length, ...bytes], type], ...]
        if (Array.isArray(returnValue) && Array.isArray(returnValue[0])) {
          const gameIdData = returnValue[0]; // This is [length, ...bytes]

          if (Array.isArray(gameIdData) && gameIdData.length >= 1) {
            const length = gameIdData[0]; // Number of game IDs
            // console.log("Number of games:", length);

            if (length > 0) {
              // Each game ID is 32 bytes, so we need to extract multiple IDs
              const totalBytes = gameIdData.length - 1; // Exclude the length byte
              const bytesPerGameId = 32;
              const numGameIds = Math.floor(totalBytes / bytesPerGameId);

              // console.log("Total bytes:", totalBytes, "Expected game IDs:", numGameIds);

              for (let i = 0; i < numGameIds && i < length; i++) {
                const startIndex = 1 + i * bytesPerGameId; // Skip length byte + offset
                const endIndex = startIndex + bytesPerGameId;

                if (endIndex <= gameIdData.length) {
                  const bytes = gameIdData.slice(startIndex, endIndex);
                  const hexBytes = bytes
                    .map((b) => b.toString(16).padStart(2, "0"))
                    .join("");
                  const gameId = `0x${hexBytes}`;
                  // console.log(`Extracted game ID ${i + 1}:`, gameId);
                  gameIds.push(gameId);
                }
              }
            }
          }
        }

        // console.log("All game IDs:", gameIds);

        // Now fetch game states and filter for available games
        const availableGames = [];
        for (const gameId of gameIds) {
          try {
            const gameStateResult = await suiClient.devInspectTransactionBlock({
              transactionBlock: (() => {
                const tx = new Transaction();
                tx.moveCall({
                  target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::get_game_state`,
                  arguments: [tx.object(gameId)],
                });
                return tx;
              })(),
              sender:
                "0x0000000000000000000000000000000000000000000000000000000000000000",
            });

            if (gameStateResult.results?.[0]?.returnValues) {
              const values = gameStateResult.results[0].returnValues;
              // console.log(`Raw game state values for ${gameId}:`, values);

              const player1 = parseAddress(values[0]);
              // Handle Option<address> for player2
              let player2 = null;
              // Option<address> in Move: Some(addr) = [[addr_bytes]], None = []
              if (
                values[1] &&
                Array.isArray(values[1]) &&
                values[1].length > 0
              ) {
                // It's Some(address)
                const parsedPlayer2 = parseAddress(values[1][0]);
                // Check if it's a valid address (not zero address)
                if (parsedPlayer2 && parsedPlayer2 !== "0" && parsedPlayer2 !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                  player2 = parsedPlayer2;
                }
              }
              // If values[1] is empty array or null, it's None - player2 stays null
              const started = parseBoolean(values[2]);
              const finished = parseBoolean(values[3]);

              // console.log(`Parsed values for ${gameId}:`, {
              //   player1,
              //   player2,
              //   started,
              //   finished,
              //   rawPlayer2: values[1],
              //   rawStarted: values[2],
              //   rawFinished: values[3]
              // });

              const gameState: GameState = {
                player1,
                player2,
                started,
                finished,
                currentRound: parseInt(String(values[4]?.[0] || 1)),
                player1Score: parseInt(String(values[5]?.[0] || 0)),
                player2Score: parseInt(String(values[6]?.[0] || 0)),
                winner: values[7]?.[0] ? parseAddress(values[7]) : null,
              };

              // console.log(`Game state for ${gameId}:`, gameState);
              // console.log(`Filter check - started: ${gameState.started}, player2: ${gameState.player2}`);

              // Show games that are available for joining (no opponent yet and not finished)
              // Games without player2 (null/empty/zero) are available for joining
              // BUT exclude games where current user is already player1 (those should be in "My Active Games")
              const hasNoOpponent = !gameState.player2 || gameState.player2 === "0" || gameState.player2 === "0x0000000000000000000000000000000000000000000000000000000000000000";
              const isNotUserGame = gameState.player1 !== currentAccount.address;
              const shouldInclude = !gameState.finished && hasNoOpponent && isNotUserGame;
              
              // Debug: Uncomment to see filtering logic
              // console.log(`🎮 Game ${gameId} filter check:`, {
              //   player1: gameState.player1,
              //   player2: gameState.player2,
              //   currentUser: currentAccount.address,
              //   finished: gameState.finished,
              //   hasNoOpponent,
              //   isNotUserGame,
              //   shouldInclude
              // });

              // console.log(`Filter evaluation for ${gameId}:`, {
               //   finished: gameState.finished,
               //   hasNoOpponent,
               //   shouldInclude,
               //   gameState
               // });

              if (shouldInclude) {
                availableGames.push({ gameId, gameState });
              }
            }
          } catch (error) {
            console.error(`Error fetching game state for ${gameId}:`, error);
          }
        }

        // console.log("Available games:", availableGames);
        return availableGames;
      } catch (error) {
        console.error("❌ Error fetching games:", error);
        return [];
      }
    },
    enabled: !!currentAccount,
    refetchInterval: 5000,
  });
}
