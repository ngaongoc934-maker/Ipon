'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Wallet } from 'lucide-react';
import { Header } from '@/ui/components/Header';
import { Footer } from '@/ui/components/ui';
import { cn, type AssetCode } from '@/ui/lib/format';
import { useWallet } from '@/ui/wallet/WalletProvider';

const EMOJIS = ['🪙', '🛫', '🎓', '🏠', '🚗', '🛡️', '💻', '💍', '🏖️', '🎁'];

export default function CreateGoalPage() {
  const router = useRouter();
  const { status, connect } = useWallet();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🪙');
  const [asset, setAsset] = useState<AssetCode>('XLM');
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetNum = Number(target);
  const valid = name.trim().length > 0 && name.trim().length <= 40 && targetNum > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), emoji, asset, targetAmount: String(targetNum) }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error?.message ?? 'Could not create goal');
      router.push(`/goals/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-lg px-5 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to goals
        </Link>

        <h1 className="mt-5 font-display text-3xl font-semibold text-ink">Create a goal</h1>
        <p className="mt-1 text-ink-soft">What are you saving for?</p>

        {status !== 'connected' ? (
          <div className="card mt-8 flex flex-col items-center px-6 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand">
              <Wallet className="h-5 w-5" />
            </div>
            <p className="mt-4 max-w-xs text-ink-soft">
              Connect your wallet first — your goal will be tied to your Stellar address.
            </p>
            <button
              type="button"
              onClick={() => void connect()}
              disabled={status === 'connecting'}
              className="btn-primary mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
            >
              {status === 'connecting' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              Connect wallet
            </button>
          </div>
        ) : (
          <form data-testid="create-goal-form" onSubmit={submit} className="card mt-8 space-y-6 p-6">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink">
                Goal name
              </label>
              <input
                id="name"
                data-testid="goal-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Emergency fund, Trip home"
                maxLength={40}
                className="w-full rounded-xl border border-line bg-cream/40 px-4 py-3 text-ink outline-none transition focus:border-brand focus:bg-white"
              />
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-ink">Pick an icon</span>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={cn(
                      'grid h-11 w-11 place-items-center rounded-xl border-2 text-xl transition',
                      emoji === e
                        ? 'border-brand bg-brand-50'
                        : 'border-line hover:border-brand-100',
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium text-ink">Save in</span>
              <div className="grid grid-cols-2 gap-3">
                {(['XLM', 'USDC'] as AssetCode[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    data-testid={`asset-${a}`}
                    onClick={() => setAsset(a)}
                    className={cn(
                      'rounded-xl border-2 px-4 py-3 text-left transition',
                      asset === a ? 'border-brand bg-brand-50' : 'border-line hover:border-brand-100',
                    )}
                  >
                    <span className="block font-semibold text-ink">{a}</span>
                    <span className="block text-xs text-ink-soft">
                      {a === 'XLM' ? 'Native · no trustline' : 'Needs one-tap trustline'}
                    </span>
                  </button>
                ))}
              </div>
              {asset === 'XLM' && (
                <p className="mt-2 text-xs text-ink-soft">
                  XLM works for any funded testnet wallet out of the box.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="target" className="mb-1.5 block text-sm font-medium text-ink">
                Target amount ({asset})
              </label>
              <input
                id="target"
                data-testid="goal-target"
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="500"
                min="0"
                step="0.0000001"
                className="w-full rounded-xl border border-line bg-cream/40 px-4 py-3 text-ink outline-none transition focus:border-brand focus:bg-white tnum"
              />
              {target !== '' && targetNum <= 0 && (
                <p className="mt-1.5 text-sm text-red-600">Enter an amount greater than zero.</p>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              data-testid="submit-goal"
              disabled={!valid || loading}
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Create goal
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}
