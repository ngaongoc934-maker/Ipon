import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  NEXT_PUBLIC_APP_NAME: z.string().default('Ipon'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3003'),

  DRIZZLE_DATABASE_URL: z.string().url(),

  STELLAR_NETWORK: z.enum(['testnet', 'public', 'futurenet']).default('testnet'),
  NEXT_PUBLIC_STELLAR_NETWORK: z.enum(['testnet', 'public', 'futurenet']).default('testnet'),
  STELLAR_HORIZON_URL: z.string().url().default('https://horizon-testnet.stellar.org'),
  STELLAR_NETWORK_PASSPHRASE: z.string().default('Test SDF Network ; September 2015'),
  SOROBAN_RPC_URL: z.string().url().default('https://soroban-testnet.stellar.org'),

  USDC_ASSET_CODE: z.string().default('USDC'),
  USDC_ASSET_ISSUER_TESTNET: z
    .string()
    .default('GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'),

  // GoalVault Soroban contract — custodies savers' funds on-chain.
  GOAL_VAULT_CONTRACT_ID: z
    .string()
    .default('CBB735AEGKSN7TLZEUBHD7SDQUHWGCJ5DFK2K2TUKK7MMMHJCHW4KBR6'),
  // Native XLM Stellar Asset Contract (SAC) — the default token, no trustline.
  XLM_SAC_CONTRACT_ID: z
    .string()
    .default('CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
  SESSION_COOKIE_NAME: z.string().default('ipon_session'),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  NONCE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

const rawEnv = parsed.data;

/** Resolved USDC issuer for the active Stellar network. */
export const USDC_ASSET_ISSUER_VALUE: string = rawEnv.USDC_ASSET_ISSUER_TESTNET;

export const env = rawEnv;
export type Env = typeof env;
