// Contract configuration for PenalSUI game
export const CONTRACT_CONFIG = {
  // Package ID from deployment
  PACKAGE_ID: "0x47d49c7e9a65453fe822c9ce20373cd92ec6c442800d0f7a445c6b30685e6b2b",
  
  // Game Registry shared object ID
  GAME_REGISTRY_ID: "0xc9d695218fb98e2f7d11f915420132be6185240e3e9927cc4c8b23ff7abf4c1b",
  
  // Module name
  MODULE_NAME: "game",
  
  // Direction constants
  DIRECTIONS: {
    LEFT: 0,
    CENTER: 1,
    RIGHT: 2,
  } as const,
  
  // Game constants
  MAX_ROUNDS: 5,
} as const;

// Function names for contract calls
export const FUNCTION_NAMES = {
  CREATE_GAME: "create_game",
  JOIN_GAME: "join_game",
  START_GAME: "start_game",
  SHOOT: "shoot",
  KEEP: "keep",
  GET_GAME_STATE: "get_game_state",
  GET_CURRENT_ROUND_INFO: "get_current_round_info",
  GET_ROUND_RESULT: "get_round_result",
  GET_CURRENT_TURN: "get_current_turn",
  GET_AVAILABLE_GAMES: "get_available_games",
} as const;

// Event types
export const EVENT_TYPES = {
  GAME_CREATED: "GameCreated",
  PLAYER_JOINED: "PlayerJoined",
  GAME_STARTED: "GameStarted",
  MOVE_SUBMITTED: "MoveSubmitted",
  ROUND_COMPLETED: "RoundCompleted",
  GAME_FINISHED: "GameFinished",
} as const;

// Type definitions
export type Direction = typeof CONTRACT_CONFIG.DIRECTIONS[keyof typeof CONTRACT_CONFIG.DIRECTIONS];

export interface GameState {
  player1: string;
  player2: string | null;
  started: boolean;
  finished: boolean;
  currentRound: number;
  player1Score: number;
  player2Score: number;
  winner: string | null;
}

export interface RoundInfo {
  roundNumber: number;
  shooter: string;
  keeper: string;
  shootSubmitted: boolean;
  keepSubmitted: boolean;
}

export interface RoundResult {
  completed: boolean;
  isGoal: boolean | null;
}