import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwt';

describe('jwt helpers', () => {
  const payload = { sub: 'user-1', role: 'CUSTOMER' as const, email: 'a@b.com' };

  it('signs and verifies an access token round-trip', () => {
    const token = signAccessToken(payload);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // header.payload.sig

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.role).toBe('CUSTOMER');
    expect(decoded.email).toBe('a@b.com');
  });

  it('signs and verifies a refresh token round-trip', () => {
    const token = signRefreshToken({ sub: 'user-1' });
    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe('user-1');
  });

  it('rejects a tampered access token', () => {
    const token = signAccessToken(payload);
    const tampered = token.slice(0, -2) + (token.endsWith('A') ? 'BB' : 'AA');
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it('rejects an access token signed with the refresh secret', () => {
    const wrong = signRefreshToken({ sub: 'user-1' });
    expect(() => verifyAccessToken(wrong)).toThrow();
  });
});
