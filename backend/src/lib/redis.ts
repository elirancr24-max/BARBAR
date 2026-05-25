/**
 * Dual-mode Redis client.
 * - If REDIS_URL starts with `memory://` (or is empty) → in-memory shim (dev/local).
 * - Otherwise → real ioredis connection (production: Upstash/Redis/etc).
 *
 * The public API is identical in both modes so the rest of the codebase doesn't care.
 */
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

interface RedisLike {
  ping(): Promise<string>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<'OK' | null>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  eval(script: string, numKeys: number, ...args: unknown[]): Promise<number>;
  call(...args: unknown[]): Promise<unknown>;
  on(event: string, cb: (...a: unknown[]) => void): unknown;
  disconnect(): void;
}

const isMemoryMode = !env.REDIS_URL || env.REDIS_URL.startsWith('memory://');

// ───────────────── Memory implementation ─────────────────
interface Entry { value: string; expiresAt: number | null; }
const store = new Map<string, Entry>();
function now(): number { return Date.now(); }
function isExpired(e: Entry): boolean { return e.expiresAt !== null && e.expiresAt <= now(); }
function purgeIfExpired(key: string): void {
  const e = store.get(key);
  if (e && isExpired(e)) store.delete(key);
}
setInterval(() => {
  for (const [k, e] of store) if (isExpired(e)) store.delete(k);
}, 30_000).unref?.();

class MemoryRedis implements RedisLike {
  async ping(): Promise<'PONG'> { return 'PONG'; }
  async get(key: string): Promise<string | null> {
    purgeIfExpired(key);
    return store.get(key)?.value ?? null;
  }
  async set(key: string, value: string, ...args: unknown[]): Promise<'OK' | null> {
    let ttlMs: number | null = null;
    let nx = false;
    for (let i = 0; i < args.length; i++) {
      const a = String(args[i]).toUpperCase();
      if (a === 'EX') ttlMs = Number(args[++i]) * 1000;
      else if (a === 'NX') nx = true;
    }
    purgeIfExpired(key);
    if (nx && store.has(key)) return null;
    store.set(key, { value, expiresAt: ttlMs ? now() + ttlMs : null });
    return 'OK';
  }
  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) if (store.delete(k)) count++;
    return count;
  }
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const out: string[] = [];
    for (const [k, e] of store) {
      if (isExpired(e)) { store.delete(k); continue; }
      if (regex.test(k)) out.push(k);
    }
    return out;
  }
  async eval(_script: string, _numKeys: number, ...args: unknown[]): Promise<number> {
    const key = String(args[0]);
    const expected = String(args[1]);
    const current = await this.get(key);
    if (current === expected) { await this.del(key); return 1; }
    return 0;
  }
  async call(...args: unknown[]): Promise<unknown> {
    const cmd = String(args[0]).toUpperCase();
    if (cmd === 'GET') return this.get(String(args[1]));
    if (cmd === 'SET') return this.set(String(args[1]), String(args[2]), ...args.slice(3));
    if (cmd === 'DEL') return this.del(...args.slice(1).map(String));
    if (cmd === 'INCR') {
      const cur = Number((await this.get(String(args[1]))) ?? '0');
      const next = cur + 1;
      await this.set(String(args[1]), String(next));
      return next;
    }
    if (cmd === 'EXPIRE') {
      const e = store.get(String(args[1]));
      if (e) e.expiresAt = now() + Number(args[2]) * 1000;
      return e ? 1 : 0;
    }
    return null;
  }
  on(): this { return this; }
  disconnect(): void { /* no-op */ }
}

// ───────────────── Pick implementation ─────────────────
export const redis: RedisLike = isMemoryMode
  ? new MemoryRedis()
  : (new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    }) as unknown as RedisLike);

if (isMemoryMode) {
  logger.info('💾 Using in-memory store (REDIS_URL=memory://)');
} else {
  (redis as unknown as Redis).on('connect', () => logger.info('✅ Redis (production) connected'));
  (redis as unknown as Redis).on('error', (err) => logger.error({ err }, '❌ Redis error'));
}

export const isUsingRealRedis = !isMemoryMode;

// ───────────────── High-level helpers ─────────────────
export async function acquireLock(key: string, ttlSeconds: number, value: string): Promise<boolean> {
  const result = await redis.set(key, value, 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

const RELEASE_SCRIPT = `if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) else return 0 end`;

export async function releaseLock(key: string, value: string): Promise<boolean> {
  const result = await redis.eval(RELEASE_SCRIPT, 1, key, value);
  return result === 1;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length) await redis.del(...keys);
}
