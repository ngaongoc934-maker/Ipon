export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ok } from '@/server/lib/http';
import { compose } from '@/server/middleware/compose';
import type { HandlerContext } from '@/server/middleware/compose';
import { withError } from '@/server/middleware/withError';
import { MAX_DEPOSITS_PAGE_SIZE, savingsGoalService } from '@/server/service/savingsGoal.service';

export const depositsQuerySchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_DEPOSITS_PAGE_SIZE).optional(),
});

async function getGoal(req: NextRequest, ctx: HandlerContext) {
  const params = await ctx.params;
  const id = params?.id as string;
  const publicKey = ctx.publicKey as string;
  const { cursor, limit } = depositsQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  const goal = await savingsGoalService.getOwned(id, publicKey);
  const { deposits, nextCursor } = await savingsGoalService.getDeposits(id, {
    cursor: cursor ? new Date(cursor) : undefined,
    limit,
  });
  return ok({ ...goal, deposits, depositsNextCursor: nextCursor });
}

export const GET = compose(withError)(getGoal);
