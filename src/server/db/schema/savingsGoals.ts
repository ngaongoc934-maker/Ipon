import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const GOAL_STATUSES = ['active', 'completed', 'withdrawn'] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];
export const goalStatusEnum = pgEnum('goal_status', GOAL_STATUSES);

export const GOAL_ASSETS = ['XLM', 'USDC'] as const;
export type GoalAsset = (typeof GOAL_ASSETS)[number];
export const goalAssetEnum = pgEnum('goal_asset', GOAL_ASSETS);

/**
 * A savings goal. Amounts are stored as decimal whole-asset strings
 * (e.g. "100.0000000"), matching on-chain Stellar amounts (7 dp).
 */
export const savingsGoals = pgTable(
  'savings_goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    publicKey: text('public_key').notNull(),
    name: text('name').notNull(),
    emoji: text('emoji').notNull().default('🪙'),
    asset: goalAssetEnum('asset').notNull().default('XLM'),
    targetAmount: text('target_amount').notNull(),
    currentAmount: text('current_amount').notNull().default('0'),
    status: goalStatusEnum('status').notNull().default('active'),
    withdrawalTxHash: text('withdrawal_tx_hash'),
    network: text('network').notNull().default('testnet'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    pkIdx: index('goals_pk_idx').on(t.publicKey),
    statusIdx: index('goals_status_idx').on(t.status),
  }),
);

export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type NewSavingsGoal = typeof savingsGoals.$inferInsert;
