export interface PublicConfig {
  paymentsEnabled: boolean;
  razorpayKeyId: string;
  pixelId: string;
  prices: { notes: number; aivakeel: number; cheatsheet: number; acceleration: number };
  bumpEnabled: boolean;
  upsellEnabled: boolean;
}

export const fallbackConfig: PublicConfig = {
  paymentsEnabled: false,
  razorpayKeyId: '',
  pixelId: '',
  prices: { notes: 499, aivakeel: 1499, cheatsheet: 149, acceleration: 999 },
  bumpEnabled: true,
  upsellEnabled: true,
};

export async function loadPublicConfig() {
  const response = await fetch('/api/public-config', { cache: 'no-store' });
  if (!response.ok) return fallbackConfig;
  const data = (await response.json()) as Partial<PublicConfig>;
  return {
    ...fallbackConfig,
    ...data,
    prices: { ...fallbackConfig.prices, ...(data.prices || {}) },
  };
}

export interface ServerOrder {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  description: string;
  productIds: string[];
}

export async function createServerOrder(body: Record<string, unknown>) {
  const response = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Partial<ServerOrder> & { error?: string; message?: string };
  if (!response.ok || !data.orderId) {
    throw new Error(data.error === 'payments_not_configured' ? 'Payments are not configured.' : data.message || 'Could not start the payment.');
  }
  return data as ServerOrder;
}
