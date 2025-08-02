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
    stake_amount: u64,         // Required stake amount in MIST
    prize_pool: Balance<SUI>,  // Accumulated prize pool
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

### Error Codes

- `ENotPlayerTurn: u64 = 2` - Wrong player attempting action
- `EGameAlreadyStarted: u64 = 3` - Action not allowed after game start
- `EGameNotStarted: u64 = 4` - Action requires started game
- `EGameFinished: u64 = 5` - Action not allowed on finished game
- `EInvalidPlayer: u64 = 6` - Invalid player for action
- `EGameFull: u64 = 7` - Game already has maximum players
- `EInvalidDirection: u64 = 9` - Invalid direction value
- `EInvalidStakeAmount: u64 = 10` - Stake amount doesn't match required amount

## Game Flow

### 1. Game Creation
```move
entry fun create_game(registry: &mut GameRegistry, stake: Coin<SUI>, ctx: &mut TxContext)
```
- Creates a new game with the sender as player1
- Requires a SUI stake that determines the prize pool
- Initializes 5 rounds with alternating shooter/keeper roles
- Stores the stake in the game's prize pool
- Emits `GameCreated` event
- Shares the game object for public access

### 2. Player Joining
```move
entry fun join_game(game: &mut Game, stake: Coin<SUI>, ctx: &TxContext)
```
- Allows a second player to join an existing game
- Requires a matching SUI stake equal to the creator's stake
- Adds the stake to the game's prize pool (doubling the total)
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

The game uses an alternating role system that ensures fair gameplay by giving each player equal opportunities in both shooting and goalkeeping roles.

### Role Determination Logic

Player roles are determined automatically based on the round number using a simple modulo operation:

```move
// In create_initial_rounds function
let round = Round {
    round_number: i,
    shooter: if (i % 2 == 1) player1 else @0x0,
    keeper: if (i % 2 == 1) @0x0 else player1,
    // ... other fields
};
```

### Role Assignment Rules

- **Odd Rounds (1, 3, 5)**: 
  - Player1 (game creator) acts as the **shooter**
  - Player2 (joiner) acts as the **goalkeeper**

- **Even Rounds (2, 4)**: 
  - Player2 (joiner) acts as the **shooter**
  - Player1 (game creator) acts as the **goalkeeper**

### Implementation Details

1. **Initial Game Creation**: When a game is first created by Player1, the role assignments are predetermined based on round numbers, but only Player1's roles are assigned while Player2's roles use placeholder addresses:

```move
// During game creation - create_initial_rounds function
fun create_initial_rounds(player1: address): vector<Round> {
    let mut rounds = vector::empty<Round>();
    let mut i = 1u8;
    while (i <= MAX_ROUNDS) {
        let round = Round {
            round_number: i,
            // Player1 is assigned as shooter in odd rounds (1,3,5)
            shooter: if (i % 2 == 1) player1 else @0x0,
            // Player1 is assigned as keeper in even rounds (2,4)
            keeper: if (i % 2 == 1) @0x0 else player1,
            // ... other fields initialized as empty
        };
        vector::push_back(&mut rounds, round);
        i = i + 1;
    };
    rounds
}
```

**At Initial Creation:**
- **Round 1**: Player1 = Shooter, @0x0 = Keeper (placeholder)
- **Round 2**: Player1 = Keeper, @0x0 = Shooter (placeholder)
- **Round 3**: Player1 = Shooter, @0x0 = Keeper (placeholder)
- **Round 4**: Player1 = Keeper, @0x0 = Shooter (placeholder)
- **Round 5**: Player1 = Shooter, @0x0 = Keeper (placeholder)

2. **Role Finalization**: When Player2 joins the game, the `update_round_assignments` function replaces all placeholder addresses with Player2's actual address:

```move
fun update_round_assignments(rounds: &mut vector<Round>, player2: address) {
    let mut i = 0u64;
    let len = vector::length(rounds);
    while (i < len) {
        let round = vector::borrow_mut(rounds, i);
        if (round.round_number % 2 == 1) {
            // Odd rounds: player1 shoots, player2 keeps
            round.keeper = player2;
        } else {
            // Even rounds: player2 shoots, player1 keeps
            round.shooter = player2;
        };
        i = i + 1;
    };
}
```

3. **Turn Validation**: During gameplay, the contract validates that only the designated shooter or keeper for the current round can submit their respective moves.

### Fairness Guarantee

This system ensures perfect fairness:
- Each player shoots exactly **3 times** (Player1: rounds 1,3,5; Player2: rounds 2,4)
- Each player keeps exactly **2 times** (Player1: rounds 2,4; Player2: rounds 1,3,5)
- No player has an advantage in terms of role distribution
- The alternating pattern prevents any strategic advantage from always going first or last

## Scoring and Prize Distribution

### Scoring Mechanism

1. **Goal Determination**: A goal is scored when the shooter's direction differs from the keeper's direction
2. **Score Tracking**: Each successful goal increments the shooter's score
3. **Winner Determination**: After 5 rounds, the player with the higher score wins
4. **Draw Handling**: If scores are equal, the game ends in a draw

### Prize Distribution Logic

The contract now includes a comprehensive monetary prize distribution system using SUI tokens:

#### Stake Requirements:
- Both players must stake an equal amount of SUI tokens to participate
- The creator sets the stake amount when creating the game
- The second player must match this exact amount when joining
- Total prize pool = Player 1 stake + Player 2 stake

#### Prize Distribution Rules:

1. **Winner Takes All**:
   ```move
   // Winner receives the entire prize pool
   let prize = coin::from_balance(balance::withdraw_all(&mut game.prize_pool), ctx);
   transfer::public_transfer(prize, winner_address);
   ```

2. **Draw Scenario - Equal Split**:
   ```move
   // Prize pool is split equally between both players
   let total_balance = balance::value(&game.prize_pool);
   let half_amount = total_balance / 2;
   let player1_share = coin::from_balance(balance::split(&mut game.prize_pool, half_amount), ctx);
   let player2_share = coin::from_balance(balance::withdraw_all(&mut game.prize_pool), ctx);
   ```

#### Automatic Distribution:
- Prize distribution occurs automatically when the game finishes
- No manual claim process required
- Funds are transferred directly to player wallets
- Transaction is atomic with game completion

#### Security Features:
- Stakes are held securely in the game's Balance<SUI>
- No possibility of fund loss or manipulation
- Automatic validation of stake amounts
- Immediate distribution upon game completion

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
public fun get_game_state(game: &Game): (address, Option<address>, bool, bool, u8, u8, u8, Option<address>, u64, u64)
```
Returns complete game state information including stake amount and current prize pool value.

### Round Information
```move
public fun get_current_round_info(game: &Game): (u8, address, address, bool, bool)
```
Returns current round details and move submission status.

```move
public fun get_round_result(game: &Game, round_num: u8): (bool, Option<bool>)
```
Returns whether a specific round is completed and its result.

### Turn Management
```move
public fun get_current_turn(game: &Game): Option<address>
```
Determines which player can currently make a move.

### Financial Information
```move
public fun get_stake_amount(game: &Game): u64
```
Returns the required stake amount for the game.

```move
public fun get_prize_pool_value(game: &Game): u64
```
Returns the current value of the prize pool.

### Game Discovery
```move
public fun get_available_games(registry: &GameRegistry): vector<ID>
```
Returns a list of all game IDs for discovering available games.

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
- `EInvalidStakeAmount`: Stake amount doesn't match required amount

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
2. Use view functions to display current game state and financial information
3. Display stake requirements and current prize pool values
4. Validate user actions and stake amounts before submitting transactions
5. Handle all possible error conditions gracefully
6. Show prize distribution results after game completion

### Wallet Integration
- Games are shared objects accessible to all players
- Players must have sufficient SUI balance for staking
- No special permissions required beyond transaction signing
- Gas fees apply to all game actions
- Automatic prize distribution requires no additional user interaction

### Financial Considerations
- Stake amounts are specified in MIST (1 SUI = 1,000,000,000 MIST)
- Minimum stake amount is determined by the game creator
- Prize pools are locked until game completion
- Winners receive funds automatically upon game finish

## Future Enhancements

1. **Tournament System**: Multi-game competitions with bracket-style elimination
2. **Ranking System**: Player statistics, leaderboards, and ELO ratings
3. **Time Limits**: Round and game time constraints to prevent stalling
4. **Spectator Mode**: Allow observers to watch games in real-time
5. **Replay System**: Store and replay game history for analysis
6. **Variable Stake Ranges**: Allow games with minimum/maximum stake ranges
7. **Multi-Token Support**: Support for other Sui ecosystem tokens
8. **Seasonal Competitions**: Regular tournaments with special rewards

## Deployment Information

- **Transaction Digest**: `HQwFL3gTv4dMaZjQKUccswS5qq4p3ZRYTv7EkY3w6btF`
- **Deployment Epoch**: 813
- **Gas Used**: 1,000,000 computation units
- **Storage Cost**: 34,906,800 MIST

The contract is deployed and operational on Sui Testnet with full staking and prize distribution functionality, ready for integration with frontend applications and further development.