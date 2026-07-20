use soroban_sdk::{contracttype, Address, BytesN};

/// Storage keys. `Goal` lives in *persistent* storage (it must outlive the
/// contract instance so funds are never stranded); `Admin`/`Token`/`Paused`/
/// `TotalSaved` live in *instance* storage so they share the instance TTL.
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    /// Default token (the XLM Stellar Asset Contract) recorded at init.
    Token,
    Paused,
    /// Running total of all minor units ever deposited across every goal.
    TotalSaved,
    /// (saver, goal_id) -> Goal
    Goal(Address, BytesN<32>),
}

// Soroban ledgers close ~every 5s -> 17,280 ledgers/day.
pub const DAY_IN_LEDGERS: u32 = 17_280;

// Keep the contract instance (admin/config) alive ~30 days, re-bumped on every
// state-changing call.
pub const INSTANCE_BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
pub const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_AMOUNT - DAY_IN_LEDGERS;

// Goal entries are bumped to ~90 days so a saver's funds can never expire out
// from under them before they withdraw.
pub const GOAL_BUMP_AMOUNT: u32 = 90 * DAY_IN_LEDGERS;
pub const GOAL_LIFETIME_THRESHOLD: u32 = GOAL_BUMP_AMOUNT - DAY_IN_LEDGERS;
