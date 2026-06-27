/**
 * Reference TypeScript client for the GoalVault Soroban contract.
 *
 * Mirrors the app's live wiring (`src/server/stellar/soroban.ts`): the server
 * *builds + simulates* an invoke transaction sourced from the saver and returns
 * the prepared XDR; the browser signs it with Freighter; the server submits the
 * signed XDR via the Soroban RPC. No secret keys ever touch the server.
 *
 *   const client = new GoalVaultClient({
 *     rpcUrl: process.env.SOROBAN_RPC_URL!,
 *     contractId: process.env.GOAL_VAULT_CONTRACT_ID!,
 *     networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE!,
 *   });
 *   const xdr = await client.buildDeposit({ ... });   // → Freighter signs
 *   const res = await client.submit(signedXdr);
 *
 * Depends only on `@stellar/stellar-sdk`.
 */
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

export interface GoalVaultConfig {
  rpcUrl: string;
  contractId: string;
  networkPassphrase: string;
}

export interface DepositArgs {
  /** Saver public key (G...); must sign the returned XDR. */
  saver: string;
  /** Goal UUID (Postgres id) — hashed to the contract's 32-byte key. */
  goalUuid: string;
  /** SAC id (C...) of the deposited asset; XLM SAC by default. */
  token: string;
  /** Target in stroops (minor units, 7 dp). */
  target: bigint | string;
  /** Deposit amount in stroops. */
  amount: bigint | string;
}

/** Stable 32-byte on-chain key for a Postgres goal UUID. */
export function goalIdToBytes32(goalUuid: string): Buffer {
  return createHash('sha256').update(goalUuid).digest();
}

export class GoalVaultClient {
  private readonly server: rpc.Server;
  private readonly contract: Contract;
  private readonly networkPassphrase: string;

  constructor(config: GoalVaultConfig) {
    this.server = new rpc.Server(config.rpcUrl, {
      allowHttp: config.rpcUrl.startsWith('http://'),
    });
    this.contract = new Contract(config.contractId);
    this.networkPassphrase = config.networkPassphrase;
  }

  private async buildInvoke(
    source: string,
    method: string,
    args: xdr.ScVal[],
  ): Promise<string> {
    const account: Account = await this.server.getAccount(source);
    const tx = new TransactionBuilder(account, {
      fee: (Number(BASE_FEE) * 100).toString(),
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...args))
      .setTimeout(300)
      .build();
    const prepared = await this.server.prepareTransaction(tx);
    return prepared.toXDR();
  }

  buildDeposit(args: DepositArgs): Promise<string> {
    const scArgs: xdr.ScVal[] = [
      new Address(args.saver).toScVal(),
      xdr.ScVal.scvBytes(goalIdToBytes32(args.goalUuid)),
      new Address(args.token).toScVal(),
      nativeToScVal(BigInt(args.target), { type: 'i128' }),
      nativeToScVal(BigInt(args.amount), { type: 'i128' }),
    ];
    return this.buildInvoke(args.saver, 'deposit', scArgs);
  }

  buildWithdraw(saver: string, goalUuid: string): Promise<string> {
    const scArgs: xdr.ScVal[] = [
      new Address(saver).toScVal(),
      xdr.ScVal.scvBytes(goalIdToBytes32(goalUuid)),
    ];
    return this.buildInvoke(saver, 'withdraw', scArgs);
  }

  /** Submit a Freighter-signed XDR and poll until applied. */
  async submit(signedXdr: string): Promise<rpc.Api.GetTransactionResponse> {
    const tx = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase);
    const sent = await this.server.sendTransaction(tx);
    if (sent.status === 'ERROR') {
      throw new Error(`Soroban submit failed: ${JSON.stringify(sent.errorResult)}`);
    }
    let got = await this.server.getTransaction(sent.hash);
    while (got.status === 'NOT_FOUND') {
      await new Promise((r) => setTimeout(r, 1500));
      got = await this.server.getTransaction(sent.hash);
    }
    return got;
  }

  /** Read a saver's held balance for a goal (stroops) via simulation. */
  async balance(saver: string, goalUuid: string): Promise<bigint> {
    const account = new Account(Keypair.random().publicKey(), '0');
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        this.contract.call(
          'balance',
          new Address(saver).toScVal(),
          xdr.ScVal.scvBytes(goalIdToBytes32(goalUuid)),
        ),
      )
      .setTimeout(60)
      .build();
    const sim = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) throw new Error(`simulate balance failed: ${sim.error}`);
    const retval = sim.result?.retval;
    return retval ? BigInt(scValToNative(retval) as string | number | bigint) : 0n;
  }
}
