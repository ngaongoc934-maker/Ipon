import { and, desc, eq } from 'drizzle-orm';
import { env } from '@/server/config/env';
import { db } from '@/server/db/client';
import { deposits, savingsGoals } from '@/server/db/schema';
import type { GoalAsset, GoalStatus, SavingsGoal } from '@/server/db/schema/savingsGoals';
import { fromStroops, toStroops } from '@/server/lib/amount';
import { AppError } from '@/server/lib/http';
import { sacFor } from '@/server/stellar/sac';
import {
  buildDeposit,
  buildWithdraw,
  readBalance,
  submit,
} from '@/server/stellar/soroban';

export const savingsGoalService = {
  async create(
    publicKey: string,
    data: { name: string; emoji: string; asset: GoalAsset; targetAmount: string },
  ) {
    const target = toStroops(data.targetAmount);
    if (target <= 0n) throw new AppError('INVALID_INPUT', 'Target amount must be positive', 400);
    const [goal] = await db
      .insert(savingsGoals)
      .values({
        publicKey,
        name: data.name.trim(),
        emoji: data.emoji,
        asset: data.asset,
        targetAmount: fromStroops(target),
        network: env.STELLAR_NETWORK,
      })
      .returning();
    return goal;
  },

  async getByPublicKey(publicKey: string) {
    return db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.publicKey, publicKey))
      .orderBy(desc(savingsGoals.createdAt));
  },

  async getById(id: string) {
    const [goal] = await db.select().from(savingsGoals).where(eq(savingsGoals.id, id)).limit(1);
    if (!goal) throw new AppError('NOT_FOUND', 'Goal not found', 404);
    return goal;
  },

  /** Owner-scoped read — prevents acting on someone else's goal. */
  async getOwned(id: string, publicKey: string) {
    const [goal] = await db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.publicKey, publicKey)))
      .limit(1);
    if (!goal) throw new AppError('NOT_FOUND', 'Goal not found', 404);
    return goal;
  },

  async getDeposits(goalId: string) {
    return db
      .select()
      .from(deposits)
      .where(eq(deposits.goalId, goalId))
      .orderBy(desc(deposits.createdAt));
  },

  /**
   * Build an unsigned Soroban `deposit` invoke for the saver to sign in Freighter.
   * The amount is validated and normalized server-side.
   */
  async buildDepositTx(goalId: string, publicKey: string, amountDecimal: string) {
    const goal = await savingsGoalService.getOwned(goalId, publicKey);
    if (goal.status === 'withdrawn') {
      throw new AppError('CONFLICT', 'This goal has been withdrawn', 409);
    }
    const amount = toStroops(amountDecimal);
    if (amount <= 0n) throw new AppError('INVALID_INPUT', 'Amount must be greater than zero', 400);

    const xdr = await buildDeposit({
      saver: publicKey,
      goalUuid: goal.id,
      token: sacFor(goal.asset),
      target: toStroops(goal.targetAmount),
      amount,
    });
    return { xdr, amount: fromStroops(amount), asset: goal.asset };
  },

  /**
   * Submit the saver-signed `deposit` invoke, then credit the goal from the
   * AUTHORITATIVE on-chain balance read back from the contract (never the client).
   */
  async confirmDeposit(goalId: string, publicKey: string, signedXdr: string) {
    const goal = await savingsGoalService.getOwned(goalId, publicKey);
    if (goal.status === 'withdrawn') {
      throw new AppError('CONFLICT', 'This goal has been withdrawn', 409);
    }

    const { hash, returnValue } = await submit(signedXdr);

    const existing = await db
      .select()
      .from(deposits)
      .where(eq(deposits.txHash, hash))
      .limit(1);
    if (existing.length > 0) throw new AppError('ALREADY_EXISTS', 'Deposit already recorded', 409);

    // Authoritative new balance: `deposit` returns it in the applied tx meta —
    // immune to read-replica lag. Fall back to a simulated read if absent.
    let onChain: bigint;
    if (returnValue !== null && returnValue !== undefined) {
      onChain = BigInt(returnValue as string | number | bigint);
    } else {
      onChain = await readBalance(publicKey, goal.id);
    }
    const prev = toStroops(goal.currentAmount);
    const delta = onChain - prev;
    const credited = delta > 0n ? delta : onChain; // first deposit: delta == onChain

    const [deposit] = await db
      .insert(deposits)
      .values({
        goalId,
        fromAddress: publicKey,
        txHash: hash,
        asset: goal.asset,
        amount: fromStroops(credited),
      })
      .returning();

    const completed = onChain >= toStroops(goal.targetAmount);
    const newStatus: GoalStatus = completed ? 'completed' : 'active';

    const [updated] = await db
      .update(savingsGoals)
      .set({ currentAmount: fromStroops(onChain), status: newStatus, updatedAt: new Date() })
      .where(eq(savingsGoals.id, goalId))
      .returning();

    return { deposit, goal: updated, completed, txHash: hash };
  },

  /** Build an unsigned Soroban `withdraw` invoke for the saver to sign. */
  async buildWithdrawTx(goalId: string, publicKey: string) {
    const goal = await savingsGoalService.getOwned(goalId, publicKey);
    if (goal.status === 'withdrawn') throw new AppError('CONFLICT', 'Goal already withdrawn', 409);
    if (toStroops(goal.currentAmount) <= 0n) {
      throw new AppError('CONFLICT', 'Nothing to withdraw yet', 409);
    }
    const xdr = await buildWithdraw(publicKey, goal.id);
    return { xdr };
  },

  /** Submit the saver-signed `withdraw` invoke, then close the goal. */
  async confirmWithdraw(goalId: string, publicKey: string, signedXdr: string) {
    const goal = await savingsGoalService.getOwned(goalId, publicKey);
    if (goal.status === 'withdrawn') throw new AppError('CONFLICT', 'Goal already withdrawn', 409);

    const { hash } = await submit(signedXdr);

    const [updated] = await db
      .update(savingsGoals)
      .set({
        status: 'withdrawn',
        currentAmount: '0',
        withdrawalTxHash: hash,
        updatedAt: new Date(),
      })
      .where(eq(savingsGoals.id, goalId))
      .returning();

    return { txHash: hash, amount: goal.currentAmount, asset: goal.asset, goal: updated };
  },

  async userSummary(publicKey: string) {
    const goals = await savingsGoalService.getByPublicKey(publicKey);
    const byAsset = (asset: GoalAsset) =>
      fromStroops(
        goals
          .filter((g) => g.asset === asset && g.status !== 'withdrawn')
          .reduce((acc, g) => acc + toStroops(g.currentAmount), 0n),
      );
    return {
      totalGoals: goals.length,
      activeGoals: goals.filter((g) => g.status === 'active').length,
      completedGoals: goals.filter((g) => g.status === 'completed').length,
      savedXlm: byAsset('XLM'),
      savedUsdc: byAsset('USDC'),
    };
  },
};

export type { SavingsGoal };
