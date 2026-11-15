import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase, isInAppBrowser } from '../lib/supabase';

interface Student {
  name: string;
  email: string;
  phone: string;
  products: string;
  razorpay_payment_id: string;
  utm_source: string;
}

interface Settings {
  prices: Record<string, number>;
  bumpEnabled: boolean;
  upsellEnabled: boolean;
  pixelId: string;
  razorpayKeyId: string;
  crmWebhookUrl: string;
  capiConfigured: boolean;
}

function rupees(paise: number) {
  return paise / 100;
}

export function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [passkey, setPasskey] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [capiToken, setCapiToken] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const inApp = isInAppBrowser();

  useEffect(() => {
    const supabase = getSupabase();
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  function headers() {
    return {
      authorization: `Bearer ${session?.access_token || ''}`,
      'x-admin-passkey': passkey,
      'content-type': 'application/json',
    };
  }

  async function unlock(event: FormEvent) {
    event.preventDefault();
    const response = await fetch('/api/admin/settings', { headers: headers() });
    if (!response.ok) {
      setUnlocked(false);
      setMessage('This account is not an admin, or the passkey was refused.');
      return;
    }
    setSettings((await response.json()) as Settings);
    const buyers = await fetch('/api/admin/students', { headers: headers() });
    if (buyers.ok) setStudents(((await buyers.json()) as { students: Student[] }).students);
    setUnlocked(true);
    setMessage('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    const prices: Record<string, number> = {};
    for (const [key, paise] of Object.entries(settings.prices)) prices[key] = rupees(paise);
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        prices,
        bumpEnabled: settings.bumpEnabled,
        upsellEnabled: settings.upsellEnabled,
        pixelId: settings.pixelId,
        razorpayKeyId: settings.razorpayKeyId,
        crmWebhookUrl: settings.crmWebhookUrl,
        capiToken: capiToken || undefined,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(response.ok ? 'Saved.' : body.message || 'Could not save.');
    setCapiToken('');
  }

  async function downloadCsv() {
    const response = await fetch('/api/admin/students.csv', { headers: headers() });
    if (!response.ok) {
      setMessage('The export was refused.');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'legalskool-buyers.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-4xl">Admin</h1>
      <p className="mt-2 text-sm text-slate-600">Sign in with an admin email, then enter the passkey. Neither value is shipped in the page bundle.</p>
      {!session ? (
        <form className="mt-6 max-w-md space-y-3" onSubmit={(event) => {
          event.preventDefault();
          void getSupabase().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/admin` } }).then(({ error }) => {
            setMessage(error ? error.message : 'Code sent.');
          });
        }}>
          <label className="block text-sm font-medium">Admin email
            <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3" />
          </label>
          <button className="thumb-cta w-full rounded-full bg-ink font-semibold text-paper" type="submit">Email me a code</button>
          <label className="block text-sm font-medium">Code
            <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} className="mt-1 w-full rounded-xl border px-3 py-3 font-mono" />
          </label>
          <button type="button" className="w-full rounded-full border py-3 text-sm font-semibold" onClick={() => void getSupabase().auth.verifyOtp({ email, token: code, type: 'email' }).then(({ error }) => setMessage(error ? error.message : ''))}>Verify code</button>
          {inApp ? null : <button type="button" className="w-full rounded-full border py-3 text-sm" onClick={() => void getSupabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/admin` } })}>Google</button>}
        </form>
      ) : null}
      {session && !unlocked ? (
        <form onSubmit={(event) => void unlock(event)} className="mt-6 max-w-md space-y-3">
          <p className="text-sm">Signed in as {session.user.email}</p>
          <label className="block text-sm font-medium">Passkey
            <input type="password" autoComplete="current-password" required value={passkey} onChange={(event) => setPasskey(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3" />
          </label>
          <button className="thumb-cta w-full rounded-full bg-ember font-semibold" type="submit">Check access</button>
        </form>
      ) : null}
      {unlocked && settings ? (
        <div className="mt-8 space-y-8">
          <form onSubmit={(event) => void save(event)} className="grid gap-3 rounded-3xl bg-white p-5 md:grid-cols-2">
            {Object.entries(settings.prices).map(([key, paise]) => (
              <label key={key} className="text-sm font-medium">{key} price in ₹
                <input type="number" min={1} value={rupees(paise)} onChange={(event) => setSettings({ ...settings, prices: { ...settings.prices, [key]: Math.round(Number(event.target.value) * 100) } })} className="mt-1 w-full rounded-xl border px-3 py-3" />
              </label>
            ))}
            <label className="text-sm font-medium">Razorpay Key Id (from the Worker secret)
              <input readOnly value={settings.razorpayKeyId} className="mt-1 w-full rounded-xl border bg-slate-50 px-3 py-3 font-mono" />
            </label>
            <label className="text-sm font-medium">Meta Pixel Id
              <input value={settings.pixelId} onChange={(event) => setSettings({ ...settings, pixelId: event.target.value })} className="mt-1 w-full rounded-xl border px-3 py-3 font-mono" />
            </label>
            <label className="text-sm font-medium md:col-span-2">CRM webhook URL
              <input value={settings.crmWebhookUrl} onChange={(event) => setSettings({ ...settings, crmWebhookUrl: event.target.value })} className="mt-1 w-full rounded-xl border px-3 py-3" />
            </label>
            <label className="text-sm font-medium md:col-span-2">Meta CAPI token {settings.capiConfigured ? '(already set)' : ''}
              <input type="password" value={capiToken} onChange={(event) => setCapiToken(event.target.value)} placeholder="Leave blank to keep the current token" className="mt-1 w-full rounded-xl border px-3 py-3" />
            </label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.bumpEnabled} onChange={(event) => setSettings({ ...settings, bumpEnabled: event.target.checked })} /> Offer the ₹149 cheat sheet bump</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.upsellEnabled} onChange={(event) => setSettings({ ...settings, upsellEnabled: event.target.checked })} /> Offer the acceleration bundle</label>
            <button className="thumb-cta rounded-full bg-ink font-semibold text-paper md:col-span-2" type="submit">Save settings</button>
          </form>
          <section>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Buyers</h2>
              <button type="button" onClick={() => void downloadCsv()} className="rounded-full bg-ember px-4 py-2 text-sm font-semibold">Export CSV</button>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="text-xs uppercase text-slate-500"><th>Name</th><th>Email</th><th>Phone</th><th>Products</th><th>Payment</th><th>UTM source</th></tr></thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.email} className="border-t">
                      <td className="py-2 pr-3">{student.name}</td>
                      <td className="pr-3">{student.email}</td>
                      <td className="pr-3">{student.phone}</td>
                      <td className="pr-3">{student.products}</td>
                      <td className="pr-3">{student.razorpay_payment_id}</td>
                      <td>{student.utm_source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
      <p className="mt-4 text-sm" role="status">{message}</p>
    </div>
  );
}
