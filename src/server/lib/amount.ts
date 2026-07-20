/** Stellar amounts use 7 decimal places (stroops for XLM). */
export const STROOPS = 10_000_000n;

/** Parse a decimal whole-asset string ("100.5") into integer stroops. */
export function toStroops(decimal: string): bigint {
  const cleaned = decimal.replace(/[, _]/g, '').trim();
  if (cleaned === '' || cleaned === '.') return 0n;
  const neg = cleaned.startsWith('-');
  const [whole, frac = ''] = cleaned.replace(/^-/, '').split('.');
  const fracPadded = (frac + '0000000').slice(0, 7);
  const value = BigInt(whole || '0') * STROOPS + BigInt(fracPadded || '0');
  return neg ? -value : value;
}

/** Render integer stroops back to a trimmed decimal string. */
export function fromStroops(s: bigint): string {
  const neg = s < 0n;
  const abs = neg ? -s : s;
  const whole = abs / STROOPS;
  const frac = (abs % STROOPS).toString().padStart(7, '0').replace(/0+$/, '');
  const out = frac ? `${whole}.${frac}` : `${whole}`;
  return neg ? `-${out}` : out;
}

export function progressPercent(current: string, target: string): number {
  const t = toStroops(target);
  if (t <= 0n) return 0;
  const c = toStroops(current);
  const pct = Number((c * 10000n) / t) / 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}
