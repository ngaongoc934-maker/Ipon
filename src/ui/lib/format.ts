import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type AssetCode = 'XLM' | 'USDC';

/** Format a decimal whole-asset string for display (trims trailing zeros, 2–7 dp). */
export function fmtAmount(amount: string | number): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return '0';
  const fixed = n.toFixed(7).replace(/0+$/, '').replace(/\.$/, '');
  return fixed.includes('.') ? fixed : fixed;
}

export function fmtAsset(amount: string | number, asset: AssetCode): string {
  return `${fmtAmount(amount)} ${asset}`;
}

export function progressPct(current: string | number, target: string | number): number {
  const c = Number(current);
  const t = Number(target);
  if (!t || t <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((c / t) * 100)));
}

export function shortKey(key: string, lead = 4, tail = 4): string {
  if (key.length <= lead + tail + 1) return key;
  return `${key.slice(0, lead)}…${key.slice(-tail)}`;
}

export function explorerTx(hash: string, network = 'testnet'): string {
  return `https://stellar.expert/explorer/${network}/tx/${hash}`;
}

export function explorerAccount(addr: string, network = 'testnet'): string {
  return `https://stellar.expert/explorer/${network}/account/${addr}`;
}

export function explorerContract(contractId: string, network = 'testnet'): string {
  return `https://stellar.expert/explorer/${network}/contract/${contractId}`;
}
