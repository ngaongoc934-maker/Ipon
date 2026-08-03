# GoalVault — Soroban savings contract

The on-chain core of **Ipon**. Instead of a backend hot wallet custodying deposits, every
saver locks XLM (the native SAC) **inside this contract**, keyed by `(saver, goal_id)`, and
only that saver can withdraw their balance back to themselves.

## Why it exists

A "savings" app is only honest if the money is actually held somewhere the operator can't
move it. GoalVault makes the deposit a real `transfer(saver -> contract)` under the saver's
own authorization, and the withdraw a real `transfer(contract -> saver)` that nobody but the
owner can trigger. The progress ring in the UI moves because the ledger moved.

## Design

- **Per-saver, per-goal balances** — funds are namespaced by the saver's `Address`, so a goal
  can never touch another saver's money (`goals_are_isolated_per_saver` test).
- **Self-custody withdraw** — a saver can always reclaim their own balance; reaching the target
  is tracked (`Reached`) but never required to withdraw.
- **Pausable, but never traps funds** — `pause` blocks new deposits; `withdraw` always works.
- **Admin = deployer**, upgradeable Wasm for mainnet fixes without migrating balances.

## Entrypoints

| Method | Auth | Effect |
|--------|------|--------|
| `initialize(admin, token)` | once | sets admin + default token (XLM SAC) |
| `deposit(saver, goal_id, token, target, amount)` | saver | locks `amount`; creates the goal on first deposit |
| `withdraw(saver, goal_id)` | saver | returns the full held balance, closes the goal |
| `get_goal / balance / total_saved / is_paused / get_token / get_admin` | — | views |
| `pause / unpause / set_admin / upgrade` | admin | ops |

## Build & test

```bash
make test       # cargo +1.89.0 test — 13 unit tests, all green
make optimize   # release wasm + stellar contract optimize
```

Deployed testnet instance and exact ids: see [DEPLOYMENT.md](./DEPLOYMENT.md).

A reference TypeScript client (build-on-server, sign-in-Freighter, submit-on-server) lives in
[`ts-client/goal-vault-client.ts`](./ts-client/goal-vault-client.ts); the app's live wiring is
in `src/server/stellar/`.
