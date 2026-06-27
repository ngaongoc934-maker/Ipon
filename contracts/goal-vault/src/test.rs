#![cfg(test)]

use crate::types::GoalStatus;
use crate::{GoalVault, GoalVaultClient};

use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};
use soroban_sdk::{Address, BytesN, Env};

struct Setup<'a> {
    env: Env,
    client: GoalVaultClient<'a>,
    contract: Address,
    token: Address,
    token_client: TokenClient<'a>,
    saver: Address,
}

fn setup<'a>(initial_mint: i128) -> Setup<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let saver = Address::generate(&env);

    // Deploy a Stellar Asset Contract to stand in for the XLM SAC.
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac.address();
    StellarAssetClient::new(&env, &token).mint(&saver, &initial_mint);

    let contract_id = env.register(GoalVault, ());
    let client = GoalVaultClient::new(&env, &contract_id);
    client.initialize(&admin, &token);

    Setup {
        token_client: TokenClient::new(&env, &token),
        env,
        client,
        contract: contract_id,
        token,
        saver,
    }
}

fn goal_id(env: &Env, tag: u8) -> BytesN<32> {
    BytesN::from_array(env, &[tag; 32])
}

#[test]
fn initialize_records_admin_and_token() {
    let s = setup(1_000);
    assert_eq!(s.client.get_token(), s.token);
    assert_eq!(s.client.is_paused(), false);
    assert_eq!(s.client.total_saved(), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")] // AlreadyInitialized
fn double_initialize_fails() {
    let s = setup(1_000);
    let admin2 = Address::generate(&s.env);
    s.client.initialize(&admin2, &s.token);
}

#[test]
fn deposit_locks_funds_and_tracks_balance() {
    let s = setup(1_000);
    let g = goal_id(&s.env, 1);

    let bal = s.client.deposit(&s.saver, &g, &s.token, &500, &200);
    assert_eq!(bal, 200);

    // Saver debited, contract custodies the funds.
    assert_eq!(s.token_client.balance(&s.saver), 800);
    assert_eq!(s.token_client.balance(&s.contract), 200);

    let goal = s.client.get_goal(&s.saver, &g);
    assert_eq!(goal.balance, 200);
    assert_eq!(goal.deposited, 200);
    assert_eq!(goal.target, 500);
    assert_eq!(goal.status, GoalStatus::Saving);
    assert_eq!(s.client.total_saved(), 200);
}

#[test]
fn multiple_deposits_accumulate_and_reach_target() {
    let s = setup(1_000);
    let g = goal_id(&s.env, 2);

    s.client.deposit(&s.saver, &g, &s.token, &500, &200);
    let bal = s.client.deposit(&s.saver, &g, &s.token, &500, &400);
    assert_eq!(bal, 600);

    let goal = s.client.get_goal(&s.saver, &g);
    assert_eq!(goal.balance, 600);
    assert_eq!(goal.deposited, 600);
    assert_eq!(goal.status, GoalStatus::Reached); // 600 >= 500
    assert_eq!(s.client.balance(&s.saver, &g), 600);
    assert_eq!(s.client.total_saved(), 600);
}

#[test]
fn withdraw_returns_full_balance_and_closes_goal() {
    let s = setup(1_000);
    let g = goal_id(&s.env, 3);

    s.client.deposit(&s.saver, &g, &s.token, &300, &300);
    assert_eq!(s.token_client.balance(&s.saver), 700);

    let paid = s.client.withdraw(&s.saver, &g);
    assert_eq!(paid, 300);

    // Funds returned in full; contract holds nothing for this goal.
    assert_eq!(s.token_client.balance(&s.saver), 1_000);
    assert_eq!(s.token_client.balance(&s.contract), 0);

    let goal = s.client.get_goal(&s.saver, &g);
    assert_eq!(goal.balance, 0);
    assert_eq!(goal.deposited, 300); // lifetime total survives the withdrawal
    assert_eq!(goal.status, GoalStatus::Withdrawn);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")] // InvalidAmount
fn deposit_zero_amount_fails() {
    let s = setup(1_000);
    let g = goal_id(&s.env, 4);
    s.client.deposit(&s.saver, &g, &s.token, &500, &0);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")] // InvalidTarget
fn deposit_zero_target_fails() {
    let s = setup(1_000);
    let g = goal_id(&s.env, 5);
    s.client.deposit(&s.saver, &g, &s.token, &0, &100);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")] // GoalClosed
fn deposit_to_withdrawn_goal_fails() {
    let s = setup(1_000);
    let g = goal_id(&s.env, 6);
    s.client.deposit(&s.saver, &g, &s.token, &100, &100);
    s.client.withdraw(&s.saver, &g);
    // Goal is closed; re-depositing is rejected.
    s.client.deposit(&s.saver, &g, &s.token, &100, &50);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")] // NothingToWithdraw
fn withdraw_twice_fails() {
    let s = setup(1_000);
    let g = goal_id(&s.env, 7);
    s.client.deposit(&s.saver, &g, &s.token, &100, &100);
    s.client.withdraw(&s.saver, &g);
    s.client.withdraw(&s.saver, &g);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")] // GoalNotFound
fn withdraw_unknown_goal_fails() {
    let s = setup(1_000);
    let g = goal_id(&s.env, 8);
    s.client.withdraw(&s.saver, &g);
}

#[test]
fn goals_are_isolated_per_saver() {
    let s = setup(1_000);
    let other = Address::generate(&s.env);
    StellarAssetClient::new(&s.env, &s.token).mint(&other, &1_000);
    let g = goal_id(&s.env, 9); // same goal id, different savers

    s.client.deposit(&s.saver, &g, &s.token, &500, &200);
    s.client.deposit(&other, &g, &s.token, &500, &50);

    // Each saver's balance is independent.
    assert_eq!(s.client.balance(&s.saver, &g), 200);
    assert_eq!(s.client.balance(&other, &g), 50);
    assert_eq!(s.client.total_saved(), 250);

    // Other saver withdraws only their own funds.
    let paid = s.client.withdraw(&other, &g);
    assert_eq!(paid, 50);
    assert_eq!(s.client.balance(&s.saver, &g), 200);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")] // Paused
fn deposit_while_paused_fails() {
    let s = setup(1_000);
    let g = goal_id(&s.env, 10);
    s.client.pause();
    s.client.deposit(&s.saver, &g, &s.token, &100, &50);
}

#[test]
fn withdraw_works_even_while_paused() {
    let s = setup(1_000);
    let g = goal_id(&s.env, 11);
    s.client.deposit(&s.saver, &g, &s.token, &100, &100);
    s.client.pause();
    // Pausing must never trap a saver's funds.
    let paid = s.client.withdraw(&s.saver, &g);
    assert_eq!(paid, 100);
    assert_eq!(s.token_client.balance(&s.saver), 1_000);
}
