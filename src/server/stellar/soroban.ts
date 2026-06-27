import { createHash } from 'node:crypto';
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  nativeToScVal,
  rpc,
  scValToNative,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';
import { env } from '@/server/config/env';
import { stellar } from '@/server/config/stellar';

/**
 * Server-side client for the GoalVault Soroban contract.
 *
 * Pattern (no secret keys on the server): the server *builds + simulates* an
 * invoke transaction sourced from the saver and returns the prepared XDR; the
 * browser signs it with Freighter; the server submits the signed XDR via the
 * Soroban RPC. Reads (balances) go through simulation — no fee, no signature.
 */

const CONTRACT_ID = env.GOAL_VAULT_CONTRACT_ID;
const PASSPHRASE = env.STELLAR_NETWORK_PASSPHRASE;

function server(): rpc.Server {
  return new rpc.Server(env.SOROBAN_RPC_URL, {
    allowHttp: env.SOROBAN_RPC_URL.startsWith('http://'),
  });
}

function contract(): Contract {
  return new Contract(CONTRACT_ID);
}

/** Stable 32-byte on-chain key for a Postgres goal UUID. */
export function goalIdToBytes32(goalUuid: string): Buffer {
  return createHash('sha256').update(goalUuid).digest();
}

/** Build + simulate + assemble an invoke tx sourced from `source`, returning unsigned XDR. */
async function buildInvoke(
  source: string,
  method: string,
  args: xdr.ScVal[],
): Promise<string> {
  const srv = server();
  const account: Account = await srv.getAccount(source);
  const tx = new TransactionBuilder(account, {
    fee: (Number(BASE_FEE) * 100).toString(),
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(contract().call(method, ...args))
    // Generous bound: the user signs in Freighter between build and submit.
    .setTimeout(300)
    .build();

  // prepareTransaction simulates, then attaches the Soroban footprint,
  // resource fees, and auth entries required to submit.
  const prepared = await srv.prepareTransaction(tx);
  return prepared.toXDR();
}

export interface BuildDepositArgs {
  /** Saver public key (G...); signs the returned XDR. */
  saver: string;
  /** Goal UUID (Postgres id). */
  goalUuid: string;
  /** SAC (C...) of the deposited asset — XLM SAC by default. */
  token: string;
  /** Target in stroops (minor units, 7 dp). */
  target: bigint;
  /** Deposit amount in stroops. */
  amount: bigint;
}

export function buildDeposit(args: BuildDepositArgs): Promise<string> {
  const scArgs: xdr.ScVal[] = [
    new Address(args.saver).toScVal(),
    xdr.ScVal.scvBytes(goalIdToBytes32(args.goalUuid)),
    new Address(args.token).toScVal(),
    nativeToScVal(args.target, { type: 'i128' }),
    nativeToScVal(args.amount, { type: 'i128' }),
  ];
  return buildInvoke(args.saver, 'deposit', scArgs);
}

export function buildWithdraw(saver: string, goalUuid: string): Promise<string> {
  const scArgs: xdr.ScVal[] = [
    new Address(saver).toScVal(),
    xdr.ScVal.scvBytes(goalIdToBytes32(goalUuid)),
  ];
  return buildInvoke(saver, 'withdraw', scArgs);
}

export interface SubmitResult {
  hash: string;
  returnValue: unknown;
}

/** Submit a Freighter-signed invoke XDR and poll until applied. Throws on failure. */
export async function submit(signedXdr: string): Promise<SubmitResult> {
  const srv = server();
  const tx = TransactionBuilder.fromXDR(signedXdr, PASSPHRASE);
  const sent = await srv.sendTransaction(tx);
  if (sent.status === 'ERROR') {
    throw new Error(`Soroban submit failed: ${JSON.stringify(sent.errorResult)}`);
  }

  let got = await srv.getTransaction(sent.hash);
  const deadline = Date.now() + 60_000;
  while (got.status === 'NOT_FOUND' && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    got = await srv.getTransaction(sent.hash);
  }

  if (got.status !== 'SUCCESS') {
    throw new Error(`Transaction ${sent.hash} did not succeed (status: ${got.status})`);
  }

  let returnValue: unknown = null;
  try {
    returnValue = got.returnValue ? scValToNative(got.returnValue) : null;
  } catch {
    /* non-fatal */
  }
  return { hash: sent.hash, returnValue };
}

/** Read a saver's current held balance for a goal (stroops), via simulation. */
export async function readBalance(saver: string, goalUuid: string): Promise<bigint> {
  const srv = server();
  const account = new Account(Keypair.random().publicKey(), '0');
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(
      contract().call(
        'balance',
        new Address(saver).toScVal(),
        xdr.ScVal.scvBytes(goalIdToBytes32(goalUuid)),
      ),
    )
    .setTimeout(60)
    .build();

  const sim = await srv.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`simulate balance failed: ${sim.error}`);
  }
  const retval = sim.result?.retval;
  if (!retval) return 0n;
  return BigInt(scValToNative(retval) as string | number | bigint);
}

/** stellar.expert link to the contract (used in UI/README). */
export function contractExplorerUrl(): string {
  const net = stellar.network === 'public' ? 'public' : 'testnet';
  return `https://stellar.expert/explorer/${net}/contract/${CONTRACT_ID}`;
}
