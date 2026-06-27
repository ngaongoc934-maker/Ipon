export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Activity, PiggyBank, Target, TrendingUp, Trophy, Users } from 'lucide-react';
import { Footer } from '@/ui/components/ui';
import { Header } from '@/ui/components/Header';
import { statsService } from '@/server/service/stats.service';

export const metadata = { title: 'Live stats' };

const CARDS = [
  { key: 'uniqueWallets', label: 'Savers connected', icon: Users, hint: 'Distinct wallets via SEP-10' },
  { key: 'logins', label: 'Wallet sign-ins', icon: Activity, hint: 'SEP-10 sessions created' },
  { key: 'totalGoals', label: 'Goals created', icon: Target, hint: 'Across all savers' },
  { key: 'activeGoals', label: 'Goals in progress', icon: PiggyBank, hint: 'Still saving' },
  { key: 'completedGoals', label: 'Goals reached', icon: Trophy, hint: 'Hit their target' },
  { key: 'totalDeposits', label: 'On-chain deposits', icon: TrendingUp, hint: 'Into the vault contract' },
] as const;

export default async function StatsPage() {
  let stats: Record<string, number> = {
    uniqueWallets: 0,
    logins: 0,
    totalGoals: 0,
    activeGoals: 0,
    completedGoals: 0,
    totalDeposits: 0,
  };
  try {
    stats = (await statsService.global()) as unknown as Record<string, number>;
  } catch {
    /* render zeros on transient db error */
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-5 py-12">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" />
            Live · counted from real interactions
          </span>
          <h1 className="mt-4 font-display text-4xl font-semibold text-ink">Ipon in numbers</h1>
          <p className="mt-2 text-ink-soft">
            Every figure below is pulled straight from the database — real SEP-10 sign-ins, real
            goals, and deposits verified on Stellar testnet. Infrastructure keys are excluded.
          </p>
        </div>

        <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c) => (
            <div key={c.key} className="card p-6">
              <div className="flex items-center justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand">
                  <c.icon className="h-5 w-5" />
                </div>
                <span className="font-display text-4xl font-semibold text-ink tnum">
                  {stats[c.key] ?? 0}
                </span>
              </div>
              <p className="mt-4 font-semibold text-ink">{c.label}</p>
              <p className="text-sm text-ink-soft">{c.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link
            href="/dashboard"
            className="btn-primary inline-flex rounded-full px-6 py-3 text-sm font-semibold"
          >
            Start your own goal
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
