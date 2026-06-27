export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok } from '@/server/lib/http';
import { compose } from '@/server/middleware/compose';
import type { HandlerContext } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';
import { withError } from '@/server/middleware/withError';
import { savingsGoalService } from '@/server/service/savingsGoal.service';

const buildSchema = z.object({
  amount: z.string().refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
});

async function buildDeposit(req: NextRequest, ctx: HandlerContext) {
  const params = await ctx.params;
  const id = params?.id as string;
  const { amount } = buildSchema.parse(await req.json());
  const result = await savingsGoalService.buildDepositTx(id, ctx.publicKey as string, amount);
  return ok(result);
}

export const POST = compose(withError, withAuth)(buildDeposit);
