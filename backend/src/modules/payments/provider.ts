import { env } from '../../config/env';

export interface ChargeInput {
  appointmentId: string;
  amountAgorot: number;
  customerEmail: string;
  customerPhone: string;
  description: string;
}

export interface ChargeResult {
  ok: boolean;
  providerRef: string;
  redirectUrl?: string;
}

export interface PaymentProvider {
  name: string;
  charge(input: ChargeInput): Promise<ChargeResult>;
  refund(ref: string): Promise<{ ok: boolean }>;
}

const mockProvider: PaymentProvider = {
  name: 'mock',
  async charge(input) {
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true, providerRef: `mock_${input.appointmentId}_${Date.now()}` };
  },
  async refund() {
    return { ok: true };
  },
};

const tranzilaProvider: PaymentProvider = {
  name: 'tranzila',
  async charge(input) {
    // Real integration would POST to tranzila iframe / API.
    // Here we just construct a redirect URL skeleton.
    const url = new URL('https://direct.tranzila.com/' + (env.TRANZILA_TERMINAL || 'terminal'));
    url.searchParams.set('sum', (input.amountAgorot / 100).toFixed(2));
    url.searchParams.set('currency', '1');
    url.searchParams.set('cred_type', '1');
    url.searchParams.set('lang', 'il');
    url.searchParams.set('contact', input.customerEmail);
    url.searchParams.set('orderid', input.appointmentId);
    return { ok: true, providerRef: `tranzila_pending_${input.appointmentId}`, redirectUrl: url.toString() };
  },
  async refund() {
    return { ok: true };
  },
};

export function getPaymentProvider(): PaymentProvider {
  return env.PAYMENT_PROVIDER === 'tranzila' ? tranzilaProvider : mockProvider;
}
