'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  PartyPopper,
  ShieldPlus,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/ui/components/Header';
import { AssetBadge, Footer, ProgressRing, StatusChip } from '@/ui/components/ui';
import {
  cn,
  explorerContract,
  explorerTx,
  fmtAsset,
  progressPct,
  shortKey,
  type AssetCode,
} from '@/ui/lib/format';
import { publicEnv } from '@/server/config/env.public';
import { depositToGoal, enableUsdc, WalletError, withdrawGoal } from '@/ui/wallet/stellarClient';
import { useWallet } from '@/ui/wallet/WalletProvider';

type Deposit = {
  id: string;
  txHash: string;
  fromAddress: string;
  asset: AssetCode;
  amount: string;
  createdAt: string;
};
type Goal = {
  id: string;
  publicKey: string;
  name: string;
  emoji: string;
  asset: AssetCode;
  targetAmount: string;
  currentAmount: string;
  status: 'active' | 'completed' | 'withdrawn';
  withdrawalTxHash: string | null;
  deposits: Deposit[];
};

export default function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status, publicKey, connect } = useWallet();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState<null | 'deposit' | 'withdraw' | 'trust'>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/goals/${id}`);
    const json = await res.json();
    if (!json.ok) {
      setNotFound(true);
      return;
    }
    setGoal(json.data);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isOwner = !!publicKey && goal?.publicKey === publicKey;
  const pct = goal ? progressPct(goal.currentAmount, goal.targetAmount) : 0;
  const amountNum = Number(amount);

  async function handleDeposit() {
    if (!goal || !publicKey) return;
    if (!(amountNum > 0)) {
      toast.error('Enter an amount greater than zero');
      return;
    }
    setBusy('deposit');
    try {
      toast.loading('Sign the deposit in your wallet…', { id: 'dep' });
      const { txHash } = await depositToGoal(goal.id, String(amountNum), publicKey);
      toast.success('Deposit locked in the vault contract', {
        id: 'dep',
        description: shortKey(txHash, 8, 8),
        action: {
          label: 'View',
          onClick: () => window.open(explorerTx(txHash, publicEnv.network), '_blank'),
        },
      });
      setAmount('');
      await load();
    } catch (e) {
      const msg = e instanceof WalletError || e instanceof Error ? e.message : 'Deposit failed';
      toast.error('Deposit failed', { id: 'dep', description: msg });
    } finally {
      setBusy(null);
    }
  }

  async function handleEnableUsdc() {
    if (!publicKey) return;
    setBusy('trust');
    try {
      toast.loading('Approve the USDC trustline…', { id: 'trust' });
      const tx = await enableUsdc(publicKey);
      toast.success('USDC enabled on your wallet', {
        id: 'trust',
        description: shortKey(tx, 8, 8),
        action: {
          label: 'View',
          onClick: () => window.open(explorerTx(tx, publicEnv.network), '_blank'),
        },
      });
    } catch (e) {
      const msg = e instanceof WalletError || e instanceof Error ? e.message : 'Could not enable USDC';
      toast.error('Enable USDC failed', { id: 'trust', description: msg });
    } finally {
      setBusy(null);
    }
  }

  async function handleWithdraw() {
    if (!goal || !publicKey) return;
    setBusy('withdraw');
    try {
      toast.loading('Sign the withdrawal in your wallet…', { id: 'wd' });
      const { txHash } = await withdrawGoal(goal.id, publicKey);
      toast.success('Withdrawn to your wallet', {
        id: 'wd',
        description: shortKey(txHash, 8, 8),
        action: {
          label: 'View',
          onClick: () => window.open(explorerTx(txHash, publicEnv.network), '_blank'),
        },
      });
      await load();
    } catch (e) {
      toast.error('Withdraw failed', {
        id: 'wd',
        description: e instanceof Error ? e.message : 'Try again',
      });
    } finally {
      setBusy(null);
    }
  }

  if (notFound) {
    return (
      <Shell>
        <div className="card mt-10 px-6 py-16 text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">Goal not found</h1>
          <p className="mt-2 text-ink-soft">This goal does not exist or is not yours.</p>
          <Link
            href="/dashboard"
            className="btn-primary mt-6 inline-flex rounded-full px-6 py-3 text-sm font-semibold"
          >
            Back to my goals
          </Link>
        </div>
      </Shell>
    );
  }

  if (!goal) {
    return (
      <Shell>
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-brand" />
        </div>
      </Shell>
    );
  }

  const withdrawable = Number(goal.currentAmount) > 0 && goal.status !== 'withdrawn';

  return (
    <Shell>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        My goals
      </Link>

      {goal.status === 'completed' && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-brand px-5 py-4 text-white">
          <PartyPopper className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-semibold">You reached your goal!</p>
            <p className="text-sm text-white/80">
              {fmtAsset(goal.targetAmount, goal.asset)} saved. Withdraw whenever you like.
            </p>
          </div>
        </div>
      )}
      {goal.status === 'withdrawn' && goal.withdrawalTxHash && (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-white px-5 py-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-positive" />
          <div className="text-sm">
            <p className="font-semibold text-ink">Funds withdrawn to your wallet.</p>
            <a
              href={explorerTx(goal.withdrawalTxHash, publicEnv.network)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-brand-700 hover:underline"
            >
              View payout {shortKey(goal.withdrawalTxHash, 6, 6)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="card mt-6 p-6">
        <div className="flex items-center gap-5">
          <ProgressRing pct={pct} size={104} stroke={10} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-2xl">{goal.emoji}</span>
              <h1 className="font-display text-2xl font-semibold text-ink">{goal.name}</h1>
              <AssetBadge asset={goal.asset} />
              <StatusChip status={goal.status} />
            </div>
            <p className="mt-2 font-display text-3xl font-semibold text-ink tnum">
              {fmtAsset(goal.currentAmount, goal.asset)}
            </p>
            <p className="text-sm text-ink-soft tnum">
              of {fmtAsset(goal.targetAmount, goal.asset)} goal
            </p>
          </div>
        </div>
      </div>

      {/* Action area */}
      {status !== 'connected' ? (
        <div className="card mt-5 flex flex-col items-center px-6 py-10 text-center">
          <p className="max-w-sm text-ink-soft">
            Connect your wallet to fund this goal with a real on-chain deposit.
          </p>
          <button
            type="button"
            onClick={() => void connect()}
            className="btn-primary mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
          >
            <Wallet className="h-4 w-4" />
            Connect wallet
          </button>
        </div>
      ) : !isOwner ? (
        <div className="card mt-5 px-6 py-8 text-center text-ink-soft">
          You are viewing someone else&apos;s goal. Only the owner can fund or withdraw it.
        </div>
      ) : goal.status === 'withdrawn' ? null : (
        <div className="card mt-5 p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Add to this goal</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Sign a {goal.asset} deposit into the GoalVault smart contract. Funds are held on-chain
            until you withdraw.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                data-testid="deposit-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                min="0"
                step="0.0000001"
                className="w-full rounded-xl border border-line bg-cream/40 px-4 py-3 pr-16 text-ink outline-none transition focus:border-brand focus:bg-white tnum"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-soft">
                {goal.asset}
              </span>
            </div>
            <button
              type="button"
              data-testid="deposit-button"
              onClick={() => void handleDeposit()}
              disabled={busy !== null || !(amountNum > 0)}
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
            >
              {busy === 'deposit' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownToLine className="h-4 w-4" />
              )}
              Deposit
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft">
            <span>
              Vault contract:{' '}
              <a
                href={explorerContract(publicEnv.contractId, publicEnv.network)}
                target="_blank"
                rel="noreferrer"
                className="text-brand-700 hover:underline"
              >
                {shortKey(publicEnv.contractId, 6, 6)}
              </a>
            </span>
            {goal.asset === 'USDC' && (
              <button
                type="button"
                onClick={() => void handleEnableUsdc()}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-full border border-coin/40 bg-coin-50 px-3 py-1 font-semibold text-coin transition hover:bg-coin-50/70"
              >
                {busy === 'trust' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldPlus className="h-3.5 w-3.5" />
                )}
                Enable USDC
              </button>
            )}
          </div>

          {withdrawable && (
            <button
              type="button"
              data-testid="withdraw-button"
              onClick={() => void handleWithdraw()}
              disabled={busy !== null}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-brand py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
            >
              {busy === 'withdraw' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Withdraw {fmtAsset(goal.currentAmount, goal.asset)} to my wallet
            </button>
          )}
        </div>
      )}

      {/* History */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-ink">Deposit history</h2>
        <div className="card mt-3 overflow-hidden">
          {goal.deposits.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-ink-soft">
              No deposits yet. Your first on-chain deposit will show up here with its Stellar tx.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-mist/60 text-left text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">From</th>
                  <th className="px-5 py-3 font-semibold">Tx</th>
                  <th className="px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {goal.deposits.map((d) => (
                  <tr key={d.id}>
                    <td className="px-5 py-3 font-semibold text-ink tnum">
                      {fmtAsset(d.amount, d.asset)}
                    </td>
                    <td className="px-5 py-3 text-ink-soft tnum">{shortKey(d.fromAddress)}</td>
                    <td className="px-5 py-3">
                      <a
                        href={explorerTx(d.txHash, publicEnv.network)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                      >
                        {shortKey(d.txHash)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                    <td className="px-5 py-3 text-ink-soft">
                      {new Date(d.createdAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className={cn('mx-auto max-w-2xl px-5 py-10')}>{children}</main>
      <Footer />
    </div>
  );
}
