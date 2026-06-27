import { describe, expect, it } from 'vitest';
import { fromStroops, progressPercent, STROOPS, toStroops } from '@/server/lib/amount';

describe('toStroops / fromStroops', () => {
  it('converts whole units', () => {
    expect(toStroops('1')).toBe(STROOPS);
    expect(fromStroops(STROOPS)).toBe('1');
  });

  it('round-trips fractional amounts', () => {
    expect(toStroops('100.5')).toBe(1_005_000_000n);
    expect(fromStroops(1_005_000_000n)).toBe('100.5');
  });

  it('keeps up to 7 decimals and trims trailing zeros', () => {
    expect(toStroops('0.0000001')).toBe(1n);
    expect(fromStroops(1n)).toBe('0.0000001');
    expect(fromStroops(10_000_000n + 2_500_000n)).toBe('1.25');
  });

  it('treats empty / dot as zero', () => {
    expect(toStroops('')).toBe(0n);
    expect(toStroops('.')).toBe(0n);
    expect(fromStroops(0n)).toBe('0');
  });

  it('strips separators', () => {
    expect(toStroops('1, 000')).toBe(1000n * STROOPS);
  });

  it('handles large amounts without precision loss', () => {
    const big = '1000000.1234567';
    expect(fromStroops(toStroops(big))).toBe(big);
  });
});

describe('progressPercent', () => {
  it('is 0 when target is 0', () => {
    expect(progressPercent('5', '0')).toBe(0);
  });
  it('computes partial progress', () => {
    expect(progressPercent('74', '100')).toBe(74);
    expect(progressPercent('1', '3')).toBe(33);
  });
  it('clamps at 100', () => {
    expect(progressPercent('150', '100')).toBe(100);
  });
  it('never goes negative', () => {
    expect(progressPercent('0', '100')).toBe(0);
  });
});
