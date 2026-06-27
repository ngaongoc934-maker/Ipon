use soroban_sdk::{contracttype, Address};

/// Lifecycle of a saver's goal.
/// A goal starts `Saving`; it flips to `Reached` once its held balance meets the
/// target (purely informational — withdraw is allowed in either state); it
/// becomes `Withdrawn` once the saver pulls the full balance back out.
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum GoalStatus {
    Saving = 0,
    Reached = 1,
    Withdrawn = 2,
}

/// A single saver's goal, keyed in storage by `(saver, goal_id)`.
///
/// The contract custodies exactly `balance` minor units of `token` for this
/// goal. `deposited` is the lifetime sum ever paid in (never decremented), so
/// the UI can show "saved so far" even after a withdrawal.
#[contracttype]
#[derive(Clone)]
pub struct Goal {
    /// Owner; the only address allowed to deposit to or withdraw this goal.
    pub saver: Address,
    /// Stellar Asset Contract (SAC) address of the saved asset (XLM SAC by default).
    pub token: Address,
    /// Target the saver is working toward, in the token's minor units (7 dp).
    pub target: i128,
    /// Balance currently held in the contract for this goal.
    pub balance: i128,
    /// Lifetime total ever deposited (monotonic; survives withdrawals).
    pub deposited: i128,
    pub status: GoalStatus,
}
