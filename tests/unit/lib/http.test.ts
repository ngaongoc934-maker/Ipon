import { describe, it, expect } from 'vitest';
import { AppError, fromError } from '@/server/lib/http';

describe('AppError', () => {
  it('constructs with code and message', () => {
    const err = new AppError('NOT_FOUND', 'Goal not found', 404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Goal not found');
    expect(err.status).toBe(404);
    expect(err.name).toBe('AppError');
  });

  it('defaults status to 400', () => {
    const err = new AppError('INVALID_INPUT', 'bad input');
    expect(err.status).toBe(400);
  });

  it('stores details', () => {
    const err = new AppError('INVALID_INPUT', 'bad', 400, { field: 'name' });
    expect(err.details).toEqual({ field: 'name' });
  });
});

describe('fromError', () => {
  it('handles AppError', async () => {
    const err = new AppError('NOT_FOUND', 'Goal not found', 404);
    const res = fromError(err);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(res.status).toBe(404);
  });

  it('handles ZodError', async () => {
    const zodErr = {
      name: 'ZodError',
      issues: [{ path: ['name'], message: 'Required' }],
    };
    const res = fromError(zodErr);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INVALID_INPUT');
  });

  it('handles ZodError with INVALID_PUBLIC_KEY message', async () => {
    const zodErr = {
      name: 'ZodError',
      issues: [{ path: ['publicKey'], message: 'INVALID_PUBLIC_KEY' }],
    };
    const res = fromError(zodErr);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_PUBLIC_KEY');
  });

  it('handles unknown error', async () => {
    const res = fromError(new Error('Something broke'));
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('INTERNAL');
    expect(res.status).toBe(500);
  });

  it('handles non-Error thrown value', async () => {
    const res = fromError('string error');
    const body = await res.json();
    expect(body.error.code).toBe('INTERNAL');
  });
});
