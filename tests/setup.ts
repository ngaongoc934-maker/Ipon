import { webcrypto } from 'node:crypto';

// Inject webcrypto for Stellar SDK and jose
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

// Stub env vars for tests
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://localhost/ipon_test';
process.env.DRIZZLE_DATABASE_URL = process.env.DRIZZLE_DATABASE_URL ?? 'postgresql://localhost/ipon_test';
process.env.STELLAR_NETWORK = process.env.STELLAR_NETWORK ?? 'testnet';
process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-secret-at-least-32-chars-long!!';

// Stub matchMedia for jsdom
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
