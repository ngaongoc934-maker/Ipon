import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { goalAssetEnum, savingsGoals } from './savingsGoals';

/**
 * A confirmed on-chain deposit into a goal's vault.
 * `amount` is a decimal whole-asset string. `txHash` is the real Horizon tx hash.
 */
export const deposits = pgTable(
  'deposits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => savingsGoals.id, { onDelete: 'cascade' }),
    fromAddress: text('from_address').notNull(),
    txHash: text('tx_hash').notNull().unique(),
    asset: goalAssetEnum('asset').notNull().default('XLM'),
    amount: text('amount').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    goalIdx: index('deposits_goal_idx').on(t.goalId),
  }),
);

export type Deposit = typeof deposits.$inferSelect;
export type NewDeposit = typeof deposits.$inferInsert;
