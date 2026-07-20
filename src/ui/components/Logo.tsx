export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#6d28d9" />
      {/* coin slot jar */}
      <path
        d="M9 14.5c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v6.5a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3v-6.5Z"
        fill="#f3ecfc"
      />
      <rect x="13.5" y="9.5" width="5" height="2" rx="1" fill="#f59e0b" />
      <circle cx="16" cy="18" r="2.4" fill="#f59e0b" />
    </svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Logo size={size} />
      <span className="font-display text-[1.35rem] font-semibold tracking-tight text-ink">
        Ipon
      </span>
    </div>
  );
}
