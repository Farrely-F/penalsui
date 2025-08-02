# PenalSui Smart Contract Technical Documentation

## Overview

PenalSui is a decentralized penalty shootout game built on the Sui blockchain. The smart contract implements a turn-based penalty shootout game where two players compete in a 5-round match, with each player alternating between shooter and goalkeeper roles.

## Contract Information

- **Package ID**: `0xa7c6cdbbccc6484002a770e62b2c3c9f135ecde69451fef2933a4a6658878cf3`
- **Module**: `penalsui::game`
- **Network**: Sui Testnet
- **Framework Version**: 2024.beta
- **GameRegistry Object**: `0xa0d748880beda2daec9232b529b856fc4289459b1c2fecf6477d8cfb2bbd41b0`

## Architecture

### Core Data Structures

#### Game Struct
```move
public struct Game has key, store {
    id: UID,
    player1: address,           // Game creator
    player2: Option<address>,   // Second player (joins later)
    started: bool,              // Game state flag
    finished: bool,             // Game completion flag
    current_round: u8,          // Current round (1-5)
    player1_score: u8,          // Player 1's goals scored
    player2_score: u8,          // Player 2's goals scored
    rounds: vector<Round>,      // All round data
    winner: Option<address>,    // Winner address (None for draw)
    created_at: u64,           // Creation timestamp
}
```

#### Round Struct
```move
public struct Round has copy, drop, store {
    round_number: u8,
    shooter: address,           // Who shoots this round
    keeper: address,            // Who keeps this round
    shoot_direction: Option<u8>, // Shooter's choice
    keep_direction: Option<u8>,  // Keeper's choice
    is_goal: Option<bool>,      // Round result
    completed: bool,            // Round completion status
}
```

#### GameRegistry Struct
```move
public struct GameRegistry has key {
    id: UID,
    games: vector<ID>,          // All game IDs
    active_games: u64,          // Active game counter
}
```

### Constants

- `MAX_ROUNDS: u8 = 5` - Maximum rounds per game
- `DIRECTION_LEFT: u8 = 0` - Left direction constant
- `DIRECTION_CENTER: u8 = 1` - Center direction constant
- `DIRECTION_RIGHT: u8 = 2` - Right direction constant

## Game Flow

### 1. Game Creation
```move
entry fun create_game(registry: &mut GameRegistry, ctx: &mut TxContext)
```
- Creates a new game with the sender as player1
- Initializes 5 rounds with alternating shooter/keeper roles
- Emits `GameCreated` event
- Shares the game object for public access

### 2. Player Joining
```move
entry fun join_game(game: &mut Game, ctx: &TxContext)
```
- Allows a second player to join an existing game
- Updates round assignments with actual player addresses
- Validates that the game isn't full or already started
- Emits `PlayerJoined` event

### 3. Game Start
```move
entry fun start_game(game: &mut Game, ctx: &TxContext)
```
- Either player can start the game once both have joined
- Sets the game state to "started"
- Emits `GameStarted` event

### 4. Gameplay

#### Shooting
```move
entry fun shoot(game: &mut Game, direction: u8, ctx: &TxContext)
```
- Allows the designated shooter to submit their shot direction
- Validates player turn and game state
- Triggers round resolution if both moves are submitted

#### Goalkeeping
```move
entry fun keep(game: &mut Game, direction: u8, ctx: &TxContext)
```
- Allows the designated keeper to submit their save direction
- Validates player turn and game state
- Triggers round resolution if both moves are submitted

### 5. Round Resolution
```move
fun resolve_round(game: &mut Game)
```
- Compares shooter and keeper directions
- **Goal Logic**: Goal is scored if `shoot_direction != keep_direction`
- Updates player scores
- Advances to next round or finishes game
- Emits `RoundCompleted` event

### 6. Game Completion
```move
fun finish_game(game: &mut Game)
```
- Determines winner based on final scores
- Sets game state to "finished"
- Emits `GameFinished` event

## Role Assignment System

The game uses an alternating role system:

- **Odd Rounds (1, 3, 5)**: Player1 shoots, Player2 keeps
- **Even Rounds (2, 4)**: Player2 shoots, Player1 keeps

This ensures fair gameplay where each player gets equal opportunities in both roles.

## Scoring and Prize Distribution

### Scoring Mechanism

1. **Goal Determination**: A goal is scored when the shooter's direction differs from the keeper's direction
2. **Score Tracking**: Each successful goal increments the shooter's score
3. **Winner Determination**: After 5 rounds, the player with the higher score wins
4. **Draw Handling**: If scores are equal, the game ends in a draw (no winner)

### Prize Distribution Logic

**Important Note**: The current smart contract implementation does not include any monetary prize distribution or token rewards. The contract focuses purely on game logic and winner determination.

#### Current Implementation:
- Games are played for competitive purposes only
- Winner is determined and recorded on-chain
- No automatic token transfers or prize pools
- No entry fees or betting mechanisms

#### Potential Prize Distribution Extensions:

For future implementations, prize distribution could be added through:

1. **Entry Fee System**:
   ```move
   // Hypothetical extension
   entry fun create_game_with_stake(registry: &mut GameRegistry, stake: Coin<SUI>, ctx: &mut TxContext)
   ```

2. **Winner-Takes-All**:
   - Collect entry fees from both players
   - Transfer total pool to winner
   - Handle draw scenarios (refund or split)

3. **Tournament System**:
   - Multi-game tournaments with accumulated prize pools
   - Ranking-based rewards
   - Seasonal competitions

## Events System

The contract emits comprehensive events for frontend integration:

- `GameCreated`: New game creation
- `PlayerJoined`: Second player joins
- `GameStarted`: Game begins
- `MoveSubmitted`: Player submits move
- `RoundCompleted`: Round resolution
- `GameFinished`: Game completion

## View Functions

### Game State Queries
```move
public fun get_game_state(game: &Game): (address, Option<address>, bool, bool, u8, u8, u8, Option<address>)
```
Returns complete game state information.

### Round Information
```move
public fun get_current_round_info(game: &Game): (u8, address, address, bool, bool)
```
Returns current round details and move submission status.

### Turn Management
```move
public fun get_current_turn(game: &Game): Option<address>
```
Determines which player can currently make a move.

## Security Features

### Access Control
- Players can only perform actions during their designated turns
- Game state transitions are strictly enforced
- Invalid moves are rejected with specific error codes

### Error Handling
- `ENotPlayerTurn`: Wrong player attempting action
- `EGameAlreadyStarted`: Action not allowed after game start
- `EGameNotStarted`: Action requires started game
- `EGameFinished`: Action not allowed on finished game
- `EInvalidPlayer`: Invalid player for action
- `EGameFull`: Game already has maximum players
- `EInvalidDirection`: Invalid direction value

### State Validation
- Prevents double moves in same round
- Ensures proper game progression
- Validates player eligibility for actions

## Testing Coverage

The contract includes comprehensive tests covering:

- Game creation and joining
- Role alternation between rounds
- Scoring mechanics (goals and saves)
- Win/draw scenarios
- Error conditions and edge cases
- Complete game flow from start to finish

## Integration Guidelines

### Frontend Integration
1. Monitor events for real-time game updates
2. Use view functions to display current game state
3. Validate user actions before submitting transactions
4. Handle all possible error conditions gracefully

### Wallet Integration
- Games are shared objects accessible to all players
- No special permissions required beyond transaction signing
- Gas fees apply to all game actions

## Future Enhancements

1. **Monetary Integration**: Add SUI token staking and prize distribution
2. **Tournament System**: Multi-game competitions
3. **Ranking System**: Player statistics and leaderboards
4. **Time Limits**: Round and game time constraints
5. **Spectator Mode**: Allow observers to watch games
6. **Replay System**: Store and replay game history

## Deployment Information

- **Transaction Digest**: `HQwFL3gTv4dMaZjQKUccswS5qq4p3ZRYTv7EkY3w6btF`
- **Deployment Epoch**: 813
- **Gas Used**: 1,000,000 computation units
- **Storage Cost**: 34,906,800 MIST

The contract is deployed and operational on Sui Testnet, ready for integration with frontend applications and further development.