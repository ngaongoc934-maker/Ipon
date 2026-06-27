import { describe, it, expect, vi } from 'vitest';
import { logger } from '@/server/lib/logger';

describe('logger', () => {
  it('has info, warn, error, debug, pubkey methods', () => {
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.pubkey).toBe('function');
  });

  it('pubkey truncates long keys', () => {
    const key = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGPKU3KX6Q5IEBVZ4HRR4I';
    const result = logger.pubkey(key);
    expect(result).toContain('…');
    expect(result.length).toBeLessThan(key.length);
  });

  it('pubkey handles null', () => {
    expect(logger.pubkey(null)).toBe('<none>');
  });

  it('pubkey handles undefined', () => {
    expect(logger.pubkey(undefined)).toBe('<none>');
  });

  it('pubkey handles short key without truncation', () => {
    const short = 'ABC';
    expect(logger.pubkey(short)).toBe(short);
  });

  it('info logs without throwing', () => {
    expect(() => logger.info('test message', { key: 'value' })).not.toThrow();
  });

  it('warn logs without throwing', () => {
    expect(() => logger.warn('warning', { count: 5 })).not.toThrow();
  });

  it('error logs without throwing', () => {
    expect(() => logger.error('error occurred')).not.toThrow();
  });

  it('debug logs without throwing', () => {
    expect(() => logger.debug('debug info')).not.toThrow();
  });
});
