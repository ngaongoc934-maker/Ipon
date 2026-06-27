# GoalVault — Testnet Deployment

| Field | Value |
|-------|-------|
| **Network** | Stellar Testnet |
| **Contract ID** | `CBB735AEGKSN7TLZEUBHD7SDQUHWGCJ5DFK2K2TUKK7MMMHJCHW4KBR6` |
| **Wasm hash** | `40924c79aaa965ec66c6c013f2b509cb665d97f95d50cfdf38254f7d249bffe7` |
| **Admin / deployer** | `GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47` |
| **Default token (XLM SAC)** | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` |
| **RPC** | `https://soroban-testnet.stellar.org` |
| **Init tx** | `12f2a6d8b368b472ca83a4b6fbbfbec3435349bc49280b2e69dc658b0cc2f5e1` |
| **Toolchain** | `cargo +1.89.0`, target `wasm32-unknown-unknown`, Stellar CLI v27 |

Explorer: https://stellar.expert/explorer/testnet/contract/CBB735AEGKSN7TLZEUBHD7SDQUHWGCJ5DFK2K2TUKK7MMMHJCHW4KBR6

## Entrypoints

- `initialize(admin, token)` — one-time; records the deployer as admin and the XLM SAC as the default token.
- `deposit(saver, goal_id, token, target, amount) -> i128` — saver locks funds toward a goal; returns the new balance.
- `withdraw(saver, goal_id) -> i128` — saver pulls the full goal balance back; returns the amount paid out.
- Views: `get_goal`, `balance`, `total_saved`, `is_paused`, `get_token`, `get_admin`.
- Admin: `pause`, `unpause`, `set_admin`, `upgrade`.

`goal_id` is a `BytesN<32>` — the app passes `sha256(<goal UUID>)`, so each Postgres goal maps to a
stable on-chain key namespaced under the saver's address.

## Rebuild / redeploy

```bash
cd contracts
make test          # cargo +1.89.0 test — 13 unit tests
make optimize      # build + stellar contract optimize
./scripts/deploy.sh
```

## Mainnet switch

Set `NETWORK=mainnet`, an `XLM_SAC` for mainnet, fund the deployer, then re-run `./scripts/deploy.sh`.
