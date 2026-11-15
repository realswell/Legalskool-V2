type PixelParams = Record<string, string | number | string[] | undefined>;

const queue: Array<[string, PixelParams, string?]> = [];

function readCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

export function metaContext() {
  const params = new URLSearchParams(window.location.search);
  const stored = readUtm();
  return {
    fbp: readCookie('_fbp'),
    fbc: readCookie('_fbc'),
    utm_source: params.get('utm_source') || stored.utm_source || '',
    utm_medium: params.get('utm_medium') || stored.utm_medium || '',
    utm_campaign: params.get('utm_campaign') || stored.utm_campaign || '',
    utm_content: params.get('utm_content') || stored.utm_content || '',
    utm_term: params.get('utm_term') || stored.utm_term || '',
  };
}

export function rememberUtm() {
  const params = new URLSearchParams(window.location.search);
  const next = readUtm();
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const) {
    const value = params.get(key);
    if (value) next[key] = value.slice(0, 120);
  }
  if (Object.values(next).some(Boolean)) sessionStorage.setItem('ls_utm', JSON.stringify(next));
}

function readUtm(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem('ls_utm') || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

export function ensurePixel(pixelId: string) {
  if (!pixelId || window.__lsPixelReady) return;
  const boot = (window.fbq = window.fbq || function fbqStub(...args: unknown[]) {
    const stub = boot as typeof boot & { queue?: unknown[][] };
    stub.queue = stub.queue || [];
    stub.queue.push(args);
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
  window.fbq('init', pixelId);
  window.__lsPixelReady = true;
  for (const [event, params, eventId] of queue.splice(0)) {
    window.fbq?.('track', event, params, eventId ? { eventID: eventId } : undefined);
  }
}

export function track(event: string, params: PixelParams = {}, eventId?: string) {
  if (typeof window.fbq === 'function' && window.__lsPixelReady) {
    window.fbq('track', event, params, eventId ? { eventID: eventId } : undefined);
    return;
  }
  queue.push([event, params, eventId]);
}

export function sendPurchaseBeacon(body: Record<string, string>) {
  const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
  if (navigator.sendBeacon?.('/api/webhook/lead-and-purchase', blob)) return;
  void fetch('/api/webhook/lead-and-purchase', { method: 'POST', body: blob, keepalive: true });
}
