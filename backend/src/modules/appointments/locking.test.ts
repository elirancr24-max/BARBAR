import { describe, it, expect } from 'vitest';
import { acquireLock, releaseLock } from '../../lib/redis';

describe('redis locking helpers (in-memory mode)', () => {
  it('grants the lock to the first caller and refuses the second', async () => {
    const key = `lock:test:${Math.random().toString(36).slice(2)}`;
    const a = await acquireLock(key, 5, 'caller-A');
    const b = await acquireLock(key, 5, 'caller-B');
    expect(a).toBe(true);
    expect(b).toBe(false);
    await releaseLock(key, 'caller-A');
  });

  it('allows re-acquiring the lock after the owner releases it', async () => {
    const key = `lock:test:${Math.random().toString(36).slice(2)}`;
    expect(await acquireLock(key, 5, 'A')).toBe(true);
    expect(await releaseLock(key, 'A')).toBe(true);
    expect(await acquireLock(key, 5, 'B')).toBe(true);
    await releaseLock(key, 'B');
  });

  it('refuses to release a lock the caller does not own', async () => {
    const key = `lock:test:${Math.random().toString(36).slice(2)}`;
    expect(await acquireLock(key, 5, 'owner')).toBe(true);
    expect(await releaseLock(key, 'imposter')).toBe(false);
    // The real owner can still release
    expect(await releaseLock(key, 'owner')).toBe(true);
  });

  it('concurrent acquire on the same key yields exactly one winner', async () => {
    const key = `lock:test:${Math.random().toString(36).slice(2)}`;
    const results = await Promise.all([
      acquireLock(key, 5, 'p1'),
      acquireLock(key, 5, 'p2'),
      acquireLock(key, 5, 'p3'),
    ]);
    const winners = results.filter((r) => r === true);
    expect(winners.length).toBe(1);
    await releaseLock(key, 'p1').catch(() => {});
    await releaseLock(key, 'p2').catch(() => {});
    await releaseLock(key, 'p3').catch(() => {});
  });
});
