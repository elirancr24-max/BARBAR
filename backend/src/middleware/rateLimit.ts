import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis, isUsingRealRedis } from '../lib/redis';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withStore(): Record<string, any> {
  if (!isUsingRealRedis) return {}; // default memory store
  return {
    store: new RedisStore({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sendCommand: (...args: string[]) => (redis as any).call(...args),
    }),
  };
}

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY', message: 'יותר מדי בקשות, נסה שוב בעוד דקה' } },
  ...withStore(),
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY', message: 'יותר מדי ניסיונות, נסה שוב בעוד דקה' } },
  ...withStore(),
});
