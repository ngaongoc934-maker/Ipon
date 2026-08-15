import { AppError } from './http';

/** Stellar amounts use 7 decimal places (stroops for XLM). */
export const STROOPS = 10_000_000n;

const PLAIN_DECIMAL_RE = /^-?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)?$/;

/**
 * Parse a decimal whole-asset string ("100.5") into integer stroops.
 * Rejects anything that isn't plain decimal notation (e.g. "1e-7") instead
 * of letting BigInt() throw — Number(x).toString() on small amounts like
 * 0.0000001 produces exponential notation that this parser can't read.
 */
export function toStroops(decimal: string): bigint {
  const cleaned = decimal.replace(/[, _]/g, '').trim();
  if (cleaned === '' || cleaned === '.' || cleaned === '-') return 0n;
  if (!PLAIN_DECIMAL_RE.test(cleaned)) {
    throw new AppError('INVALID_INPUT', `Amount "${decimal}" is not a valid decimal number`, 400);
  }
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
  const pct = Number((c * 1000n) / t) / 10;
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
}
