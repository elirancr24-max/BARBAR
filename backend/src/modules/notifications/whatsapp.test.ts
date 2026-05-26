import { describe, it, expect, vi } from 'vitest';

// Prisma is imported by whatsapp.ts (renderTemplate uses it). Mock it so we don't
// need a real DB connection in unit tests.
vi.mock('../../lib/prisma', () => ({
  prisma: {
    employee: {
      findUnique: vi.fn().mockResolvedValue({ messageTemplates: null }),
    },
  },
}));

import { buildWhatsAppUrl, templates, defaultTemplates } from './whatsapp';

function phoneFromUrl(url: string): string {
  const m = url.match(/wa\.me\/(\d+)\?/);
  return m ? m[1] : '';
}

describe('whatsapp · phone normalization (via buildWhatsAppUrl)', () => {
  it('normalizes Israeli local format 05X to 972 prefix', () => {
    const url = buildWhatsAppUrl('0505551234', 'hi');
    expect(phoneFromUrl(url)).toBe('972505551234');
  });

  it('strips non-digit characters from formatted numbers', () => {
    const url = buildWhatsAppUrl('+972-50-555-1234', 'hi');
    // '+972-50-555-1234' → digits '972505551234' (no leading 0 to rewrite)
    expect(phoneFromUrl(url)).toBe('972505551234');
  });

  it('keeps already-international 972 numbers intact', () => {
    const url = buildWhatsAppUrl('972505551234', 'hi');
    expect(phoneFromUrl(url)).toBe('972505551234');
  });

  it('strips spaces and parens', () => {
    const url = buildWhatsAppUrl('(050) 555 1234', 'hi');
    expect(phoneFromUrl(url)).toBe('972505551234');
  });

  it('URL-encodes the message text', () => {
    const url = buildWhatsAppUrl('0505551234', 'hello world & friends');
    expect(url).toContain('hello%20world%20%26%20friends');
  });
});

describe('whatsapp · template rendering (default templates)', () => {
  const baseCtx = {
    customerName: 'דני',
    customerPhone: '0505551234',
    serviceName: 'תספורת',
    employeeName: 'משה',
    businessName: 'TestBarber',
    startAt: new Date('2026-06-15T10:30:00Z'),
  };

  it('substitutes {customerName}, {serviceName}, {employeeName}, {businessName}', () => {
    const out = templates.confirm(baseCtx);
    expect(out).toContain('דני');
    expect(out).toContain('תספורת');
    expect(out).toContain('משה');
    expect(out).toContain('TestBarber');
    // No raw placeholder tokens should remain
    expect(out).not.toMatch(/\{customerName\}/);
    expect(out).not.toMatch(/\{serviceName\}/);
  });

  it('substitutes {dateTime} with a formatted date string (no placeholder left)', () => {
    const out = templates.reminder(baseCtx);
    expect(out).not.toMatch(/\{dateTime\}/);
    // Should contain at least one digit from the formatted date
    expect(out).toMatch(/\d/);
  });

  it('substitutes optional {reviewLink} when provided', () => {
    const out = templates.reviewRequest({
      ...baseCtx,
      reviewLink: 'https://example.com/r/abc',
    });
    expect(out).toContain('https://example.com/r/abc');
    expect(out).not.toMatch(/\{reviewLink\}/);
  });

  it('exposes a default template for every TemplateKey', () => {
    const keys: (keyof typeof defaultTemplates)[] = [
      'confirm', 'reminder', 'cancel', 'change',
      'newBookingToBarber', 'reviewRequest', 'slotAvailable',
    ];
    for (const k of keys) {
      expect(typeof defaultTemplates[k]).toBe('string');
      expect(defaultTemplates[k].length).toBeGreaterThan(0);
    }
  });
});
