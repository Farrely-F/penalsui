#[test_only]
module penalsui::game_tests;

use penalsui::game::{Self, Game, GameRegistry};
use sui::test_scenario::{Self as ts, Scenario};
use sui::coin::{Self, Coin};
use sui::sui::SUI;

// Test addresses
const PLAYER1: address = @0xa1;
const PLAYER2: address = @0xa2;
const ADMIN: address = @0xad;

// Helper function to create test scenario
fun create_test_scenario(): Scenario {
    ts::begin(ADMIN)
}

// Helper function to get direction constants
fun get_directions(): (u8, u8, u8) {
    (game::direction_left(), game::direction_center(), game::direction_right())
}

#[test]
fun test_init_contract() {
    let mut scenario = create_test_scenario();

    // Initialize the contract
    {
        let ctx = ts::ctx(&mut scenario);
        game::init_for_testing(ctx);
    };

    // Check that GameRegistry was created and shared
    ts::next_tx(&mut scenario, ADMIN);
    {
        assert!(ts::has_most_recent_shared<GameRegistry>(), 0);
    };

    ts::end(scenario);
}

#[test]
fun test_create_game() {
    let mut scenario = create_test_scenario();

    // Initialize the contract
    {
        let ctx = ts::ctx(&mut scenario);
        game::init_for_testing(ctx);
    };

    // Player1 creates a game with stake
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut registry = ts::take_shared<GameRegistry>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000, ctx); // 0.001 SUI

        game::create_game(&mut registry, stake, ctx);

        ts::return_shared(registry);
    };

    // Check that a game was created
    ts::next_tx(&mut scenario, PLAYER1);
    {
        assert!(ts::has_most_recent_shared<Game>(), 0);

        let game = ts::take_shared<Game>(&scenario);
        let (
            player1,
            player2,
            started,
            finished,
            current_round,
            p1_score,
            p2_score,
            winner,
            stake_amount,
            prize_pool,
        ) = game::get_game_state(&game);

        assert!(player1 == PLAYER1, 1);
        assert!(option::is_none(&player2), 2);
        assert!(!started, 3);
        assert!(!finished, 4);
        assert!(current_round == 1, 5);
        assert!(p1_score == 0, 6);
        assert!(p2_score == 0, 7);
        assert!(option::is_none(&winner), 8);
        assert!(stake_amount == 1000000, 9); // 0.001 SUI
        assert!(prize_pool == 1000000, 10); // 0.001 SUI in prize pool

        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
fun test_join_game() {
    let mut scenario = create_test_scenario();

    // Initialize and create game
    {
        let ctx = ts::ctx(&mut scenario);
        game::init_for_testing(ctx);
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut registry = ts::take_shared<GameRegistry>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000000, ctx); // 1 SUI
        game::create_game(&mut registry, stake, ctx);
        ts::return_shared(registry);
    };

    // Player 2 joins the game
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000000, ctx); // 1 SUI

        game::join_game(&mut game, stake, ctx);

        let (_, player2, _, _, _, _, _, _, _, _) = game::get_game_state(&game);
        assert!(option::is_some(&player2), 1);
        assert!(*option::borrow(&player2) == PLAYER2, 2);

        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
fun test_start_game() {
    let mut scenario = create_test_scenario();

    // Setup: Initialize, create, and join game
    {
        let ctx = ts::ctx(&mut scenario);
        game::init_for_testing(ctx);
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut registry = ts::take_shared<GameRegistry>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000000, ctx); // 1 SUI
        game::create_game(&mut registry, stake, ctx);
        ts::return_shared(registry);
    };

    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000000, ctx); // 1 SUI
        game::join_game(&mut game, stake, ctx);
        ts::return_shared(game);
    };

    // Player1 starts the game
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        game::start_game(&mut game, ctx);

        let (_, _, started, _, _, _, _, _, _, _) = game::get_game_state(&game);
        assert!(started, 1);

        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
fun test_current_round_info() {
    let mut scenario = setup_started_game();

    // Check initial round info
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let game = ts::take_shared<Game>(&scenario);

        let (round_num, shooter, keeper, has_shoot, has_keep) = game::get_current_round_info(&game);

        assert!(round_num == 1, 1);
        assert!(shooter == PLAYER1, 2); // Player1 shoots in odd rounds
        assert!(keeper == PLAYER2, 3); // Player2 keeps in odd rounds
        assert!(!has_shoot, 4);
        assert!(!has_keep, 5);

        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
fun test_shoot_and_keep_round_1() {
    let mut scenario = setup_started_game();
    let (left, center, _right) = get_directions();

    // Player1 shoots left
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        game::shoot(&mut game, left, ctx);

        let (_, _, _, has_shoot, has_keep) = game::get_current_round_info(&game);
        assert!(has_shoot, 1);
        assert!(!has_keep, 2);

        ts::return_shared(game);
    };

    // Player2 keeps center (wrong guess -> goal!)
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        game::keep(&mut game, center, ctx);

        // Round should be complete and scores updated
        let (_, _, _, _, current_round, p1_score, p2_score, _, _, _) = game::get_game_state(&game);

        assert!(current_round == 2, 1); // Should advance to round 2
        assert!(p1_score == 1, 2); // Player1 scored
        assert!(p2_score == 0, 3); // Player2 didn't score

        // Check round 1 result
        let (completed, is_goal) = game::get_round_result(&game, 1);
        assert!(completed, 4);
        assert!(option::is_some(&is_goal), 5);
        assert!(*option::borrow(&is_goal), 6); // Was a goal

        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
fun test_keeper_saves_shot() {
    let mut scenario = setup_started_game();
    let (left, _, _) = get_directions();

    // Player1 shoots left, Player2 also guesses left (save!)
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        game::shoot(&mut game, left, ctx);
        ts::return_shared(game);
    };

    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);

        game::keep(&mut game, left, ctx); // Same direction = save

        let (_, _, _, _, _, p1_score, p2_score, _, _, _) = game::get_game_state(&game);
        assert!(p1_score == 0, 1); // No goal scored
        assert!(p2_score == 0, 2);

        // Check round result
        let (completed, is_goal) = game::get_round_result(&game, 1);
        assert!(completed, 3);
        assert!(!*option::borrow(&is_goal), 4); // Was not a goal (save)

        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
fun test_round_2_role_switch() {
    let mut scenario = setup_started_game();
    let (left, center, _) = get_directions();

    // Complete round 1
    complete_round(&mut scenario, PLAYER1, PLAYER2, left, center);

    // Check round 2 roles (should be switched)
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let game = ts::take_shared<Game>(&scenario);

        let (round_num, shooter, keeper, _, _) = game::get_current_round_info(&game);
        assert!(round_num == 2, 1);
        assert!(shooter == PLAYER2, 2); // Player2 shoots in even rounds
        assert!(keeper == PLAYER1, 3); // Player1 keeps in even rounds

        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
fun test_complete_game_player1_wins() {
    let mut scenario = setup_started_game();
    let (left, center, right) = get_directions();

    // Round 1: P1 shoots, P2 keeps - P1 scores
    complete_round(&mut scenario, PLAYER1, PLAYER2, left, center);

    // Round 2: P2 shoots, P1 keeps - P1 saves
    complete_round(&mut scenario, PLAYER2, PLAYER1, right, right);

    // Round 3: P1 shoots, P2 keeps - P1 scores
    complete_round(&mut scenario, PLAYER1, PLAYER2, center, left);

    // Round 4: P2 shoots, P1 keeps - P1 saves
    complete_round(&mut scenario, PLAYER2, PLAYER1, left, left);

    // Round 5: P1 shoots, P2 keeps - P1 scores (final round)
    complete_round(&mut scenario, PLAYER1, PLAYER2, right, center);

    // Check final game state
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let game = ts::take_shared<Game>(&scenario);

        let (_, _, _, finished, _, p1_score, p2_score, winner, _, _) = game::get_game_state(&game);

        assert!(finished, 1);
        assert!(p1_score == 3, 2); // Player1 scored 3 goals
        assert!(p2_score == 0, 3); // Player2 scored 0 goals
        assert!(option::is_some(&winner), 4);
        assert!(*option::borrow(&winner) == PLAYER1, 5); // Player1 wins

        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
fun test_draw_game() {
    let mut scenario = setup_started_game();
    let (left, center, right) = get_directions();

    // Create a 2-2 draw scenario
    // Round 1: P1 scores
    complete_round(&mut scenario, PLAYER1, PLAYER2, left, center);
    // Round 2: P2 scores
    complete_round(&mut scenario, PLAYER2, PLAYER1, right, left);
    // Round 3: P1 scores
    complete_round(&mut scenario, PLAYER1, PLAYER2, center, right);
    // Round 4: P2 scores
    complete_round(&mut scenario, PLAYER2, PLAYER1, left, center);
    // Round 5: Both miss (no score)
    complete_round(&mut scenario, PLAYER1, PLAYER2, right, right);

    // Check draw result
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let game = ts::take_shared<Game>(&scenario);

        let (_, _, _, finished, _, p1_score, p2_score, winner, _, _) = game::get_game_state(&game);

        assert!(finished, 1);
        assert!(p1_score == 2, 2);
        assert!(p2_score == 2, 3);
        assert!(option::is_none(&winner), 4); // Draw - no winner

        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = penalsui::game::EGameFull)]
fun test_cannot_join_full_game() {
    let mut scenario = create_test_scenario();

    // Setup game with 2 players
    {
        let ctx = ts::ctx(&mut scenario);
        game::init_for_testing(ctx);
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut registry = ts::take_shared<GameRegistry>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000000, ctx); // 1 SUI
        game::create_game(&mut registry, stake, ctx);
        ts::return_shared(registry);
    };

    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000000, ctx); // 1 SUI
        game::join_game(&mut game, stake, ctx);
        ts::return_shared(game);
    };

    // Third player tries to join - should fail
    ts::next_tx(&mut scenario, @0xa3);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000000, ctx); // 1 SUI
        game::join_game(&mut game, stake, ctx); // Should abort with EGameFull
        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = penalsui::game::EInvalidPlayer)]
fun test_creator_cannot_join_own_game() {
    let mut scenario = create_test_scenario();

    {
        let ctx = ts::ctx(&mut scenario);
        game::init_for_testing(ctx);
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut registry = ts::take_shared<GameRegistry>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000000, ctx); // 1 SUI
        game::create_game(&mut registry, stake, ctx);
        ts::return_shared(registry);
    };

    // Player1 tries to join their own game - should fail
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000000, ctx); // 1 SUI
        game::join_game(&mut game, stake, ctx); // Should abort with EInvalidPlayer
        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = penalsui::game::EGameNotStarted)]
fun test_cannot_shoot_before_game_starts() {
    let mut scenario = create_test_scenario();
    let (left, _, _) = get_directions();

    {
        let ctx = ts::ctx(&mut scenario);
        game::init_for_testing(ctx);
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut registry = ts::take_shared<GameRegistry>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000000, ctx); // 1 SUI
        game::create_game(&mut registry, stake, ctx);
        ts::return_shared(registry);
    };

    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000000, ctx); // 1 SUI
        game::join_game(&mut game, stake, ctx);
        ts::return_shared(game);
    };

    // Try to shoot before starting game - should fail
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        game::shoot(&mut game, left, ctx); // Should abort with EGameNotStarted
        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = penalsui::game::ENotPlayerTurn)]
fun test_wrong_player_cannot_shoot() {
    let mut scenario = setup_started_game();
    let (left, _, _) = get_directions();

    // Player2 tries to shoot in round 1 (should be Player1's turn)
    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        game::shoot(&mut game, left, ctx); // Should abort with ENotPlayerTurn
        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = penalsui::game::EInvalidDirection)]
fun test_invalid_direction() {
    let mut scenario = setup_started_game();

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        game::shoot(&mut game, 99, ctx); // Invalid direction - should abort
        ts::return_shared(game);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = penalsui::game::ENotPlayerTurn)]
fun test_cannot_shoot_twice() {
    let mut scenario = setup_started_game();
    let (left, center, _) = get_directions();

    // Player1 shoots once
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        game::shoot(&mut game, left, ctx);
        ts::return_shared(game);
    };

    // Player1 tries to shoot again - should fail
    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        game::shoot(&mut game, center, ctx); // Should abort with ENotPlayerTurn
        ts::return_shared(game);
    };

    ts::end(scenario);
}

// Helper function to set up a started game
fun setup_started_game(): Scenario {
    let mut scenario = create_test_scenario();

    {
        let ctx = ts::ctx(&mut scenario);
        game::init_for_testing(ctx);
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut registry = ts::take_shared<GameRegistry>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000000, ctx); // 1 SUI
        game::create_game(&mut registry, stake, ctx);
        ts::return_shared(registry);
    };

    ts::next_tx(&mut scenario, PLAYER2);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        let stake = coin::mint_for_testing<SUI>(1000000000, ctx); // 1 SUI
        game::join_game(&mut game, stake, ctx);
        ts::return_shared(game);
    };

    ts::next_tx(&mut scenario, PLAYER1);
    {
        let mut game = ts::take_shared<Game>(&scenario);
        let ctx = ts::ctx(&mut scenario);
        game::start_game(&mut game, ctx);
        ts::return_shared(game);
    };

    scenario
}

// Helper function to complete a round
fun complete_round(
    scenario: &mut Scenario,
    shooter: address,
    keeper: address,
    shoot_dir: u8,
    keep_dir: u8,
) {
    ts::next_tx(scenario, shooter);
    {
        let mut game = ts::take_shared<Game>(scenario);
        let ctx = ts::ctx(scenario);
        game::shoot(&mut game, shoot_dir, ctx);
        ts::return_shared(game);
    };

    ts::next_tx(scenario, keeper);
    {
        let mut game = ts::take_shared<Game>(scenario);
        let ctx = ts::ctx(scenario);
        game::keep(&mut game, keep_dir, ctx);
        ts::return_shared(game);
    };
}
