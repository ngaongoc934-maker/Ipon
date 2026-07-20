#!/usr/bin/env bash
#
# Deploy the GoalVault contract to Stellar Testnet (or Mainnet) with the Stellar CLI.
#
# Prereqs:
#   - Rust 1.89 + wasm32-unknown-unknown target  (rustup target add wasm32-unknown-unknown)
#   - Stellar CLI v23+                            (cargo install --locked stellar-cli)
#
# Usage:
#   ./scripts/deploy.sh                          # testnet, identity "ipon-deployer"
#   NETWORK=mainnet IDENTITY=prod ./scripts/deploy.sh
#
set -euo pipefail

NETWORK="${NETWORK:-testnet}"
IDENTITY="${IDENTITY:-ipon-deployer}"
RPC_URL="${RPC_URL:-https://soroban-${NETWORK}.stellar.org}"
PASSPHRASE="${PASSPHRASE:-Test SDF Network ; September 2015}"
WASM="target/wasm32-unknown-unknown/release/goal_vault.optimized.wasm"

# Native XLM Stellar Asset Contract (SAC) on testnet — no trustline required.
XLM_SAC="${XLM_SAC:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"

cd "$(dirname "$0")/.."

echo "* Network: $NETWORK   Identity: $IDENTITY"
ADMIN_ADDR="$(stellar keys address "$IDENTITY")"
echo "* Admin / deployer: $ADMIN_ADDR"

# 1. Build the optimized Wasm with the pinned toolchain.
echo "* Building contract (cargo +1.89.0, wasm32-unknown-unknown)..."
cargo +1.89.0 build --release --target wasm32-unknown-unknown
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/goal_vault.wasm

# 2. Deploy -> contract id. (Public testnet RPC is load-balanced; retry on lag.)
echo "* Deploying..."
CONTRACT_ID=""
for _ in 1 2 3 4 5; do
  CONTRACT_ID=$(stellar contract deploy --wasm "$WASM" --source "$IDENTITY" \
    --network "$NETWORK" --rpc-url "$RPC_URL" --network-passphrase "$PASSPHRASE" 2>/dev/null || true)
  [ -n "$CONTRACT_ID" ] && break
  sleep 8
done
echo "* Contract id: $CONTRACT_ID"

# 3. Initialize with admin + the XLM SAC as the default token.
echo "* Initializing..."
for _ in 1 2 3 4 5; do
  if stellar contract invoke --id "$CONTRACT_ID" --source "$IDENTITY" \
       --network "$NETWORK" --rpc-url "$RPC_URL" --network-passphrase "$PASSPHRASE" \
       -- initialize --admin "$ADMIN_ADDR" --token "$XLM_SAC"; then
    break
  fi
  sleep 10
done

echo ""
echo "Done. Add these to your app env (.env.local / Vercel):"
echo "   SOROBAN_RPC_URL=$RPC_URL"
echo "   GOAL_VAULT_CONTRACT_ID=$CONTRACT_ID"
echo "   NEXT_PUBLIC_GOAL_VAULT_CONTRACT_ID=$CONTRACT_ID"
echo "   XLM_SAC_CONTRACT_ID=$XLM_SAC"
