'use client';

import {
  Asset,
  BASE_FEE,
  Horizon,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import {
  isConnected,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api';
import { publicEnv } from '@/server/config/env.public';

const PASSPHRASE = publicEnv.networkPassphrase; // PINNED to the app network, not the wallet's.

function server() {
  return new Horizon.Server(publicEnv.horizonUrl);
}

export class WalletError extends Error {}

export async function ensureFreighter(): Promise<void> {
  const res = await isConnected();
  if (!res.isConnected) {
    throw new WalletError(
      'Freighter wallet not detected. Install the Freighter extension to connect.',
    );
  }
}

export async function requestPublicKey(): Promise<string> {
  const res = await requestAccess();
  if (res.error || !res.address) {
    throw new WalletError(res.error?.message ?? 'Wallet connection was rejected.');
  }
  return res.address;
}

/** Sign an XDR with Freighter, pinning the network passphrase to the app's network. */
export async function sign(xdr: string, address: string): Promise<string> {
  const res = await signTransaction(xdr, { networkPassphrase: PASSPHRASE, address });
  if (res.error || !res.signedTxXdr) {
    throw new WalletError(res.error?.message ?? 'Signing was rejected in the wallet.');
  }
  return res.signedTxXdr;
}

async function loadAccount(pubkey: string) {
  try {
    return await server().loadAccount(pubkey);
  } catch {
    throw new WalletError(
      'Your wallet account is not funded on testnet yet. Fund it with the Friendbot first.',
    );
  }
}

async function submit(signedXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXdr, PASSPHRASE);
  try {
    const res = await server().submitTransaction(tx);
    return res.hash;
  } catch (e: unknown) {
    const codes = (e as { response?: { data?: { extras?: { result_codes?: { operations?: string[] } } } } })
      ?.response?.data?.extras?.result_codes;
    const op = codes?.operations?.[0];
    if (op === 'op_no_trust') {
      throw new WalletError('No USDC trustline. Tap "Enable USDC" first, then deposit.');
    }
    if (op === 'op_underfunded') {
      throw new WalletError('Insufficient balance for that amount (remember the network fee).');
    }
    throw new WalletError('Stellar rejected the transaction. Check your balance and try again.');
  }
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; error?: { message?: string } };

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const json = (await res.json().catch(() => ({ ok: false }))) as ApiResult<T>;
  if (!json.ok) {
    throw new WalletError(json.error?.message ?? `Request failed (${res.status})`);
  }
  return json.data;
}

/**
 * Deposit into a goal through the GoalVault Soroban contract:
 * server builds the invoke → Freighter signs → server submits via Soroban RPC.
 * Returns the on-chain tx hash and the updated goal payload.
 */
export async function depositToGoal(
  goalId: string,
  amount: string,
  publicKey: string,
): Promise<{ txHash: string; completed: boolean }> {
  const { xdr } = await apiPost<{ xdr: string }>(`/api/goals/${goalId}/deposit/build`, { amount });
  const signed = await sign(xdr, publicKey);
  const res = await apiPost<{ txHash: string; completed: boolean }>(
    `/api/goals/${goalId}/deposit`,
    { signedXdr: signed },
  );
  return res;
}

/** Withdraw a goal's full balance through the contract (build → sign → submit). */
export async function withdrawGoal(
  goalId: string,
  publicKey: string,
): Promise<{ txHash: string }> {
  const { xdr } = await apiPost<{ xdr: string }>(`/api/goals/${goalId}/withdraw/build`);
  const signed = await sign(xdr, publicKey);
  return apiPost<{ txHash: string }>(`/api/goals/${goalId}/withdraw`, { signedXdr: signed });
}

/** Build → sign → submit a changeTrust so the wallet can hold USDC. */
export async function enableUsdc(from: string): Promise<string> {
  const account = await loadAccount(from);
  const tx = new TransactionBuilder(account, {
    fee: (Number(BASE_FEE) * 10).toString(),
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(
      Operation.changeTrust({ asset: new Asset(publicEnv.usdcCode, publicEnv.usdcIssuer) }),
    )
    .setTimeout(120)
    .build();
  const signed = await sign(tx.toXDR(), from);
  return submit(signed);
}
