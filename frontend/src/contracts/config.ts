// Contract configuration for PenalSUI game
export const CONTRACT_CONFIG = {
  // Package ID from deployment
  PACKAGE_ID: "0x3d5e2d0c1d471702dbcf36f503bf72a70a97247552e4b4cedf8a84f0fe21948b",
  
  // Game Registry shared object ID
  GAME_REGISTRY_ID: "0x44a5f492ca938c4f5a3a8d4a07e79db4a16a6f721b136eefadddf49a2fd54cc9",
  
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
  stakeAmount: number;
  prizePool: number;
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