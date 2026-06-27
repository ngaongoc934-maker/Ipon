export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowRight, CircleDollarSign, Landmark, ShieldCheck, Target } from 'lucide-react';
import { Footer } from '@/ui/components/ui';
import { Header } from '@/ui/components/Header';
import { statsService } from '@/server/service/stats.service';

async function safeStats() {
  try {
    return await statsService.global();
  } catch {
    return null;
  }
}

export default async function LandingPage() {
  const stats = await safeStats();

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-5xl px-5">
        {/* Hero */}
        <section className="grid items-center gap-10 py-14 md:grid-cols-[1.05fr_0.95fr] md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-coin" />
              Ipon — Filipino for &ldquo;to save&rdquo;
            </span>
            <h1 className="mt-5 font-display text-[2.7rem] font-semibold leading-[1.05] text-ink sm:text-6xl">
              Saving you can
              <br />
              actually <span className="text-brand">keep.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
              Name a goal, deposit real XLM or USDC into your own on-chain vault, and watch the
              progress ring fill. Every peso of momentum is a real Stellar transaction — withdraw
              on-chain the moment you hit your target.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                data-testid="cta-button"
                className="btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-base font-semibold"
              >
                Start a savings goal
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/stats"
                className="rounded-full border border-line bg-white px-5 py-3.5 text-base font-medium text-ink transition hover:border-brand-100"
              >
                See live stats
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-soft">
              Browse freely — a wallet is only needed when you sign a deposit.
            </p>
          </div>

          {/* Goal card mock — clearly illustrative, generic data */}
          <div className="card relative p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🛫</span>
                <div>
                  <p className="font-semibold text-ink">Trip home for the holidays</p>
                  <p className="text-sm text-ink-soft">Example goal preview</p>
                </div>
              </div>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
                XLM
              </span>
            </div>
            <div className="mt-6 flex items-end justify-between">
              <div>
                <p className="font-display text-4xl font-semibold text-ink">320 XLM</p>
                <p className="text-sm text-ink-soft">of 500 XLM goal</p>
              </div>
              <div className="h-16 w-16 rounded-full bg-mist text-center">
                <div className="grid h-full place-items-center font-display text-lg font-semibold text-brand">
                  64%
                </div>
              </div>
            </div>
            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-mist">
              <div className="h-full rounded-full bg-brand" style={{ width: '64%' }} />
            </div>
            <p className="mt-3 text-xs text-ink-soft">
              Illustration only — your real goals appear after you create them.
            </p>
          </div>
        </section>

        {/* Live numbers */}
        {stats && (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: stats.uniqueWallets, l: 'Savers connected' },
              { k: stats.totalGoals, l: 'Goals created' },
              { k: stats.totalDeposits, l: 'On-chain deposits' },
              { k: stats.completedGoals, l: 'Goals reached' },
            ].map((s) => (
              <div key={s.l} className="card px-4 py-5 text-center">
                <p className="font-display text-3xl font-semibold text-brand tnum">{s.k}</p>
                <p className="mt-1 text-sm text-ink-soft">{s.l}</p>
              </div>
            ))}
          </section>
        )}

        {/* How it works */}
        <section className="py-16">
          <h2 className="font-display text-2xl font-semibold text-ink">How Ipon works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Target,
                t: 'Set the goal',
                d: 'Give it a name, an emoji, a target, and pick XLM (default) or USDC. No trustline needed for XLM.',
              },
              {
                icon: CircleDollarSign,
                t: 'Fund it for real',
                d: 'Sign a deposit into the GoalVault Soroban contract. Your funds are held on-chain, credited from the contract balance.',
              },
              {
                icon: Landmark,
                t: 'Withdraw on-chain',
                d: 'Pull everything back to your wallet with a single signed contract call. Only you can withdraw. Real money, start to finish.',
              },
            ].map((f) => (
              <div key={f.t} className="card p-6">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-ink">{f.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink-soft">
            <ShieldCheck className="h-4 w-4 text-positive" />
            Testnet only. Connect with Freighter — signing is pinned to Stellar testnet, even if your
            wallet is set to mainnet.
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
