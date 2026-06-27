# Ipon 🪙

**Saving you can actually keep.** Ipon is a goal-based savings app where every bit of
progress is a real Stellar transaction. Name a goal, deposit XLM (or USDC) into the **GoalVault
Soroban smart contract**, watch the ring fill — then withdraw on-chain whenever you like.

> *Ipon* is Filipino for "to save." No simulated balances, no fake yield, no make-believe
> users — what you see on the page is what's locked in the contract on the ledger.

**Live app → https://ipon-dun.vercel.app**
**Live stats → https://ipon-dun.vercel.app/stats**

![Landing](../screen-shot/01-landing.jpg)

---

## Why it's different

Most "savings" demos fake the money — or custody it in a backend hot wallet. Ipon does neither.
A deposit is a `deposit` call to a **Soroban contract** that you authorize in Freighter; the funds
are transferred into the contract's own custody, keyed to `(your wallet, this goal)`. A withdrawal
is a `withdraw` call that **only you** can trigger, paying the full balance back to your wallet.
The progress ring moves because the ledger moved.

- **Real on-chain custody.** Your savings live inside the GoalVault contract, not a server wallet.
  No operator can move them; the contract pays withdrawals from its own balance.
- **XLM by default.** The vault's default token is the native XLM Stellar Asset Contract — no
  trustline, so any funded testnet wallet works the moment it connects. No `op_no_trust` dead-ends.
- **USDC when you want it.** Choose USDC on a goal and a one-tap *Enable USDC* button signs a
  `changeTrust` for you — then deposits route through the same contract with the USDC SAC.
- **Honest by design.** Amounts are shown in the asset itself. No invented fiat oracle, no "yield."

## How it works

| Step | What happens on-chain |
|------|------------------------|
| **Connect** | SEP-10 style challenge: the server hands you a `manageData` transaction, you sign it in Freighter, the server verifies the signature and opens a session. Signing is **pinned to testnet** even if your wallet is set to mainnet. |
| **Create a goal** | A goal (name, emoji, asset, target) is saved against your wallet. Browsing is open; a wallet is only required to sign. |
| **Deposit** | The server builds a Soroban `deposit(saver, goal_id, token, target, amount)` invoke, you sign it in Freighter, and the server submits it over the Soroban RPC. The contract pulls your funds into custody; the app credits the goal from the contract's **authoritative on-chain balance**. |
| **Withdraw** | The server builds a `withdraw(saver, goal_id)` invoke, you sign it, and the contract pays your full balance back to your wallet. The goal closes with the payout tx recorded. |

![Connect Freighter](../screen-shot/02-connect-popup.jpg)
![Sign the SEP-10 challenge](../screen-shot/03-sign-challenge-popup.jpg)
![Connected dashboard](../screen-shot/04-connected-dashboard.jpg)
![Create a goal](../screen-shot/05-create-goal.jpg)
![Sign the deposit in Freighter](../screen-shot/06-deposit-sign-popup.jpg)
![Deposit locked in the contract](../screen-shot/07-deposit-success.jpg)

## The contract

The on-chain core is a Soroban contract (`contracts/goal-vault`, soroban-sdk 22) that custodies
each saver's funds per goal and lets only the owner withdraw. 13 unit tests cover deposits,
accumulation, target-reached state, self-custody withdrawal, per-saver isolation, and pause safety.

| | |
|---|---|
| **Contract ID** | `CBB735AEGKSN7TLZEUBHD7SDQUHWGCJ5DFK2K2TUKK7MMMHJCHW4KBR6` |
| **Default token (XLM SAC)** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| **Network / RPC** | Testnet / `https://soroban-testnet.stellar.org` |

Explorer: https://stellar.expert/explorer/testnet/contract/CBB735AEGKSN7TLZEUBHD7SDQUHWGCJ5DFK2K2TUKK7MMMHJCHW4KBR6 —
build & deploy notes in [`contracts/DEPLOYMENT.md`](contracts/DEPLOYMENT.md).

```bash
cd contracts
make test       # cargo +1.89.0 test — 13 unit tests
make optimize   # release wasm + stellar contract optimize
./scripts/deploy.sh
```

## Live stats

`/stats` (and `GET /api/stats`) report real interaction counts straight from Postgres —
unique wallets and SEP-10 sign-ins from the `sessions` table, plus goals and on-chain deposits.

![Stats](../screen-shot/08-stats.jpg)

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19**, TypeScript
- **Tailwind CSS v4** — custom *ube violet + coin amber on cream* theme, Fraunces + Plus Jakarta Sans
- **Soroban** (`soroban-sdk` 22) GoalVault contract + **Stellar SDK 15** / **@stellar/freighter-api v6**
- **Drizzle ORM** on **Supabase Postgres**
- **Vitest** (unit) + **Playwright** (live prod e2e)
- Deployed on **Vercel**

## Stellar integration

- **SEP-10 style auth** — challenge/verify with a signed `manageData` transaction; session cookie.
- **Soroban smart contract custody** — deposits and withdrawals are real `invoke_host_function`
  calls against the GoalVault contract; the server builds + submits over Soroban RPC, you sign.
- **Native + classic assets** — XLM via the native SAC (no trustline) by default; USDC via a
  one-tap `changeTrust` helper, then the USDC SAC.
- **Authoritative reads** — a goal is credited from the contract's on-chain balance, never the client.

Testnet USDC issuer: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`

## Quick start

```bash
pnpm install

# .env.local — see the keys below
pnpm run db:push          # push the Drizzle schema to Postgres
pnpm dev                  # http://localhost:3003
```

Required environment variables:

```
DRIZZLE_DATABASE_URL=postgres://...
SESSION_SECRET=<32+ chars>
STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
GOAL_VAULT_CONTRACT_ID=CBB735AEGKSN7TLZEUBHD7SDQUHWGCJ5DFK2K2TUKK7MMMHJCHW4KBR6
NEXT_PUBLIC_GOAL_VAULT_CONTRACT_ID=CBB735AEGKSN7TLZEUBHD7SDQUHWGCJ5DFK2K2TUKK7MMMHJCHW4KBR6
XLM_SAC_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
NEXT_PUBLIC_USDC_CODE=USDC
NEXT_PUBLIC_USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
NEXT_PUBLIC_APP_URL=https://ipon-dun.vercel.app
```

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Run locally on port 3003 |
| `pnpm build` | Production build |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright e2e (set `PLAYWRIGHT_BASE_URL` to run against prod) |
| `pnpm run db:push` | Apply the Drizzle schema |

## Testing on testnet

The e2e suite (`tests/e2e/prod-real.spec.ts`) runs against the **live** deployment with the **real
Freighter extension** loaded into a headed Chromium (no `postMessage` stub, no Node signer). It
drives the actual wallet popup: the SEP-10 connect grant + challenge are signed with a real Approve
click, then a real on-chain deposit **through the Soroban contract** is signed in the popup, and the
screenshots in `screen-shot/` are captured from that real run. The shared extension fixture lives in
`shared/freighter/freighter-fixture.ts`. Extensions only load headed, so run it under `xvfb`:

```bash
PLAYWRIGHT_BASE_URL=https://ipon-dun.vercel.app xvfb-run -a npx playwright test tests/e2e/prod-real.spec.ts
```

Need a wallet? Install [Freighter](https://freighter.app), switch it to testnet, and fund the
address with [Friendbot](https://friendbot.stellar.org).

## Mobile

![Mobile](../screen-shot/09-mobile.jpg)

---

Built for the Stellar APAC hackathon. Testnet only.
