'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Sparkles, Wallet } from 'lucide-react';
import { Header } from '@/ui/components/Header';
import { ProgressRing, AssetBadge, Footer, StatusChip } from '@/ui/components/ui';
import { fmtAsset, progressPct, type AssetCode } from '@/ui/lib/format';
import { useWallet } from '@/ui/wallet/WalletProvider';

type Goal = {
  id: string;
  name: string;
  emoji: string;
  asset: AssetCode;
  targetAmount: string;
  currentAmount: string;
  status: 'active' | 'completed' | 'withdrawn';
};

type Summary = {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  savedXlm: string;
  savedUsdc: string;
};

export default function DashboardPage() {
  const { status, connect } = useWallet();
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'connected') return;
    let active = true;
    setGoals(null);
    setError(null);
    fetch('/api/goals')
      .then((r) => r.json())
      .then((j) => {
        if (!active) return;
        if (!j.ok) throw new Error(j.error?.message ?? 'Failed to load goals');
        setGoals(j.data.goals);
        setSummary(j.data.summary);
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [status]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">My savings goals</h1>
            <p className="mt-1 text-ink-soft">
              Real on-chain vaults. Fund them, fill the ring, withdraw when you hit the target.
            </p>
          </div>
          {status === 'connected' && (
            <Link
              href="/dashboard/create"
              data-testid="new-goal-button"
              className="btn-primary inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              New goal
            </Link>
          )}
        </div>

        {/* Not connected */}
        {(status === 'disconnected' || status === 'loading' || status === 'connecting') && (
          <div className="card mt-10 flex flex-col items-center px-6 py-16 text-center">
            {status === 'loading' ? (
              <Loader2 className="h-7 w-7 animate-spin text-brand" />
            ) : (
              <>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand">
                  <Wallet className="h-6 w-6" />
                </div>
                <h2 className="mt-5 font-display text-xl font-semibold text-ink">
                  Connect to see your goals
                </h2>
                <p className="mt-2 max-w-sm text-ink-soft">
                  Your goals are tied to your Stellar wallet. Connect with Freighter to create one
                  and start saving on testnet.
                </p>
                <button
                  type="button"
                  data-testid="connect-cta"
                  onClick={() => void connect()}
                  disabled={status === 'connecting'}
                  className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
                >
                  {status === 'connecting' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )}
                  Connect wallet
                </button>
              </>
            )}
          </div>
        )}

        {/* Connected */}
        {status === 'connected' && (
          <>
            {summary && (
              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryCard label="Active goals" value={String(summary.activeGoals)} />
                <SummaryCard label="Reached" value={String(summary.completedGoals)} />
                <SummaryCard label="Saved in XLM" value={`${summary.savedXlm} XLM`} />
                <SummaryCard label="Saved in USDC" value={`${summary.savedUsdc} USDC`} />
              </div>
            )}

            {error && (
              <div className="card mt-8 border-l-4 border-l-red-400 px-5 py-4 text-sm text-ink">
                {error}
              </div>
            )}

            {!goals && !error && (
              <div className="mt-10 flex justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-brand" />
              </div>
            )}

            {goals && goals.length === 0 && (
              <div className="card mt-8 flex flex-col items-center px-6 py-16 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-coin-50 text-coin">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="mt-5 font-display text-xl font-semibold text-ink">
                  No goals yet
                </h2>
                <p className="mt-2 max-w-sm text-ink-soft">
                  Create your first goal — a trip, an emergency fund, a new laptop — and fund it with
                  real testnet XLM.
                </p>
                <Link
                  href="/dashboard/create"
                  className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
                >
                  <Plus className="h-4 w-4" />
                  Create your first goal
                </Link>
              </div>
            )}

            {goals && goals.length > 0 && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {goals.map((g) => (
                  <Link key={g.id} href={`/goals/${g.id}`} className="card block p-5 transition hover:-translate-y-0.5">
                    <div className="flex items-center gap-4">
                      <ProgressRing pct={progressPct(g.currentAmount, g.targetAmount)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{g.emoji}</span>
                          <h3 className="truncate font-semibold text-ink">{g.name}</h3>
                          <AssetBadge asset={g.asset} />
                        </div>
                        <p className="mt-1 text-sm text-ink-soft tnum">
                          <span className="font-semibold text-ink">
                            {fmtAsset(g.currentAmount, g.asset)}
                          </span>{' '}
                          / {fmtAsset(g.targetAmount, g.asset)}
                        </p>
                        <div className="mt-2">
                          <StatusChip status={g.status} />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-ink tnum">{value}</p>
    </div>
  );
}
