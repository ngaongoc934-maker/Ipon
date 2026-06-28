ARCHITECTURE

Ipon is a goal-based USDC and XLM savings dApp on Stellar testnet where every deposit and withdrawal is a real Soroban smart contract invocation. The GoalVault contract custodies each saver's funds keyed by wallet plus goal, and only the owner can withdraw. No server-side custody, no simulated balances, no invented yield — what the UI shows is what the ledger holds.


STACK

1. Frontend — Next.js 16 with App Router and Turbopack for the dev server, React 19.2, TypeScript in strict mode, Tailwind CSS v4 plus the @tailwindcss/postcss plugin and tw-animate-css for utilities, custom ube violet plus coin amber on cream theme, Fraunces display font plus Plus Jakarta Sans loaded through next/font/google, sonner toasts for feedback, framer-motion 12 for animations, lucide-react icons, radix-ui primitives for slot composition, shadcn-style ui in src/ui/components/ui. react-hook-form 7 plus @hookform/resolvers 5 plus zod 4 power form validation where used.

2. Backend — Next.js route handlers under app/api, composed through a small middleware chain in src/server/middleware (withError, withAuth, withRateLimit) using the compose helper that reduces right-to-left, validated with Zod 4, returning a uniform envelope of ok plus data or fail plus error plus code. AppError carries a code, message, status, and optional details. All routes export dynamic = 'force-dynamic' so they are never cached.

3. Database — Drizzle ORM 0.45 on node-postgres (pg 8.21), schema in src/server/db/schema, migrations generated through drizzle-kit (drizzle.config.ts points to the schema, output to ./drizzle, dialect postgresql, strict and verbose flags on), hosted on Supabase Postgres. Connection pool is cached on globalThis in development so Next.js hot reload does not exhaust connections.

4. Blockchain — Stellar testnet via Horizon plus the Soroban RPC. Custom Soroban contract written in Rust with soroban-sdk 22 lives in contracts/goal-vault, built and optimized with cargo plus stellar contract optimize, deployed to testnet at a fixed address pinned in env. The contract is the only place that holds user funds — the server never custodies private keys. Testnet toolchain pinned to cargo 1.89.0 via rust-toolchain.toml.

5. Wallet — Freighter via @stellar/freighter-api v6 plus @stellar/stellar-sdk 15. All signing happens client side in Freighter. Network passphrase is pinned to testnet regardless of the wallet's active network, so a mainnet-configured Freighter cannot be tricked into signing a public-network transaction.


DIRECTORY LAYOUT

1. app/ — Next.js App Router pages. page.tsx is the landing page with live stats fetched server side, dashboard/ is the connected goals list, dashboard/create is the goal form, goals/[id] is the per-goal deposit and withdraw view, stats/ is the public stats page, layout.tsx wires the WalletProvider and global CSS plus fonts plus the Toaster. There is no src/app/ in this project — the App Router lives at the repo root under app/.

2. app/api/ — Route handlers. auth/challenge POST mints the SEP-10 nonce tx, auth/verify POST verifies the signed tx and opens a session, auth/logout POST destroys the session, auth/me GET returns the current publicKey, goals GET plus POST lists and creates goals, goals/[id] GET returns one goal with its deposits, goals/[id]/deposit/build POST returns unsigned XDR, goals/[id]/deposit POST submits the signed XDR and credits, goals/[id]/withdraw/build POST returns unsigned withdraw XDR, goals/[id]/withdraw POST submits and closes the goal, stats GET returns global counters, health GET is a liveness ping.

3. src/server/controller/ — Thin HTTP handlers. auth.controller.ts owns challenge, verify, logout, and me. Each handler is wrapped with compose and only contains parse-and-respond glue — the actual logic is in services.

4. src/server/service/ — Business logic and Soroban RPC. auth.service.ts creates nonces, verifies signed manageData txs, opens sessions. savingsGoal.service.ts owns goal CRUD, builds and submits deposit and withdraw invokes, credits the goal from the authoritative on-chain balance returned by the contract. stats.service.ts aggregates global counters for the landing page.

5. src/server/stellar/ — Stellar SDK helpers. network.ts maps network to passphrase plus Horizon URL plus usdcAsset helper, sac.ts resolves the Stellar Asset Contract id for XLM (native SAC) and USDC (derived from classic asset plus passphrase), soroban.ts builds and simulates invoke txs through prepareTransaction, submits signed XDR through Soroban RPC, polls getTransaction until applied, reads balances via simulateTransaction, hashes goal UUIDs to 32-byte keys.

6. src/server/db/ — Drizzle wiring. client.ts owns the pg Pool and drizzle instance, schema/ holds the table definitions (authNonces, sessions, savingsGoals, deposits), index.ts re-exports.

7. src/server/middleware/ — compose.ts is the higher-order middleware helper that reduces right-to-left, withError.ts maps AppError and ZodError to envelope, withAuth.ts checks the session cookie against the sessions table, withRateLimit.ts does a per-IP token bucket.

8. src/server/lib/ — Shared helpers. http.ts owns AppError plus the ok, created, fail, fromError envelope helpers, cookies.ts reads and writes the session cookie, amount.ts parses and renders stroops and computes progress percent, bigint.ts handles minor-unit strings as bigints for cross-asset arithmetic, logger.ts is a structured JSON logger with info, warn, error, debug plus a pubkey truncator.

9. src/server/config/ — env.ts validates process.env with Zod at startup and throws on missing required vars, env.public.ts mirrors NEXT_PUBLIC_* values for the browser bundle (with safe defaults), stellar.ts builds the Horizon server and passphrase map.

10. src/ui/ — Client UI. wallet/WalletProvider.tsx is the React context that restores session on mount, drives connect plus disconnect, exposes status plus publicKey. wallet/stellarClient.ts wraps Freighter — requestPublicKey, sign, enableUsdc (changeTrust), depositToGoal, withdrawGoal — and calls the JSON APIs. components/ holds ConnectButton, Header, Logo, ui primitives like ProgressRing and AssetBadge and StatusChip and Footer. lib/format.ts has amount formatters, shortKey, and explorer URL helpers (explorerTx, explorerContract).

11. contracts/ — Soroban smart contracts. goal-vault/src/lib.rs is the contract, types.rs holds Goal and GoalStatus, storage.rs owns DataKey plus TTL helpers, error.rs has Error, test.rs holds 13 unit tests. ts-client/goal-vault-client.ts is a reference TypeScript binding. scripts/deploy.sh deploys to testnet. Cargo.lock pins the toolchain to 1.89.0 via rust-toolchain.toml. Makefile exposes make test, make optimize, make deploy targets.

12. tests/ — Vitest unit tests under tests/unit/lib (amount, bigint, http, logger), Playwright e2e under tests/e2e (demo-video.spec.ts and prod-real.spec.ts which drives the real Freighter extension against the live deployment). tests/setup.ts wires Vitest globals including jest-dom matchers and a MediaQueryList shim.


DATA MODEL

1. auth_nonces — nonce text primary key, public_key text not null, expires_at timestamptz not null, consumed_at timestamptz nullable. Each row is a single SEP-10 challenge. The tuple (public_key, nonce, consumed_at IS NULL, expires_at > now) must match exactly once at verify time, then consumed_at is stamped. After consumption the same nonce cannot be replayed.

2. sessions — id uuid primary key default random, public_key text not null, created_at timestamptz default now not null, expires_at timestamptz not null. Each row is one signed-in wallet. The session id is the cookie value, looked up on every authenticated request by withAuth. There is no per-user agent fingerprint or device binding beyond the cookie value itself.

3. savings_goals — id uuid primary key default random, public_key text not null, name text not null trimmed 1 to 40 chars, emoji text not null default coin emoji, asset enum XLM or USDC default XLM, target_amount text not null stored as decimal whole-asset string with 7 dp, current_amount text not null default zero, status enum active or completed or withdrawn default active, withdrawal_tx_hash text nullable the real Horizon or Soroban tx hash for the payout, network text not null default testnet, created_at and updated_at timestamptz default now. Indexed on public_key and status. Composite lookup (public_key + id) is enforced in service code not via DB unique constraint.

4. deposits — id uuid primary key default random, goal_id uuid not null references savings_goals(id) on delete cascade, from_address text not null the saver G-address, tx_hash text not null unique real Horizon or Soroban tx hash, asset enum XLM or USDC default XLM, amount text not null decimal string, created_at timestamptz default now. Indexed on goal_id. The unique constraint on tx_hash prevents double-recording the same on-chain deposit even if the client retries the confirm endpoint.

5. Amounts as text — every monetary amount is stored as a decimal whole-asset string with up to 7 decimal places (Stellar stroops) so they survive JSON serialization without BigInt loss. Arithmetic is done in bigint and re-serialized to string before persistence. progress percent = current_amount divided by target_amount times 100, clamped to 0-100, computed in bigint then divided by 10000 for two-decimal precision.

6. Goal key derivation — the on-chain key for a goal is sha256(<postgres goal uuid>) as BytesN<32> under DataKey::Goal(saver_address, goal_id_bytes). The Postgres uuid therefore maps 1:1 to a stable on-chain key namespaced under the saver's address, so two savers cannot collide on the same goal_id, and a single saver creating two goals with different UUIDs gets two distinct on-chain buckets.

7. Goal status lifecycle — Saving (active) when balance < target, Reached (completed in Postgres) when balance >= target, Withdrawn once the saver pulls the balance back out. Reaching target is purely informational — withdraw is allowed in either active or completed state. Withdrawn is terminal.

8. Goal asset binding — when a goal is created on first deposit, the on-chain token address is recorded in the Goal struct. Subsequent deposits must use the same token. Mismatched token returns WrongToken from the contract.


STELLAR INTEGRATION

1. SEP-10 style wallet auth — server mints a manageData(auth_nonce, nonce) tx, persists nonce plus publicKey plus expiresAt, returns the XDR. Browser signs it in Freighter, server verifies the signature against the tx hash plus the tx's manageData operation, marks the nonce consumed, opens a session row, and writes an HttpOnly SameSite=Lax session cookie. Signing is pinned to the app's network passphrase so a mainnet-configured Freighter cannot be coerced into signing a public-network auth tx.

2. Soroban invoke host function — deposit and withdraw are real invoke_host_function calls against the GoalVault contract. Server builds and simulates the invoke through Soroban RPC's prepareTransaction (which attaches footprint plus resource fee plus auth entries), Freighter signs, server submits through Soroban RPC and polls getTransaction until the result is SUCCESS. Build timeout is 300 seconds (long enough for the user to switch to Freighter and back), submit poll deadline is 60 seconds.

3. Native SAC plus classic asset SAC — XLM uses the native Stellar Asset Contract address pinned in env (no trustline required). USDC uses the deterministically derived SAC of USDC:<issuer> for the active network via Asset(...).contractId(passphrase). The contract pulls funds using token::Client::new(&env, &token).transfer which is the canonical SAC entry point and lives at the asset's contract address on Soroban.

4. changeTrust helper — Enable USDC button builds a changeTrust(USDC:<issuer>) tx client side, Freighter signs, Horizon submits. One tap per wallet, idempotent at the protocol level. Without it, USDC deposits would fail with op_no_trust; the stellarClient maps that specific result code to a friendly toast pointing at the Enable USDC button.

5. Authoritative on-chain balance — every deposit confirmation reads the new balance from the contract's return value (the deposit entry point returns i128 new balance). If the return value is missing for any reason the server falls back to a simulated balance read against the contract. The Postgres current_amount is updated to match — never the other way around. The delta between the previous stored balance and the on-chain balance is what gets recorded in the deposits table so the deposit history is exactly the chain of value additions.

6. Contract entry points on the GoalVault contract (Soroban, address CBB735AEGKSN7TLZEUBHD7SDQUHWGCJ5DFK2K2TUKK7MMMHJCHW4KBR6, deployed on Stellar testnet with init tx 12f2a6d8b368b472ca83a4b6fbbfbec3435349bc49280b2e69dc658b0cc2f5e1, wasm hash 40924c79aaa965ec66c6c013f2b509cb665d97f95d50cfdf38254f7d249bffe7, admin GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47, default token CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) — initialize(admin, token) one-time setup by deployer, deposit(saver, goal_id, token, target, amount) returns i128 new balance, saver-authorized, withdraw(saver, goal_id) returns i128 payout, saver-authorized, balance(saver, goal_id) view, get_goal view, total_saved view, is_paused view, get_token view, get_admin view, pause plus unpause plus set_admin plus upgrade admin-only ops. Saver auth on deposit and withdraw is enforced by the contract via require_auth — the same authorization covers the inner SAC transfer.

7. Contract error codes — AlreadyInitialized, NotInitialized, Paused, InvalidAmount, InvalidTarget, GoalNotFound, GoalClosed, NothingToWithdraw, WrongToken. Codes are explicit contiguous u32 so the TS client can map them to user-facing messages without guessing. The server-side service also maps known Postgres state to AppError codes (CONFLICT for already-withdrawn, NOT_FOUND for missing goal, ALREADY_EXISTS for replayed tx hash).

8. Contract storage — Admin, Token, Paused, TotalSaved live in instance storage with a 30-day TTL bumped on every state change. Goals live in persistent storage under DataKey::Goal(saver, goal_id) with a 90-day TTL bumped on every save. Soroban ledgers close roughly every 5 seconds so 17280 ledgers per day. The funds can never expire out from under a saver before withdrawal.

9. Contract upgrade path — upgrade(new_wasm_hash) is admin-only and uses deployer().update_current_contract_wasm. Lets the deployer ship fixes without migrating saver balances. No timelock or DAO gate — centralization trade-off in exchange for hot-fixability.

10. Events — contract emits init, deposit, withdraw, pause events for indexers. The current app does not consume these — it relies on the synchronous return value plus the submit polling loop. A future indexer could subscribe to these for off-chain analytics.


KEY FLOWS

1. Connect wallet — Client calls requestAccess in Freighter to get the publicKey, posts publicKey to /api/auth/challenge, server validates the key is a valid Ed25519 StrKey, mints a 24-byte base64url nonce, builds a manageData(auth_nonce, nonce) tx via TransactionBuilder against a zero-sequence Account with the pinned testnet passphrase, persists the nonce with a 300-second TTL, returns the tx XDR plus nonce plus expiresAt. Client signs the XDR with Freighter pinned to the testnet passphrase, posts signedXdr plus publicKey to /api/auth/verify, server deserializes the tx, verifies the tx hash signature matches the publicKey, finds the matching unused unexpired nonce, marks it consumed, inserts a sessions row with a 7-day TTL, sets the ipon_session HttpOnly SameSite=Lax cookie. On reload the WalletProvider calls /api/auth/me, which reads the cookie, looks up the sessions row, checks expires_at > now, and returns publicKey.

2. Create goal — Authenticated user opens /dashboard/create, submits name (trimmed 1-40 chars), emoji, asset (XLM or USDC), targetAmount (positive number). POST /api/goals validates with Zod, savingsGoalService.create parses the target into stroops via toStroops, rejects non-positive, inserts a savings_goals row bound to the session publicKey with status active and currentAmount zero, returns the goal. Client redirects to /goals/<id>. The on-chain goal does not exist yet — it is created lazily on the first deposit.

3. Deposit — Authenticated owner enters an amount on /goals/[id], client POSTs to /api/goals/[id]/deposit/build with amount, savingsGoalService.buildDepositTx verifies the goal is owned and not withdrawn via getOwned (composite where), parses amount into stroops, resolves the SAC id via sacFor(asset), and calls buildDeposit in src/server/stellar/soroban.ts which assembles ScVal args (saver Address, sha256(goal_id) BytesN<32>, token Address, target i128, amount i128), builds a TransactionBuilder sourced from the saver with fee BASE_FEE*100 and 300-second timeout, runs prepareTransaction against the Soroban RPC to simulate and attach the footprint plus resource fee plus auth entries, returns unsigned XDR. Client signs the XDR in Freighter, POSTs to /api/goals/[id]/deposit with signedXdr, server submits via Soroban RPC, polls getTransaction until SUCCESS, extracts the new on-chain balance from returnValue (or falls back to a simulated balance read), inserts a deposits row with the real tx hash and the delta, updates currentAmount on the goal, and flips status to completed when the on-chain balance reaches the target.

4. Withdraw — Authenticated owner taps withdraw on /goals/[id], client POSTs to /api/goals/[id]/withdraw/build, server verifies ownership plus non-zero currentAmount, calls buildWithdraw(saver, goal_id) in soroban.ts (same build pipeline with just the two-arg contract call), returns unsigned XDR. Client signs, POSTs to /api/goals/[id]/withdraw with signedXdr, server submits and polls until SUCCESS, marks the goal status withdrawn, zeroes currentAmount, and stores the withdrawal tx hash on the goal so the UI can show a payout link. The contract pays out from its own balance and the goal becomes terminal.

5. Enable USDC — Owner of a USDC goal taps Enable USDC, stellarClient.enableUsdc builds a TransactionBuilder from the wallet's Horizon account with changeTrust(USDC:<issuer>), signs in Freighter, submits via Horizon. One tap per wallet; idempotent.

6. Stats — /api/stats calls statsService.global which runs three Postgres aggregates over sessions (count distinct publicKey plus count all), savings_goals (total plus active plus completed, excluding infra keys), and deposits (count all). The /stats and / pages render the same numbers as cards. Vault contract addresses are excluded from saver counts to keep the public-facing stats honest.

7. Goal detail load — Public endpoint. Anyone can fetch /api/goals/[id] to view a goal's progress and deposit history. The UI hides the deposit and withdraw controls for non-owners but does not block the read.

8. Dashboard load — Authenticated fetch of /api/goals returns the user's goals plus a summary (totalGoals, activeGoals, completedGoals, savedXlm in stroops, savedUsdc in stroops). Drives the dashboard cards.

9. Form submission and redirect — Create goal posts JSON to /api/goals, receives the goal, navigates to /goals/<id> via Next router push, which triggers the goal detail flow.

10. Toast feedback — every action in the UI shows a sonner toast: connecting, deposit signing, deposit success, deposit failure (with error code mapped to message), withdraw signing, withdraw success, USDC trustline approval, USDC failure, connection failure.


ENVIRONMENT VARIABLES

1. NODE_ENV — development or test or production.

2. NEXT_PUBLIC_APP_NAME — Ipon.

3. NEXT_PUBLIC_APP_URL — full https URL of the deployed app.

4. DRIZZLE_DATABASE_URL — Postgres connection string. Secret. Server-only.

5. STELLAR_NETWORK — testnet or public or futurenet.

6. NEXT_PUBLIC_STELLAR_NETWORK — same value, used by the browser to pin Freighter's passphrase.

7. STELLAR_HORIZON_URL — Horizon base URL.

8. NEXT_PUBLIC_STELLAR_HORIZON_URL — same, browser-safe.

9. STELLAR_NETWORK_PASSPHRASE — full network passphrase string.

10. SOROBAN_RPC_URL — Soroban RPC base URL.

11. USDC_ASSET_CODE — USDC.

12. USDC_ASSET_ISSUER_TESTNET — USDC issuer public key on testnet.

13. NEXT_PUBLIC_USDC_CODE and NEXT_PUBLIC_USDC_ISSUER — same USDC values, browser-safe.

14. GOAL_VAULT_CONTRACT_ID — GoalVault Soroban contract id.

15. NEXT_PUBLIC_GOAL_VAULT_CONTRACT_ID — same, browser-safe.

16. XLM_SAC_CONTRACT_ID — native XLM Stellar Asset Contract id.

17. SESSION_SECRET — at least 32 characters. Required by env schema but not currently used by the cookie layer (the cookie holds the opaque session id and is server-validated against the sessions table). The secret slot is reserved for a future signed-cookie upgrade. Secret.

18. SESSION_COOKIE_NAME — defaults to ipon_session.

19. SESSION_TTL_SECONDS — defaults to 604800 (7 days).

20. NONCE_TTL_SECONDS — defaults to 300 (5 minutes).

No actual keys are committed; secrets live in .env.local which is gitignored. Testnet seed phrases for funded demo wallets in docs/SUBMISSION.txt are acceptable per project policy.


DEPLOY

1. Vercel project — ipon-dun, scope personal account, Vercel manages pnpm install plus next build automatically on push, port 3003 only used for local dev. next.config.ts pins serverExternalPackages to pg so the native bindings stay outside the bundle.

2. Supabase Postgres — managed Postgres instance reached via DRIZZLE_DATABASE_URL, schema applied with pnpm run db:push (drizzle-kit push force). The pool is capped at 10 connections.

3. Key URLs — production app https://ipon-dun.vercel.app, public stats https://ipon-dun.vercel.app/stats, contract explorer https://stellar.expert/explorer/testnet/contract/CBB735AEGKSN7TLZEUBHD7SDQUHWGCJ5DFK2K2TUKK7MMMHJCHW4KBR6.

4. Soroban RPC — https://soroban-testnet.stellar.org.

5. Horizon testnet — https://horizon-testnet.stellar.org.

6. Friendbot — https://friendbot.stellar.org for funding fresh testnet wallets.

7. Build steps — pnpm install (uses pnpm, not npm), pnpm run db:push to apply the schema, pnpm dev to run locally, pnpm test for vitest, pnpm test:e2e for Playwright, pnpm run build for production bundle. Contracts built separately with cd contracts and make test plus make optimize and ./scripts/deploy.sh.

8. Local port — port 3003 hard-coded in the dev script. Agent slot c per the workspace AGENT_ID table. DATABASE_URL points at the agent_c Postgres database for isolation.

9. Tooling — biome for lint and format, vitest for unit, playwright for e2e, drizzle-kit for schema, dotenv-cli for loading .env.local into the drizzle-kit commands.


API ENDPOINTS REFERENCE

1. POST /api/auth/challenge — body { publicKey: G...56 chars }. Returns { ok, data: { nonce, txXdr, expiresAt } }. Rate-limited per IP. Public.

2. POST /api/auth/verify — body { publicKey, signedNonce: signed XDR }. Sets ipon_session cookie. Returns { ok, data: { ok: true } }. Rate-limited per IP. Public.

3. POST /api/auth/logout — no body. Clears cookie and deletes the session row. Public.

4. GET /api/auth/me — no body. Returns { ok, data: { publicKey } } if cookie valid, else 401. Authenticated.

5. GET /api/goals — returns { ok, data: { goals, summary } }. summary has totalGoals, activeGoals, completedGoals, savedXlm, savedUsdc. Authenticated.

6. POST /api/goals — body { name, emoji, asset, targetAmount }. Returns { ok, data: goal } with 201. Authenticated.

7. GET /api/goals/[id] — returns { ok, data: { ...goal, deposits } }. Public — anyone can view a goal's progress and history.

8. POST /api/goals/[id]/deposit/build — body { amount }. Returns { ok, data: { xdr, amount, asset } }. Authenticated and owner-only.

9. POST /api/goals/[id]/deposit — body { signedXdr }. Submits, polls, credits the goal from the authoritative on-chain balance, inserts the deposit row, updates currentAmount, flips status if target reached. Returns { ok, data: { deposit, goal, completed, txHash } } with 201. Authenticated and owner-only.

10. POST /api/goals/[id]/withdraw/build — no body. Returns { ok, data: { xdr } }. Authenticated and owner-only.

11. POST /api/goals/[id]/withdraw — body { signedXdr }. Submits, polls, closes the goal, stores the withdrawal tx hash. Returns { ok, data: { txHash, amount, asset, goal } }. Authenticated and owner-only.

12. GET /api/stats — returns { ok, data: { uniqueWallets, logins, totalGoals, activeGoals, completedGoals, totalDeposits } }. Public, server-side.

13. GET /api/health — returns { ok, data: { ok: true, ts } }. Public liveness check.


REQUEST RESPONSE ENVELOPE

1. Success — { ok: true, data: T }. 200 for GETs and most POSTs, 201 for resource creation.

2. Failure — { ok: false, error: { code, message, details? } }. Status codes mirror the error code: 400 INVALID_INPUT, 401 UNAUTHORIZED, 403 FORBIDDEN, 404 NOT_FOUND, 409 CONFLICT or ALREADY_EXISTS, 429 RATE_LIMITED, 500 INTERNAL.

3. Zod validation errors — first issue message becomes the error message, full issues array lands in details.path and details.issues for clients that want to render field-level errors.

4. AppError — thrown anywhere in service or controller, caught by withError middleware, mapped to fail() with the code, message, status, and details preserved.


TESTING

1. Unit tests — Vitest in tests/unit/lib. amount.test.ts covers toStroops, fromStroops, progressPercent including decimal boundaries and negative values. bigint.test.ts covers minorFromString, addMinor, subtractMinor, compareMinor, formatMinor, and the type guards. http.test.ts covers AppError, ok, created, fail, fromError with Zod and unknown errors. logger.test.ts verifies the JSON shape and level filtering. tests/setup.ts wires @testing-library/jest-dom matchers and the MediaQueryList shim per the project CLAUDE.md.

2. E2E tests — Playwright in tests/e2e. demo-video.spec.ts walks the happy path against the running app. prod-real.spec.ts drives the real Freighter extension against the live production deployment with a real Approve click, real SEP-10 challenge sign, and real on-chain Soroban deposit. Shared Freighter fixture lives outside the project at shared/freighter/freighter-fixture.ts.

3. Contract tests — Cargo test inside contracts/goal-vault. 13 unit tests cover deposit on a fresh goal, accumulation on subsequent deposits, target-reached state, self-custody withdraw, per-saver isolation (one saver's deposit cannot affect another's balance), pause blocking new deposits while still allowing withdraw, wrong-token rejection, zero-amount rejection, and goal-not-found paths. Test snapshots are committed under contracts/goal-vault/test_snapshots/.

4. Lint and format — biome check plus biome format. pnpm run lint and pnpm run lint:fix.

5. Build verification — pnpm run build is the source of truth for production readiness. LSP errors before npm install are noise per project policy; only pnpm test and pnpm run build are load-bearing.


ASCII SYSTEM DIAGRAM

1. User opens https://ipon-dun.vercel.app in browser.

2. Browser loads Next.js client bundle + WalletProvider.

3. WalletProvider calls GET /api/auth/me to restore session.

4. If disconnected, user clicks Connect wallet. Browser calls Freighter requestAccess() to get publicKey G1.

5. Browser POST /api/auth/challenge { publicKey: G1 } to Next.js server.

6. Next.js server generates nonce N, inserts auth_nonces row, builds manageData(auth_nonce, N) XDR with testnet passphrase, returns XDR + N.

7. Browser hands XDR to Freighter signTransaction with testnet passphrase pinned.

8. Freighter pops up, user clicks Approve, returns signedXdr.

9. Browser POST /api/auth/verify { publicKey: G1, signedXdr }.

10. Next.js server parses signed tx, verifies signature against G1, finds matching unused unexpired nonce, marks consumed, inserts sessions row, sets ipon_session cookie.

11. Browser now authenticated. Loads /dashboard, fetches GET /api/goals, gets goals + summary.

12. User creates a goal: POST /api/goals { name, emoji, asset, targetAmount }. Server inserts savings_goals row bound to G1.

13. User goes to /goals/[id], enters amount, taps Deposit.

14. Browser POST /api/goals/[id]/deposit/build { amount }. Server fetches goal, computes ScVal args, calls Soroban RPC prepareTransaction, returns unsigned XDR.

15. Browser signs XDR in Freighter.

16. Browser POST /api/goals/[id]/deposit { signedXdr }. Server calls Soroban RPC sendTransaction, polls getTransaction until SUCCESS, reads returnValue (new on-chain balance), inserts deposits row with real tx hash, updates savings_goals.currentAmount, flips status if target reached.

17. Browser refetches the goal to render the updated ring.

18. Withdraw follows the same build-sign-submit pattern against the withdraw entry point.


DEPLOYMENT NOTES

1. Vercel auto-detects Next.js. pnpm install runs on every push, next build compiles the app, and the route handlers run as serverless functions. next.config.ts marks pg as external so the native binding is loaded at runtime.

2. drizzle.config.ts points to ./src/server/db/schema/index.ts with output to ./drizzle/. Drizzle-kit generate produces SQL migrations; db:push syncs directly to Postgres without migration files for hackathon velocity.

3. Contract deploy is a separate step in contracts/. cd contracts && make test && make optimize && ./scripts/deploy.sh. The deploy script pins NETWORK=testnet and uses the testnet RPC. The contract id is then hard-coded into env vars.

4. The Vercel build does not build the contract — only the Next.js app. The contract must be deployed first, then the contract id put into env, then the app redeployed.

5. Local development against the production deployment is supported via pnpm dev with NEXT_PUBLIC_* pointing at the same contract id. The e2e suite uses PLAYWRIGHT_BASE_URL to drive the live deployment with xvfb-run -a for the headed Freighter extension.

6. The 13 contract tests live in contracts/goal-vault/src/test.rs and run via cargo test against soroban-sdk with the testutils feature.


LIMITATIONS AND KNOWN GAPS

1. Testnet only — every contract id, RPC URL, Horizon URL, USDC issuer, and asset SAC is pinned to testnet. Switching to public requires a re-deploy of the contract and updates to env (not just NEXT_PUBLIC values).

2. SESSION_SECRET is required by the env schema but not actually used by the cookie layer — the session cookie holds the opaque session UUID and is server-validated against the sessions table. The secret slot is reserved for a future signed-cookie upgrade.

3. Single asset per goal — a goal is XLM or USDC for its lifetime. Changing asset on an existing goal is not supported.

4. Withdraw is all-or-nothing per goal — there is no partial withdrawal. The contract returns the full held balance and closes the goal; the UI exposes one button.

5. Yield is intentionally absent — the README is explicit that there is no invented yield and no fiat oracle. The contract is custody only.

6. Sessions are DB-backed and revocable by deleting the row, but there is no user-facing device manager. The cookie persists for 7 days. There is no refresh-token or sliding-session logic.

7. Stats counts include every historical row including withdrawn goals and goals of users who later disconnected; there is no soft-delete. The exclude list only filters out the vault contract address.

8. The e2e suite against the real Freighter extension requires a headed Chromium under xvfb — there is no programmatic sign stub for production runs. Run with PLAYWRIGHT_BASE_URL=https://ipon-dun.vercel.app xvfb-run -a npx playwright test tests/e2e/prod-real.spec.ts.

9. No background poll for goal state after a deposit — the UI refetches on the action that triggered it. If a third party deposits on your behalf through a custom integration, the dashboard will not update until reload.

10. Rate limit is an in-process token bucket (capacity 10, refill 1 per second) keyed by x-forwarded-for. On Vercel serverless each instance has its own bucket — adequate for abuse mitigation, not a global limit.

11. No background indexer or webhooks — the deposit table is populated only when the saver themselves confirms through the UI.

12. USDC requires a one-time changeTrust per wallet (the Enable USDC button); without it, deposits will fail with op_no_trust. The error is mapped to a friendly toast on the client.

13. The contract is upgradeable by the deployer (admin) only — there is no timelock or DAO. Centralization trade-off in exchange for hot-fixability.

14. Goal amount precision is 7 decimals (Stellar stroops) — the UI shows the asset in its native unit (XLM or USDC) without any fiat conversion, so amounts are exact and never silently rounded.

15. There is no recurring-deposit schedule and no push notification when a goal reaches its target; the saver must open the app to see the completed banner.

16. The contract admin address is a single Stellar key held by the deployer; loss of that key would mean no further upgrades or pause toggles. Pause is intentionally reversible so an emergency stop can be lifted without an upgrade.

17. The build and sign flow requires Freighter to be installed and the wallet funded via Friendbot; users without testnet XLM cannot sign anything and the UI surfaces a friendly toast.

18. There is no PWA, no offline mode, and no mobile-native build; the responsive web app is the only client.

19. Internationalization is English-only — the layout, copy, and formatters do not switch locales. Currency formatting falls back to en-US.

20. There is no audit trail beyond the on-chain deposit and withdraw txs themselves; admin pause or upgrade actions are visible only via Stellar Explorer event lookups.