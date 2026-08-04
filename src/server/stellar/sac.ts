import { Asset } from '@stellar/stellar-sdk';
import { env, USDC_ASSET_ISSUER_VALUE } from '@/server/config/env';
import { stellar } from '@/server/config/stellar';
import type { GoalAsset } from '@/server/db/schema/savingsGoals';

/**
 * Resolve the Stellar Asset Contract (SAC) id for a goal's asset.
 *
 * - XLM: the native SAC, fixed per network (configured in env). No trustline.
 * - USDC: deterministically derived from the classic `USDC:<issuer>` asset, so
 *   no extra deploy step is needed for the wrapped token contract.
 */
export function sacFor(asset: GoalAsset): string {
  if (asset === 'XLM') return env.XLM_SAC_CONTRACT_ID;
  return new Asset(env.USDC_ASSET_CODE, USDC_ASSET_ISSUER_VALUE).contractId(stellar.passphrase);
}
