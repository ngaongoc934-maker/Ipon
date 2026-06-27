export const dynamic = 'force-dynamic';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { created } from '@/server/lib/http';
import { compose } from '@/server/middleware/compose';
import type { HandlerContext } from '@/server/middleware/compose';
import { withAuth } from '@/server/middleware/withAuth';
import { withError } from '@/server/middleware/withError';
import { savingsGoalService } from '@/server/service/savingsGoal.service';

const depositSchema = z.object({
  signedXdr: z.string().trim().min(1, 'A signed transaction is required'),
});

async function recordDeposit(req: NextRequest, ctx: HandlerContext) {
  const params = await ctx.params;
  const id = params?.id as string;
  const { signedXdr } = depositSchema.parse(await req.json());
  const result = await savingsGoalService.confirmDeposit(id, ctx.publicKey as string, signedXdr);
  return created(result);
}

export const POST = compose(withError, withAuth)(recordDeposit);
