#![no_std]
//! # Goal Vault
//!
//! A Soroban smart contract that escrows a saver's funds toward a **named goal
//! target**. It is the trust-minimized core of the Ipon savings app: instead of
//! the backend custodying deposits in a hot wallet, each saver locks XLM (or any
//! Stellar Asset Contract asset) *in the contract*, keyed by `(saver, goal_id)`,
//! and only that saver can pull their balance back out.
//!
//! ## Properties
//! - **Real on-chain custody** via the Stellar Asset Contract (SAC). The default
//!   token recorded at init is the native **XLM** SAC — no trustline required.
//! - **Per-saver, per-goal balances** — funds are namespaced by the saver's
//!   address, so no goal can ever touch another saver's money.
//! - **Authorization** — `require_auth` on the saver for both deposit and
//!   withdraw; the contract pays out withdrawals from its own balance.
//! - **Self-custody withdraw** — a saver can always reclaim their own balance
//!   (reaching the target is tracked but never required to withdraw).
//! - **Admin + pausable + upgradeable** — operational safety; the admin is the
//!   deployer and can pause new deposits and ship Wasm fixes. Withdrawals are
//!   never blocked by pause, so funds are never trapped.
//! - **Events** — `init`, `deposit`, `withdraw`, `pause` for indexers.

mod error;
mod storage;
mod types;

#[cfg(test)]
mod test;

use error::Error;
use storage::{
    DataKey, GOAL_BUMP_AMOUNT, GOAL_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT,
    INSTANCE_LIFETIME_THRESHOLD,
};
use types::{Goal, GoalStatus};

use soroban_sdk::{contract, contractimpl, symbol_short, token, Address, BytesN, Env};

#[contract]
pub struct GoalVault;

#[contractimpl]
impl GoalVault {
    /// One-time setup. Records the admin (the deployer) and the default token
    /// (the XLM Stellar Asset Contract), and unpauses the contract.
    pub fn initialize(env: Env, admin: Address, token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().set(&DataKey::TotalSaved, &0i128);
        bump_instance(&env);
        env.events().publish((symbol_short!("init"),), (admin, token));
        Ok(())
    }

    /// Deposit `amount` of `token` toward the `(saver, goal_id)` goal, locking it
    /// in the contract. Creates the goal on first deposit (binding its `target`
    /// and `token`); accumulates on subsequent deposits. Returns the new balance.
    ///
    /// Auth: requires the saver's signature. The same authorization covers the
    /// inner SAC `transfer(saver -> contract)`.
    pub fn deposit(
        env: Env,
        saver: Address,
        goal_id: BytesN<32>,
        token: Address,
        target: i128,
        amount: i128,
    ) -> Result<i128, Error> {
        saver.require_auth();
        require_not_paused(&env)?;

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if target <= 0 {
            return Err(Error::InvalidTarget);
        }

        let key = DataKey::Goal(saver.clone(), goal_id.clone());
        let mut goal = match env.storage().persistent().get::<_, Goal>(&key) {
            Some(existing) => {
                if existing.status == GoalStatus::Withdrawn {
                    return Err(Error::GoalClosed);
                }
                if existing.token != token {
                    return Err(Error::WrongToken);
                }
                existing
            }
            None => Goal {
                saver: saver.clone(),
                token: token.clone(),
                target,
                balance: 0,
                deposited: 0,
                status: GoalStatus::Saving,
            },
        };

        // Pull the deposit into the contract's custody.
        token::Client::new(&env, &token).transfer(
            &saver,
            &env.current_contract_address(),
            &amount,
        );

        goal.balance += amount;
        goal.deposited += amount;
        goal.status = if goal.balance >= goal.target {
            GoalStatus::Reached
        } else {
            GoalStatus::Saving
        };
        save_goal(&env, &key, &goal);

        let total: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSaved)
            .unwrap_or(0i128);
        env.storage()
            .instance()
            .set(&DataKey::TotalSaved, &(total + amount));
        bump_instance(&env);

        env.events()
            .publish((symbol_short!("deposit"), saver), (goal_id, amount, goal.balance));
        Ok(goal.balance)
    }

    /// Withdraw the full held balance of `(saver, goal_id)` back to the saver and
    /// close the goal. Allowed at any time by the goal's owner. Returns the amount
    /// paid out. Pausing the contract never blocks this — funds can't be trapped.
    ///
    /// Auth: requires the saver's signature.
    pub fn withdraw(env: Env, saver: Address, goal_id: BytesN<32>) -> Result<i128, Error> {
        saver.require_auth();

        let key = DataKey::Goal(saver.clone(), goal_id.clone());
        let mut goal = env
            .storage()
            .persistent()
            .get::<_, Goal>(&key)
            .ok_or(Error::GoalNotFound)?;

        if goal.balance <= 0 {
            return Err(Error::NothingToWithdraw);
        }

        let amount = goal.balance;
        token::Client::new(&env, &goal.token).transfer(
            &env.current_contract_address(),
            &saver,
            &amount,
        );

        goal.balance = 0;
        goal.status = GoalStatus::Withdrawn;
        save_goal(&env, &key, &goal);
        bump_instance(&env);

        env.events()
            .publish((symbol_short!("withdraw"), saver), (goal_id, amount));
        Ok(amount)
    }

    // --- Views -------------------------------------------------------------

    pub fn get_goal(env: Env, saver: Address, goal_id: BytesN<32>) -> Result<Goal, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Goal(saver, goal_id))
            .ok_or(Error::GoalNotFound)
    }

    pub fn balance(env: Env, saver: Address, goal_id: BytesN<32>) -> i128 {
        env.storage()
            .persistent()
            .get::<_, Goal>(&DataKey::Goal(saver, goal_id))
            .map(|g| g.balance)
            .unwrap_or(0)
    }

    pub fn total_saved(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSaved)
            .unwrap_or(0i128)
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    pub fn get_token(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    // --- Admin -------------------------------------------------------------

    pub fn pause(env: Env) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Paused, &true);
        bump_instance(&env);
        env.events().publish((symbol_short!("pause"),), true);
        Ok(())
    }

    pub fn unpause(env: Env) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Paused, &false);
        bump_instance(&env);
        env.events().publish((symbol_short!("pause"),), false);
        Ok(())
    }

    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        bump_instance(&env);
        Ok(())
    }

    /// Replace the contract's own code (admin-gated). Enables shipping fixes
    /// without migrating saver balances.
    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        admin(&env)?.require_auth();
        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }
}

// --- Internal helpers ------------------------------------------------------

fn admin(env: &Env) -> Result<Address, Error> {
    env.storage()
        .instance()
        .get(&DataKey::Admin)
        .ok_or(Error::NotInitialized)
}

fn require_not_paused(env: &Env) -> Result<(), Error> {
    let paused: bool = env
        .storage()
        .instance()
        .get(&DataKey::Paused)
        .ok_or(Error::NotInitialized)?;
    if paused {
        return Err(Error::Paused);
    }
    Ok(())
}

fn save_goal(env: &Env, key: &DataKey, goal: &Goal) {
    env.storage().persistent().set(key, goal);
    env.storage()
        .persistent()
        .extend_ttl(key, GOAL_LIFETIME_THRESHOLD, GOAL_BUMP_AMOUNT);
}

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_AMOUNT);
}
