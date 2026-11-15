import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { createServerOrder, type ServerOrder } from '../lib/catalog';
import { metaContext, sendPurchaseBeacon, track } from '../lib/meta';
import { getSupabase } from '../lib/supabase';

const detailsSchema = z.object({
  name: z.string().trim().min(2, 'Enter the name for this seat.').max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number.'),
  email: z.string().trim().email('Enter a valid email.'),
  bump: z.boolean(),
});

export type CheckoutProduct = 'notes' | 'aivakeel' | 'acceleration';

interface Props {
  open: boolean;
  productId: CheckoutProduct;
  title: string;
  priceLabel: string;
  value: number;
  bumpLabel?: string;
  onClose: () => void;
  onVerified: (result: { email: string; products: string[]; paymentId: string }) => void;
}

function upiOptions(order: ServerOrder, details: z.infer<typeof detailsSchema>, hooks: {
  onSuccess: (response: RazorpaySuccess) => void;
  onFailed: (message: string) => void;
  onDismiss: () => void;
}) {
  const Razorpay = window.Razorpay;
  if (!Razorpay) return false;
  const rzp = new Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency || 'INR',
    name: 'LegalSkool',
    description: order.description,
    order_id: order.orderId,
    redirect: true,
    callback_url: `${window.location.origin}/pay/callback`,
    webview_intent: true,
    prefill: {
      name: details.name,
      email: details.email,
      contact: `+91${details.phone}`,
    },
    retry: { enabled: true, max_count: 3 },
    theme: { color: '#090D16' },
    modal: {
      confirm_close: true,
      escape: false,
      ondismiss: hooks.onDismiss,
    },
    config: {
      display: {
        blocks: {
          upi: { name: 'UPI', instruments: [{ method: 'upi', flows: ['intent', 'collect', 'qr'] }] },
          card: { name: 'Card', instruments: [{ method: 'card' }] },
          netbanking: { name: 'Netbanking', instruments: [{ method: 'netbanking' }] },
          wallet: { name: 'Wallet', instruments: [{ method: 'wallet' }] },
        },
        sequence: ['block.upi', 'block.card', 'block.netbanking', 'block.wallet'],
        preferences: { show_default_blocks: false },
      },
    },
    handler: hooks.onSuccess,
  });
  rzp.on('payment.failed', (response) => {
    hooks.onFailed(response.error?.description || 'The payment did not go through.');
  });
  rzp.open();
  return true;
}

export function CheckoutSheet({ open, productId, title, priceLabel, value, bumpLabel, onClose, onVerified }: Props) {
  const [step, setStep] = useState<'details' | 'review'>('details');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bump, setBump] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const orderRef = useRef<ServerOrder | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    if (!open) return;
    setStep('details');
    setError('');
    setFailed(false);
    orderRef.current = null;
    const context = metaContext();
    track('InitiateCheckout', {
      content_ids: [productId],
      content_type: 'product',
      currency: 'INR',
      value,
      ...context,
    });
  }, [open, productId, value]);

  async function prepareOrder(details: z.infer<typeof detailsSchema>) {
    const ticket = ++generation.current;
    setStatus('Reserving your Razorpay order…');
    try {
      const context = metaContext();
      const order = await createServerOrder({
        productId,
        bump: details.bump,
        name: details.name,
        email: details.email,
        phone: details.phone,
        ...context,
      });
      if (ticket !== generation.current) return null;
      orderRef.current = order;
      setStatus('');
      return order;
    } catch (cause) {
      if (ticket !== generation.current) return null;
      orderRef.current = null;
      setStatus('');
      setError(cause instanceof Error ? cause.message : 'Could not start the payment.');
      return null;
    }
  }

  useEffect(() => {
    if (!open) return;
    const parsed = detailsSchema.safeParse({ name, phone, email, bump });
    if (!parsed.success) {
      generation.current += 1;
      orderRef.current = null;
      return;
    }
    const timer = window.setTimeout(() => {
      void prepareOrder(parsed.data);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [open, name, phone, email, bump, productId]);

  function parsedDetails() {
    const parsed = detailsSchema.safeParse({ name, phone, email, bump });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check the form.');
      return null;
    }
    setError('');
    return parsed.data;
  }

  async function verify(response: RazorpaySuccess) {
    setStatus('Confirming the payment…');
    setFailed(false);
    const context = metaContext();
    const result = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...response, fbp: context.fbp, fbc: context.fbc }),
    });
    const data = (await result.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
      email?: string;
      products?: string[];
      paymentId?: string;
      amount?: number;
      session?: { token_hash?: string; otp_type?: 'magiclink' | 'email' };
    };
    if (!result.ok || !data.ok || !data.paymentId) {
      setStatus('');
      setError(data.message || 'The payment could not be verified. The course stays locked.');
      return;
    }
    sendPurchaseBeacon({
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
      fbp: context.fbp,
      fbc: context.fbc,
    });
    track('Purchase', {
      content_ids: data.products || [],
      content_type: 'product',
      currency: 'INR',
      value: (data.amount || 0) / 100,
    }, data.paymentId);
    if (data.session?.token_hash) {
      const { error: authError } = await getSupabase().auth.verifyOtp({
        token_hash: data.session.token_hash,
        type: data.session.otp_type || 'magiclink',
      });
      if (authError) {
        setStatus('');
        setError('Payment is verified. Sign in on Campus with the same email to open the files.');
        return;
      }
    }
    setStatus('');
    onVerified({ email: data.email || email, products: data.products || [], paymentId: data.paymentId });
  }

  function openCheckout(order: ServerOrder, details: z.infer<typeof detailsSchema>) {
    return upiOptions(order, details, {
      onSuccess: (response) => {
        void verify(response);
      },
      onFailed: (message) => {
        setFailed(true);
        setError(message);
      },
      onDismiss: () => setStatus(''),
    });
  }

  function pay() {
    const details = parsedDetails();
    if (!details) return;
    const ready = orderRef.current;
    if (ready && openCheckout(ready, details)) return;
    setStatus(ready ? 'Loading the payment window…' : 'Creating the order…');
    void (ready ? Promise.resolve(ready) : prepareOrder(details)).then((order) => {
      if (!order) return;
      let tries = 0;
      const timer = window.setInterval(() => {
        tries += 1;
        if (openCheckout(order, details) || tries >= 8) {
          window.clearInterval(timer);
          setStatus('');
          if (typeof window.Razorpay !== 'function') {
            setError('The payment script is still loading. Tap Pay again.');
          }
        }
      }, 150);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/70 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <form
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-paper p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === 'details') {
            if (parsedDetails()) setStep('review');
            return;
          }
          pay();
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ember">Razorpay · {step === 'details' ? 'Step 1 of 2' : 'Step 2 of 2'}</p>
            <h2 id="checkout-title" className="font-display text-2xl">{title}</h2>
          </div>
          <button type="button" className="rounded-full px-3 py-2 text-sm" onClick={onClose}>Close</button>
        </div>
        {step === 'details' ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium">
              Full name
              <input name="name" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" />
            </label>
            <label className="block text-sm font-medium">
              WhatsApp number
              <input name="tel" inputMode="numeric" autoComplete="tel" pattern="[6-9][0-9]{9}" required value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" />
            </label>
            <label className="block text-sm font-medium">
              Email
              <input name="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3" />
            </label>
            {bumpLabel ? (
              <label className="flex items-start gap-3 rounded-2xl border border-ember/40 bg-amber-50 p-3 text-sm">
                <input type="checkbox" className="mt-1" checked={bump} onChange={(event) => setBump(event.target.checked)} />
                <span>{bumpLabel}</span>
              </label>
            ) : null}
            <button type="submit" className="thumb-cta w-full rounded-full bg-ember font-semibold text-ink">Continue</button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="rounded-2xl bg-white p-4 text-sm">
              {name}<br />+91 {phone}<br />{email}
            </p>
            <p className="font-display text-3xl">{priceLabel}{bump ? ' + cheat sheet' : ''}</p>
            <p className="text-sm text-slate-600">The amount is set on the server. Access opens only after the payment signature is checked.</p>
            {failed ? (
              <button type="submit" className="thumb-cta w-full rounded-full bg-leaf font-semibold text-white">Retry via UPI / QR / Card</button>
            ) : (
              <button type="submit" className="thumb-cta w-full rounded-full bg-ember font-semibold text-ink">Pay with UPI</button>
            )}
            <button type="button" className="w-full py-2 text-sm text-slate-600" onClick={() => setStep('details')}>Edit details</button>
          </div>
        )}
        <p className="mt-3 min-h-6 text-sm" role="status" aria-live="polite">{error || status}</p>
      </form>
    </div>
  );
}
