export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { GOAL_STATUSES } from '@/server/db/schema/savingsGoals';
import { created, ok } from '@/server/lib/http';
import { compose } from '@/server/middleware/compose';
import type { HandlerContext } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';
import { withError } from '@/server/middleware/withError';
import { withRateLimit } from '@/server/middleware/withRateLimit';
import {
  DEFAULT_DEPOSITS_PAGE_SIZE,
  MAX_DEPOSITS_PAGE_SIZE,
  savingsGoalService,
} from '@/server/service/savingsGoal.service';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40, 'Keep the name under 40 characters'),
  emoji: z.string().min(1).max(8).default('🪙'),
  asset: z.enum(['XLM', 'USDC']).default('XLM'),
  targetAmount: z
    .string()
    .refine((v) => Number(v) > 0, 'Target amount must be greater than zero'),
});

const listQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_DEPOSITS_PAGE_SIZE).optional(),
  status: z.enum(GOAL_STATUSES).optional(),
});

async function listGoals(req: NextRequest, ctx: HandlerContext) {
  const publicKey = ctx.publicKey as string;
  const { cursor, limit, status } = listQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  const [{ goals, nextCursor }, summary] = await Promise.all([
    savingsGoalService.getByPublicKey(publicKey, {
      cursor: cursor ? new Date(cursor) : undefined,
      limit: limit ?? DEFAULT_DEPOSITS_PAGE_SIZE,
      status,
    }),
    savingsGoalService.userSummary(publicKey),
  ]);
  return ok({ goals, nextCursor, summary });
}

async function createGoal(req: NextRequest, ctx: HandlerContext) {
  const publicKey = ctx.publicKey as string;
  const body = createSchema.parse(await req.json());
  const goal = await savingsGoalService.create(publicKey, body);
  return created(goal);
}

export const GET = compose(withError, withRateLimit, withAuth)(listGoals);
export const POST = compose(withError, withRateLimit, withAuth)(createGoal);
