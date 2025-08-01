import { useSuiClient, useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CONTRACT_CONFIG, FUNCTION_NAMES, GameState, RoundInfo, Direction } from "../contracts/config";

// Hook for creating a new game
export function useCreateGame() {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.CREATE_GAME}`,
        arguments: [
          tx.object(CONTRACT_CONFIG.GAME_REGISTRY_ID),
        ],
      });
      
      const result = await signAndExecuteTransaction({
        transaction: tx,
      });
      
      // Debug: Log the initial result structure
      console.log('Initial transaction result:', JSON.stringify(result, null, 2));
      
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
          console.log(`Attempt ${retries + 1} failed, retrying in ${(retries + 1) * 1000}ms...`, error);
          retries++;
          if (retries >= maxRetries) {
            throw new Error(`Failed to fetch transaction after ${maxRetries} attempts: ${error}`);
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, retries * 1000));
        }
      }
      
      if (!fullTxResult) {
        throw new Error('Failed to fetch transaction details after all retries');
      }
      
      console.log('Full transaction result:', JSON.stringify(fullTxResult, null, 2));
      
      // Try multiple approaches to extract game ID
      let gameId = null;
      
      // Approach 1: Check objectChanges for shared objects
      if (fullTxResult.objectChanges) {
        const sharedObject = fullTxResult.objectChanges.find((change: any) => 
          change.type === 'created' && 
          change.owner && 
          typeof change.owner === 'object' && 
          'Shared' in change.owner &&
          change.objectType?.includes('::game::Game')
        ) as any;
        if (sharedObject) {
          gameId = sharedObject.objectId;
          console.log('Found game ID in objectChanges:', gameId);
        }
      }
      
      // Approach 2: Check effects.created for shared objects
      if (!gameId && fullTxResult.effects?.created) {
        const sharedObject = fullTxResult.effects.created.find((obj: any) => {
          console.log('Checking effects.created object:', obj);
          return obj.owner && typeof obj.owner === 'object' && 'Shared' in obj.owner;
        });
        if (sharedObject) {
          gameId = sharedObject.reference?.objectId;
          console.log('Found game ID in effects.created:', gameId);
        }
      }
      
      // Approach 3: Check events for GameCreated
      if (!gameId && fullTxResult.events) {
        const gameCreatedEvent = fullTxResult.events.find((event: any) => 
          event.type?.includes('::game::GameCreated')
        );
        if (gameCreatedEvent && (gameCreatedEvent.parsedJson as any)?.game_id) {
          gameId = (gameCreatedEvent.parsedJson as any).game_id;
          console.log('Found game ID in events:', gameId);
        }
      }
      
      console.log('Final extracted game ID:', gameId);
      
      return { ...result, gameId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-games'] });
    },
  });
}

// Hook for joining a game
export function useJoinGame() {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (gameId: string) => {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.JOIN_GAME}`,
        arguments: [
          tx.object(gameId),
        ],
      });
      
      const result = await signAndExecuteTransaction({
        transaction: tx,
      });
      
      return result;
    },
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      queryClient.invalidateQueries({ queryKey: ['available-games'] });
    },
  });
}

// Hook for starting a game
export function useStartGame() {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (gameId: string) => {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.START_GAME}`,
        arguments: [
          tx.object(gameId),
        ],
      });
      
      const result = await signAndExecuteTransaction({
        transaction: tx,
      });
      
      return result;
    },
    onSuccess: (_, gameId) => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
  });
}

// Hook for shooting
export function useShoot() {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gameId, direction }: { gameId: string; direction: Direction }) => {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.SHOOT}`,
        arguments: [
          tx.object(gameId),
          tx.pure.u8(direction),
        ],
      });
      
      const result = await signAndExecuteTransaction({
        transaction: tx,
      });
      
      return result;
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
  });
}

// Hook for keeping
export function useKeep() {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gameId, direction }: { gameId: string; direction: Direction }) => {
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.KEEP}`,
        arguments: [
          tx.object(gameId),
          tx.pure.u8(direction),
        ],
      });
      
      const result = await signAndExecuteTransaction({
        transaction: tx,
      });
      
      return result;
    },
    onSuccess: (_, { gameId }) => {
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
    },
  });
}

// Hook for getting game state
export function useGameState(gameId: string | null) {
  const suiClient = useSuiClient();
  
  return useQuery({
    queryKey: ['game', gameId],
    queryFn: async (): Promise<GameState | null> => {
      if (!gameId) return null;
      
      try {
        const result = await suiClient.getObject({
          id: gameId,
          options: {
            showContent: true,
          },
        });
        
        if (result.data?.content?.dataType === 'moveObject') {
          const fields = (result.data.content as any).fields;
          
          return {
            player1: fields.player1,
            player2: fields.player2 || null,
            started: fields.started,
            finished: fields.finished,
            currentRound: fields.current_round,
            player1Score: fields.player1_score,
            player2Score: fields.player2_score,
            winner: fields.winner || null,
          };
        }
        
        return null;
      } catch (error) {
        console.error('Error fetching game state:', error);
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
    queryKey: ['round-info', gameId],
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
          sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        });
        
        if (result.results?.[0]?.returnValues) {
          const values = result.results[0].returnValues;
          console.log('Round info raw values:', values);
          
          // Helper function to convert byte array to address
          const parseAddress = (value: any): string => {
            // Handle different possible formats
            if (Array.isArray(value)) {
              if (value.length === 65) {
                // Convert byte array to hex string (skip first byte which is the type)
                const hexBytes = value.slice(1).map((b: number) => b.toString(16).padStart(2, '0')).join('');
                return `0x${hexBytes}`;
              } else if (value.length === 64) {
                // Convert byte array to hex string (no type byte to skip)
                const hexBytes = value.map((b: number) => b.toString(16).padStart(2, '0')).join('');
                return `0x${hexBytes}`;
              } else if (value.length === 32) {
                // 32-byte address
                const hexBytes = value.map((b: number) => b.toString(16).padStart(2, '0')).join('');
                return `0x${hexBytes}`;
              }
            }
            
            // Handle string format that might contain comma-separated bytes
            const valueStr = String(value || '');
            if (valueStr.includes(',') && valueStr.includes('address')) {
              // Extract the comma-separated numbers
              const bytesStr = valueStr.replace(',address', '').trim();
              const bytes = bytesStr.split(',').map(s => parseInt(s.trim()));
              if (bytes.length === 32 || bytes.length === 64 || bytes.length === 65) {
                const startIndex = bytes.length === 65 ? 1 : 0;
                const hexBytes = bytes.slice(startIndex).map(b => b.toString(16).padStart(2, '0')).join('');
                return `0x${hexBytes}`;
              }
            }
            
            return valueStr;
          };
          
          // Helper function to parse boolean from byte array
          const parseBoolean = (value: any): boolean => {
            // Handle array format
            if (Array.isArray(value)) {
              if (value.length === 1) {
                return value[0] === 1 || value[0] === true;
              }
              // Handle nested array format
              if (value.length > 1 && Array.isArray(value[0])) {
                return value[0][0] === 1 || value[0][0] === true;
              }
            }
            
            // Handle string format
            const valueStr = String(value || '').toLowerCase();
            if (valueStr === 'true' || valueStr === '1') {
              return true;
            }
            if (valueStr === 'false' || valueStr === '0') {
              return false;
            }
            
            // Handle direct boolean
            if (typeof value === 'boolean') {
              return value;
            }
            
            // Handle number
            if (typeof value === 'number') {
              return value === 1;
            }
            
            return false;
          };
          
          const roundNumber = parseInt(String(values[0]) || '0');
          const shooter = parseAddress(values[1]);
          const keeper = parseAddress(values[2]);
          const shootSubmitted = parseBoolean(values[3]);
          const keepSubmitted = parseBoolean(values[4]);
          
          console.log('Parsed values:', {
            roundNumber,
            shooter,
            keeper,
            shootSubmitted,
            keepSubmitted
          });
          
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
        console.error('Error fetching round info:', error);
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
    queryKey: ['current-turn', gameId],
    queryFn: async (): Promise<{ isMyTurn: boolean; currentPlayer: string | null }> => {
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
          sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
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
        console.error('Error fetching current turn:', error);
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
  
  console.log('useAvailableGames - Contract Config:', {
    PACKAGE_ID: CONTRACT_CONFIG.PACKAGE_ID,
    GAME_REGISTRY_ID: CONTRACT_CONFIG.GAME_REGISTRY_ID,
    currentAccount: currentAccount?.address
  });
  
  return useQuery({
    queryKey: ['available-games'],
    queryFn: async (): Promise<Array<{ gameId: string; gameState: GameState }>> => {
      try {
        // First get the list of game IDs
        const result = await suiClient.devInspectTransactionBlock({
          transactionBlock: (() => {
            const tx = new Transaction();
            tx.moveCall({
              target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.GET_AVAILABLE_GAMES}`,
              arguments: [tx.object(CONTRACT_CONFIG.GAME_REGISTRY_ID)],
            });
            return tx;
          })(),
          sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        });
        
        if (!result.results?.[0]?.returnValues?.[0]) {
          console.log('No return values found for get_available_games');
          return [];
        }
        
        // Parse the game IDs from the result
        const gameIds: string[] = [];
        const returnValue = result.results[0].returnValues[0];
        
        console.log('Raw return value from get_available_games:', returnValue);
        console.log('Return value type:', typeof returnValue);
        console.log('Return value structure:', JSON.stringify(returnValue, null, 2));
        
        // The return value from Sui devInspectTransactionBlock for a vector<ID> 
        // comes as a byte array that needs to be converted to hex
        if (Array.isArray(returnValue) && returnValue.length > 0) {
          const firstItem = returnValue[0];
          if (Array.isArray(firstItem) && firstItem.length > 0) {
            const byteArray = firstItem[0];
            if (Array.isArray(byteArray) && byteArray.length === 65) {
              // Convert byte array to hex string (skip first byte which is the type)
              const hexBytes = byteArray.slice(1).map(b => b.toString(16).padStart(2, '0')).join('');
              const gameId = `0x${hexBytes}`;
              console.log('Parsed game ID from byte array:', gameId);
              gameIds.push(gameId);
            }
          }
        }
        
        console.log('Parsed game IDs:', gameIds);
        
        // Filter out invalid game IDs before processing
        const validGameIds = gameIds.filter(id => {
          const isValid = id && 
                         id !== '0x0' && 
                         id !== '0x' && 
                         id.length === 66 && // Standard Sui object ID length
                         /^0x[a-fA-F0-9]{64}$/.test(id);
          if (!isValid) {
            console.log('Filtering out invalid game ID:', id);
          }
          return isValid;
        });
        
        console.log('Valid game IDs after filtering:', validGameIds);
        
        // Now fetch game state for each valid game ID and filter for available games
        const availableGames: Array<{ gameId: string; gameState: GameState }> = [];
        
        for (const gameId of validGameIds) {
          try {
            const gameStateResult = await suiClient.devInspectTransactionBlock({
              transactionBlock: (() => {
                const tx = new Transaction();
                tx.moveCall({
                  target: `${CONTRACT_CONFIG.PACKAGE_ID}::${CONTRACT_CONFIG.MODULE_NAME}::${FUNCTION_NAMES.GET_GAME_STATE}`,
                  arguments: [tx.object(gameId)],
                });
                return tx;
              })(),
              sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
            });
            
            if (gameStateResult.results?.[0]?.returnValues) {
              const values = gameStateResult.results[0].returnValues;
              const gameState: GameState = {
                player1: `0x${String(values[0]?.[0] || '')}`,
                player2: values[1]?.[0] ? `0x${String(values[1][0])}` : null,
                started: String(values[2]?.[0]) === '1',
                finished: String(values[3]?.[0]) === '1',
                currentRound: parseInt(String(values[4]?.[0] || 1)),
                player1Score: parseInt(String(values[5]?.[0] || 0)),
                player2Score: parseInt(String(values[6]?.[0] || 0)),
                winner: values[7]?.[0] ? `0x${String(values[7][0])}` : null,
              };
              
              // Only include games that need a second player (not started and no player2)
              if (!gameState.started && !gameState.player2) {
                availableGames.push({ gameId, gameState });
              }
            }
          } catch (error) {
            console.error(`Error fetching game state for ${gameId}:`, error);
          }
        }
        
        return availableGames;
      } catch (error) {
        console.error('Error fetching available games:', error);
        return [];
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}