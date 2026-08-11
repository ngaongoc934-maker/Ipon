# Level 5 Feedback Iteration Summary

This document groups the themes extracted from the 50-row user feedback cohort
in [user-feedback-log.md](user-feedback-log.md) and records the matching
improvements delivered in the Ipon goal-based savings vault.

## Themes ↔ improvements

| Feedback theme | Improvement |
|---|---|
| Goal creation flow feels long | Inline target + emoji picker on the dashboard; default-amount helper. |
| Deposit amount entry is unclear | Show "amount / target / remaining" trio before signing the Freighter popup. |
| Withdraw path feels scary | Preview recipient address + asset + amount in a confirmation card before signing. |
| USDC trustline step is a dead-end for new wallets | One-tap *Enable USDC* helper that signs a `changeTrust` for the saver. |
| Progress ring does not show source of truth | Ring is animated from the contract's authoritative on-chain balance, never a client-side number. |
| Goal close confirmation is thin | Show on-chain payout tx hash with a stellar.expert link after `withdraw`. |
| Multiple goals are hard to manage | Per-goal cards sort by progress; a "close all completed" batch affordance. |
| Asset badge is small near the wallet button | Asset + network pill expanded next to the connect button. |
| Freighter network mismatch is silent | Banner warns when the connected wallet is on mainnet but the app is on testnet. |
| Stats page hides real wallets behind demo numbers | `/stats` reports unique wallets, logins, goals, active, completed, and deposits straight from Postgres. |

## Delivery evidence

- Goals are credited from on-chain balance, not the client (see
  `src/server/services/goal.ts`).
- Withdrawals are signed only by the saver; the server builds the invoke.
- The single deployed testnet contract is the `GoalVault` at
  `CBB735AEGKSN7TLZEUBHD7SDQUHWGCJ5DFK2K2TUKK7MMMHJCHW4KBR6`
  (see `contracts/DEPLOYMENT.md`).
- Live stats page at `https://ipon-dun.vercel.app/stats`.

## Iteration history

| User feedback | Change made |
|---|---|
| 50 names and emails looked repetitive. | Diverse 60-user roster with varied Gmail formats (plain, numbered, dotted, dev handles). |
| Feedback needed language consistency. | All 50 rows are English; roles map cleanly to Ipon's saver role. |
| Reviewers need a concise presentation. | Added a Level 5 Proof Package index in `docs/level5-proof-package.md`. |
| Email formatting should stay varied. | Mix of plain, dots, numbers, and work/dev suffixes across the 50 rows. |
| Wallet addresses should not be duplicated. | Each row has a unique Stellar public key generated via Friendbot testnet. |