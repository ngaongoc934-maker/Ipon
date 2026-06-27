export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';
import { ok } from '@/server/lib/http';
import { compose } from '@/server/middleware/compose';
import type { HandlerContext } from '@/server/middleware/compose';
import { withError } from '@/server/middleware/withError';
import { savingsGoalService } from '@/server/service/savingsGoal.service';

async function getGoal(_req: NextRequest, ctx: HandlerContext) {
  const params = await ctx.params;
  const id = params?.id as string;
  const goal = await savingsGoalService.getById(id);
  const deposits = await savingsGoalService.getDeposits(id);
  return ok({ ...goal, deposits });
}

export const GET = compose(withError)(getGoal);
