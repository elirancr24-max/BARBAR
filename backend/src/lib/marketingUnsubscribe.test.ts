import { describe, it, expect } from 'vitest';
import { makeUnsubscribeToken, verifyUnsubscribeToken } from './marketingUnsubscribe';

describe('marketingUnsubscribe', () => {
  it('round-trips a valid token', () => {
    const token = makeUnsubscribeToken('customer-id-1');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    const result = verifyUnsubscribeToken(token);
    expect(result).not.toBeNull();
    expect(result?.customerId).toBe('customer-id-1');
  });

  it('returns null for garbage input', () => {
    expect(verifyUnsubscribeToken('not-a-real-token')).toBeNull();
    expect(verifyUnsubscribeToken('')).toBeNull();
    expect(verifyUnsubscribeToken('aaa.bbb.ccc')).toBeNull();
  });
});
