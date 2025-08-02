module penalsui::game;

use sui::event;
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::balance::{Self, Balance};
use sui::transfer;

// use std::vector;
// use std::option::{Self, Option};

// Error codes
// const EGameNotFound: u64 = 1;
const ENotPlayerTurn: u64 = 2;
const EGameAlreadyStarted: u64 = 3;
const EGameNotStarted: u64 = 4;
const EGameFinished: u64 = 5;
const EInvalidPlayer: u64 = 6;
const EGameFull: u64 = 7;
// const ERoundNotComplete: u64 = 8;
const EInvalidDirection: u64 = 9;
const EInvalidStakeAmount: u64 = 10;

// Constants
const MAX_ROUNDS: u8 = 5;
const DIRECTION_LEFT: u8 = 0;
const DIRECTION_CENTER: u8 = 1;
const DIRECTION_RIGHT: u8 = 2;

// Individual round data
public struct Round has copy, drop, store {
    round_number: u8,
    shooter: address,
    keeper: address,
    shoot_direction: Option<u8>,
    keep_direction: Option<u8>,
    is_goal: Option<bool>,
    completed: bool,
}

// Main game state
public struct Game has key, store {
    id: UID,
    player1: address,
    player2: Option<address>,
    started: bool,
    finished: bool,
    current_round: u8,
    player1_score: u8,
    player2_score: u8,
    rounds: vector<Round>,
    winner: Option<address>,
    created_at: u64,
    stake_amount: u64,
    prize_pool: Balance<SUI>,
}

// Game registry to track all games
public struct GameRegistry has key {
    id: UID,
    games: vector<ID>,
    active_games: u64,
}

// Events
public struct GameCreated has copy, drop {
    game_id: ID,
    creator: address,
}

public struct PlayerJoined has copy, drop {
    game_id: ID,
    player: address,
}

public struct GameStarted has copy, drop {
    game_id: ID,
    player1: address,
    player2: address,
}

public struct MoveSubmitted has copy, drop {
    game_id: ID,
    player: address,
    round: u8,
    is_shoot: bool,
}

public struct RoundCompleted has copy, drop {
    game_id: ID,
    round: u8,
    shooter: address,
    keeper: address,
    is_goal: bool,
    player1_score: u8,
    player2_score: u8,
}

public struct GameFinished has copy, drop {
    game_id: ID,
    winner: Option<address>,
    final_score_p1: u8,
    final_score_p2: u8,
}

// Initialize the game registry
fun init(ctx: &mut TxContext) {
    let registry = GameRegistry {
        id: object::new(ctx),
        games: vector::empty<ID>(),
        active_games: 0,
    };
    transfer::share_object(registry);
}

/// Test-only function to initialize the game registry for unit tests
#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    init(ctx);
}

// Helper function to create initial rounds
fun create_initial_rounds(player1: address): vector<Round> {
    let mut rounds = vector::empty<Round>();
    let mut i = 1u8;
    while (i <= MAX_ROUNDS) {
        let round = Round {
            round_number: i,
            shooter: if (i % 2 == 1) player1 else @0x0,
            keeper: if (i % 2 == 1) @0x0 else player1,
            shoot_direction: option::none(),
            keep_direction: option::none(),
            is_goal: option::none(),
            completed: false,
        };
        vector::push_back(&mut rounds, round);
        i = i + 1;
    };
    rounds
}

// Helper function to update round assignments when player2 joins
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

// Create a new game with stake
entry fun create_game(registry: &mut GameRegistry, stake: Coin<SUI>, ctx: &mut TxContext) {
    let game_id = object::new(ctx);
    let game_id_copy = object::uid_to_inner(&game_id);
    let sender = tx_context::sender(ctx);
    let stake_amount = coin::value(&stake);

    let game = Game {
        id: game_id,
        player1: sender,
        player2: option::none(),
        started: false,
        finished: false,
        current_round: 1,
        player1_score: 0,
        player2_score: 0,
        rounds: create_initial_rounds(sender),
        winner: option::none(),
        created_at: tx_context::epoch(ctx),
        stake_amount,
        prize_pool: coin::into_balance(stake),
    };

    vector::push_back(&mut registry.games, game_id_copy);
    registry.active_games = registry.active_games + 1;

    event::emit(GameCreated {
        game_id: game_id_copy,
        creator: sender,
    });

    transfer::share_object(game);
}

// Join an existing game with matching stake
entry fun join_game(game: &mut Game, stake: Coin<SUI>, ctx: &TxContext) {
    let sender = tx_context::sender(ctx);
    let stake_value = coin::value(&stake);

    assert!(!game.started, EGameAlreadyStarted);
    assert!(option::is_none(&game.player2), EGameFull);
    assert!(game.player1 != sender, EInvalidPlayer);
    assert!(stake_value == game.stake_amount, EInvalidStakeAmount);

    game.player2 = option::some(sender);

    // Add the stake to the prize pool
    balance::join(&mut game.prize_pool, coin::into_balance(stake));

    // Update round shooter/keeper assignments
    update_round_assignments(&mut game.rounds, sender);

    event::emit(PlayerJoined {
        game_id: object::uid_to_inner(&game.id),
        player: sender,
    });
}

// Start the game (can be called by either player once both have joined)
entry fun start_game(game: &mut Game, ctx: &TxContext) {
    let sender = tx_context::sender(ctx);

    assert!(!game.started, EGameAlreadyStarted);
    assert!(option::is_some(&game.player2), EInvalidPlayer);
    assert!(sender == game.player1 || sender == *option::borrow(&game.player2), EInvalidPlayer);

    game.started = true;

    event::emit(GameStarted {
        game_id: object::uid_to_inner(&game.id),
        player1: game.player1,
        player2: *option::borrow(&game.player2),
    });
}

// Submit a shoot direction
entry fun shoot(game: &mut Game, direction: u8, ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);

    assert!(game.started, EGameNotStarted);
    assert!(!game.finished, EGameFinished);
    assert!(is_valid_direction(direction), EInvalidDirection);

    let round_index = (game.current_round as u64) - 1;
    let current_round = vector::borrow_mut(&mut game.rounds, round_index);
    assert!(sender == current_round.shooter, ENotPlayerTurn);
    assert!(option::is_none(&current_round.shoot_direction), ENotPlayerTurn);

    current_round.shoot_direction = option::some(direction);

    event::emit(MoveSubmitted {
        game_id: object::uid_to_inner(&game.id),
        player: sender,
        round: game.current_round,
        is_shoot: true,
    });

    // Check if round is complete and resolve
    if (option::is_some(&current_round.keep_direction)) {
        resolve_round(game, ctx);
    };
}

// Submit a keep direction
entry fun keep(game: &mut Game, direction: u8, ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);

    assert!(game.started, EGameNotStarted);
    assert!(!game.finished, EGameFinished);
    assert!(is_valid_direction(direction), EInvalidDirection);

    let round_index = (game.current_round as u64) - 1;
    let current_round = vector::borrow_mut(&mut game.rounds, round_index);
    assert!(sender == current_round.keeper, ENotPlayerTurn);
    assert!(option::is_none(&current_round.keep_direction), ENotPlayerTurn);

    current_round.keep_direction = option::some(direction);

    event::emit(MoveSubmitted {
        game_id: object::uid_to_inner(&game.id),
        player: sender,
        round: game.current_round,
        is_shoot: false,
    });

    // Check if round is complete and resolve
    if (option::is_some(&current_round.shoot_direction)) {
        resolve_round(game, ctx);
    };
}

// Internal function to resolve a completed round
fun resolve_round(game: &mut Game, ctx: &mut TxContext) {
    let round_index = (game.current_round as u64) - 1;
    let current_round = vector::borrow_mut(&mut game.rounds, round_index);

    let shoot_dir = *option::borrow(&current_round.shoot_direction);
    let keep_dir = *option::borrow(&current_round.keep_direction);

    // Goal is scored if keeper guesses wrong direction
    let is_goal = shoot_dir != keep_dir;
    current_round.is_goal = option::some(is_goal);
    current_round.completed = true;

    // Update scores
    if (is_goal) {
        if (current_round.shooter == game.player1) {
            game.player1_score = game.player1_score + 1;
        } else {
            game.player2_score = game.player2_score + 1;
        };
    };

    event::emit(RoundCompleted {
        game_id: object::uid_to_inner(&game.id),
        round: game.current_round,
        shooter: current_round.shooter,
        keeper: current_round.keeper,
        is_goal,
        player1_score: game.player1_score,
        player2_score: game.player2_score,
    });

    // Check if game is finished
    if (game.current_round == MAX_ROUNDS) {
        finish_game(game, ctx);
    } else {
        game.current_round = game.current_round + 1;
    };
}

// Internal function to finish the game
fun finish_game(game: &mut Game, ctx: &mut TxContext) {
    game.finished = true;

    // Determine winner and distribute prize
    if (game.player1_score > game.player2_score) {
        game.winner = option::some(game.player1);
        // Winner takes all
        let prize = coin::from_balance(balance::withdraw_all(&mut game.prize_pool), ctx);
        transfer::public_transfer(prize, game.player1);
    } else if (game.player2_score > game.player1_score) {
        let player2_addr = *option::borrow(&game.player2);
        game.winner = option::some(player2_addr);
        // Winner takes all
        let prize = coin::from_balance(balance::withdraw_all(&mut game.prize_pool), ctx);
        transfer::public_transfer(prize, player2_addr);
    } else {
        // Draw - split the prize pool equally
        let total_balance = balance::value(&game.prize_pool);
        let half_amount = total_balance / 2;
        
        let player1_share = coin::from_balance(balance::split(&mut game.prize_pool, half_amount), ctx);
        let player2_share = coin::from_balance(balance::withdraw_all(&mut game.prize_pool), ctx);
        
        transfer::public_transfer(player1_share, game.player1);
        transfer::public_transfer(player2_share, *option::borrow(&game.player2));
    };

    event::emit(GameFinished {
        game_id: object::uid_to_inner(&game.id),
        winner: game.winner,
        final_score_p1: game.player1_score,
        final_score_p2: game.player2_score,
    });
}

// Helper function to validate direction
fun is_valid_direction(direction: u8): bool {
    direction == DIRECTION_LEFT || direction == DIRECTION_CENTER || direction == DIRECTION_RIGHT
}

// View functions
public fun get_game_state(
    game: &Game,
): (
    address, // player1
    Option<address>, // player2
    bool, // started
    bool, // finished
    u8, // current_round
    u8, // player1_score
    u8, // player2_score
    Option<address>, // winner
    u64, // stake_amount
    u64, // prize_pool_value
) {
    (
        game.player1,
        game.player2,
        game.started,
        game.finished,
        game.current_round,
        game.player1_score,
        game.player2_score,
        game.winner,
        game.stake_amount,
        balance::value(&game.prize_pool),
    )
}

public fun get_current_round_info(game: &Game): (u8, address, address, bool, bool) {
    if (game.current_round > MAX_ROUNDS || !game.started) {
        return (0, @0x0, @0x0, false, false)
    };

    let round_index = (game.current_round as u64) - 1;
    let round = vector::borrow(&game.rounds, round_index);
    (
        round.round_number,
        round.shooter,
        round.keeper,
        option::is_some(&round.shoot_direction),
        option::is_some(&round.keep_direction),
    )
}

public fun get_round_result(game: &Game, round_num: u8): (bool, Option<bool>) {
    if (round_num == 0 || round_num > MAX_ROUNDS) {
        return (false, option::none())
    };

    let round_index = (round_num as u64) - 1;
    let round = vector::borrow(&game.rounds, round_index);
    (round.completed, round.is_goal)
}

// Get the current turn (who should play next)
// Returns the address of the player who can currently make a move
// Returns None if both moves are submitted or game is not active
public fun get_current_turn(game: &Game): Option<address> {
    if (!game.started || game.finished || game.current_round > MAX_ROUNDS) {
        return option::none()
    };

    let round_index = (game.current_round as u64) - 1;
    let round = vector::borrow(&game.rounds, round_index);

    let shoot_submitted = option::is_some(&round.shoot_direction);
    let keep_submitted = option::is_some(&round.keep_direction);

    // If both moves submitted, no one can play (waiting for resolution)
    if (shoot_submitted && keep_submitted) {
        return option::none()
    };

    // If neither move submitted, both can play - return None to indicate both can play
    if (!shoot_submitted && !keep_submitted) {
        return option::none()
    };

    // If only shoot submitted, keeper can play
    if (shoot_submitted && !keep_submitted) {
        return option::some(round.keeper)
    };

    // If only keep submitted, shooter can play
    if (!shoot_submitted && keep_submitted) {
        return option::some(round.shooter)
    };

    // Should never reach here
    option::none()
}

// Constants for frontend
public fun direction_left(): u8 { DIRECTION_LEFT }

public fun direction_center(): u8 { DIRECTION_CENTER }

public fun direction_right(): u8 { DIRECTION_RIGHT }

public fun max_rounds(): u8 { MAX_ROUNDS }

// Get available games (games that need a second player)
public fun get_available_games(registry: &GameRegistry): vector<ID> {
    registry.games
}

// Get stake amount for a game
public fun get_stake_amount(game: &Game): u64 {
    game.stake_amount
}

// Get current prize pool value
public fun get_prize_pool_value(game: &Game): u64 {
    balance::value(&game.prize_pool)
}
