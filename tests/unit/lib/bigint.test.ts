import { describe, it, expect } from 'vitest';
import {
  formatMinor,
  addMinor,
  subtractMinor,
  compareMinor,
  minorFromString,
  minorToString,
  isMinorString,
} from '@/server/lib/bigint';

describe('formatMinor', () => {
  it('formats 1000000 as $1.000000', () => {
    expect(formatMinor('1000000', { symbol: '$' })).toBe('$1.000000');
  });
  it('formats 0 as $0.000000', () => {
    expect(formatMinor('0', { symbol: '$' })).toBe('$0.000000');
  });
});

describe('addMinor', () => {
  it('adds two minor amounts', () => {
    expect(addMinor('1000000', '500000')).toBe('1500000');
  });
});

describe('subtractMinor', () => {
  it('subtracts amounts', () => {
    expect(subtractMinor('1500000', '500000')).toBe('1000000');
  });
  it('throws on underflow', () => {
    expect(() => subtractMinor('100', '200')).toThrow();
  });
});

describe('compareMinor', () => {
  it('returns -1 when a < b', () => expect(compareMinor('100', '200')).toBe(-1));
  it('returns 1 when a > b', () => expect(compareMinor('200', '100')).toBe(1));
  it('returns 0 when equal', () => expect(compareMinor('100', '100')).toBe(0));
});

describe('minorFromString', () => {
  it('parses valid minor string', () => {
    expect(minorFromString('1000000')).toBe(1000000n);
  });
  it('parses "0"', () => {
    expect(minorFromString('0')).toBe(0n);
  });
  it('throws on invalid input', () => {
    expect(() => minorFromString('1.5')).toThrow();
    expect(() => minorFromString('-100')).toThrow();
    expect(() => minorFromString('')).toThrow();
  });
  it('uses custom field name in error', () => {
    expect(() => minorFromString('bad', 'targetAmount')).toThrow();
  });
});

describe('minorToString', () => {
  it('converts 1000000n to "1000000"', () => {
    expect(minorToString(1000000n)).toBe('1000000');
  });
  it('converts 0n to "0"', () => {
    expect(minorToString(0n)).toBe('0');
  });
});

describe('isMinorString', () => {
  it('returns true for valid minor string', () => {
    expect(isMinorString('1000000')).toBe(true);
    expect(isMinorString('0')).toBe(true);
  });
  it('returns false for invalid inputs', () => {
    expect(isMinorString('')).toBe(false);
    expect(isMinorString('1.5')).toBe(false);
    expect(isMinorString('-100')).toBe(false);
    expect(isMinorString(123)).toBe(false);
    expect(isMinorString(null)).toBe(false);
  });
});

describe('formatMinor extended', () => {
  it('formats without symbol', () => {
    const result = formatMinor('1000000');
    expect(result).toBeDefined();
  });
  it('formats with custom decimals', () => {
    const result = formatMinor('100', { decimals: 2, symbol: 'RM ' });
    expect(result).toContain('RM ');
  });
  it('formats with custom locale', () => {
    const result = formatMinor('1000000', { locale: 'en-US' });
    expect(result).toBeDefined();
  });
});

describe('addMinor extended', () => {
  it('adds zero', () => {
    expect(addMinor('1000000', '0')).toBe('1000000');
  });
  it('adds large amounts', () => {
    expect(addMinor('999999999999', '1')).toBe('1000000000000');
  });
});

describe('compareMinor extended', () => {
  it('works with 0 comparisons', () => {
    expect(compareMinor('0', '1')).toBe(-1);
    expect(compareMinor('1', '0')).toBe(1);
  });
  it('works with large numbers', () => {
    expect(compareMinor('999999999', '1000000000')).toBe(-1);
  });
});
