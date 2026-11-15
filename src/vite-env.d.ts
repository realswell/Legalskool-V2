/// <reference types="vite/client" />

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailed {
  error?: { description?: string };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: RazorpayFailed) => void) => void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  redirect: boolean;
  callback_url: string;
  webview_intent: boolean;
  prefill: { name: string; email: string; contact: string };
  retry: { enabled: boolean; max_count: number };
  theme: { color: string };
  modal: {
    confirm_close: boolean;
    escape: boolean;
    ondismiss: () => void;
  };
  config: {
    display: {
      blocks: Record<string, { name: string; instruments: Array<{ method: string; flows?: string[] }> }>;
      sequence: string[];
      preferences: { show_default_blocks: boolean };
    };
  };
  handler: (response: RazorpaySuccess) => void;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

interface Window {
  Razorpay?: RazorpayConstructor;
  fbq?: (...args: unknown[]) => void;
  __lsPixelReady?: boolean;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
