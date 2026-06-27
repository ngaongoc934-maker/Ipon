export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { created, ok } from '@/server/lib/http';
import { compose } from '@/server/middleware/compose';
import type { HandlerContext } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';
import { withError } from '@/server/middleware/withError';
import { savingsGoalService } from '@/server/service/savingsGoal.service';

const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(40, 'Keep the name under 40 characters'),
  emoji: z.string().min(1).max(8).default('🪙'),
  asset: z.enum(['XLM', 'USDC']).default('XLM'),
  targetAmount: z
    .string()
    .refine((v) => Number(v) > 0, 'Target amount must be greater than zero'),
});

async function listGoals(_req: NextRequest, ctx: HandlerContext) {
  const publicKey = ctx.publicKey as string;
  const [goals, summary] = await Promise.all([
    savingsGoalService.getByPublicKey(publicKey),
    savingsGoalService.userSummary(publicKey),
  ]);
  return ok({ goals, summary });
}

async function createGoal(req: NextRequest, ctx: HandlerContext) {
  const publicKey = ctx.publicKey as string;
  const body = createSchema.parse(await req.json());
  const goal = await savingsGoalService.create(publicKey, body);
  return created(goal);
}

export const GET = compose(withError, withAuth)(listGoals);
export const POST = compose(withError, withAuth)(createGoal);
