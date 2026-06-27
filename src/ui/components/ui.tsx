import Link from 'next/link';
import type { AssetCode } from '@/ui/lib/format';
import { cn } from '@/ui/lib/format';

export function ProgressRing({
  pct,
  size = 72,
  stroke = 7,
}: {
  pct: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${pct}% complete`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ece2f6" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#6d28d9"
        strokeWidth={stroke}
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy="0.35em"
        fontSize={size * 0.24}
        fontWeight="700"
        fill="#6d28d9"
      >
        {pct}%
      </text>
    </svg>
  );
}

export function AssetBadge({ asset }: { asset: AssetCode }) {
  const isXlm = asset === 'XLM';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        isXlm ? 'bg-brand-50 text-brand-700' : 'bg-coin-50 text-coin',
      )}
    >
      {asset}
    </span>
  );
}

export function StatusChip({ status }: { status: 'active' | 'completed' | 'withdrawn' }) {
  const map = {
    active: { label: 'Saving', cls: 'bg-mist text-brand-700' },
    completed: { label: 'Goal reached', cls: 'bg-coin-50 text-coin' },
    withdrawn: { label: 'Withdrawn', cls: 'bg-cream-deep text-ink-soft' },
  } as const;
  const m = map[status];
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-semibold', m.cls)}>
      {m.label}
    </span>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line/70">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-5 py-7 text-sm text-ink-soft sm:flex-row">
        <p>Ipon · on-chain savings goals on Stellar testnet</p>
        <div className="flex items-center gap-4">
          <Link href="/stats" className="hover:text-ink">
            Live stats
          </Link>
          <a
            href="https://stellar.org"
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink"
          >
            Built on Stellar
          </a>
        </div>
      </div>
    </footer>
  );
}
