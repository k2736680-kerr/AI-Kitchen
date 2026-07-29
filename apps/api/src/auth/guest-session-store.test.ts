import { describe, expect, it } from 'vitest';

import { createOpaqueSessionToken, hashSessionToken } from './guest-session-store';

describe('guest session token primitives', () => {
  it('creates high-entropy opaque tokens and stores only their SHA-256 representation', () => {
    const first = createOpaqueSessionToken();
    const second = createOpaqueSessionToken();
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first.length).toBeGreaterThanOrEqual(43);
    expect(hashSessionToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSessionToken(first)).not.toBe(first);
  });
});
