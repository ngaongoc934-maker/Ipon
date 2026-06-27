export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';
import { ok } from '@/server/lib/http';
import { compose } from '@/server/middleware/compose';
import type { HandlerContext } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';
import { withError } from '@/server/middleware/withError';
import { savingsGoalService } from '@/server/service/savingsGoal.service';

async function buildWithdraw(_req: NextRequest, ctx: HandlerContext) {
  const params = await ctx.params;
  const id = params?.id as string;
  const result = await savingsGoalService.buildWithdrawTx(id, ctx.publicKey as string);
  return ok(result);
}

export const POST = compose(withError, withAuth)(buildWithdraw);
