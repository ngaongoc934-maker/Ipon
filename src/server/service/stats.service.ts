import { sql } from 'drizzle-orm';
import { env } from '@/server/config/env';
import { db } from '@/server/db/client';
import { deposits, savingsGoals, sessions } from '@/server/db/schema';

// Infra keys to exclude from public interaction counts. The GoalVault contract
// custodies funds on-chain (a C-address), so no infra G-account appears in
// sessions; this guard stays in place for any future infra key.
const EXCLUDED_KEYS = [env.GOAL_VAULT_CONTRACT_ID];

export const statsService = {
  /** Public, real interaction counts. Vault/infra keys excluded. */
  async global() {
    const exclude = sql.raw(
      EXCLUDED_KEYS.map((k) => `'${k.replace(/'/g, '')}'`).join(','),
    );

    const [{ uniqueWallets, logins }] = await db
      .select({
        uniqueWallets: sql<number>`count(distinct ${sessions.publicKey})`,
        logins: sql<number>`count(*)`,
      })
      .from(sessions)
      .where(sql`${sessions.publicKey} not in (${exclude})`);

    const [{ totalGoals, activeGoals, completedGoals }] = await db
      .select({
        totalGoals: sql<number>`count(*)`,
        activeGoals: sql<number>`count(*) filter (where ${savingsGoals.status} = 'active')`,
        completedGoals: sql<number>`count(*) filter (where ${savingsGoals.status} = 'completed')`,
      })
      .from(savingsGoals)
      .where(sql`${savingsGoals.publicKey} not in (${exclude})`);

    const [{ totalDeposits }] = await db
      .select({ totalDeposits: sql<number>`count(*)` })
      .from(deposits);

    return {
      uniqueWallets: Number(uniqueWallets) || 0,
      logins: Number(logins) || 0,
      totalGoals: Number(totalGoals) || 0,
      activeGoals: Number(activeGoals) || 0,
      completedGoals: Number(completedGoals) || 0,
      totalDeposits: Number(totalDeposits) || 0,
    };
  },
};
