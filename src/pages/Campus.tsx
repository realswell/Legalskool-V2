import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { days, SUPPORT_EMAIL } from '../content';
import { getSupabase, isInAppBrowser } from '../lib/supabase';

interface Access {
  email: string;
  name: string;
  products: string[];
  contentConfigured: boolean;
  content: Record<string, { whatsapp?: string; items?: Array<{ id: string; title?: string; url?: string }>; lessons?: string[] }>;
}

export function Campus() {
  const [params, setParams] = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [dark, setDark] = useState(() => localStorage.getItem('ls-theme') === 'dark');
  const inApp = isInAppBrowser();

  useEffect(() => {
    const supabase = getSupabase();
    const token = params.get('token_hash');
    const type = params.get('otp_type') === 'email' ? 'email' : 'magiclink';
    if (token) {
      void supabase.auth.verifyOtp({ token_hash: token, type }).then(({ error }) => {
        if (error) setMessage(error.message);
        params.delete('token_hash');
        params.delete('otp_type');
        setParams(params, { replace: true });
      });
    }
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setAccess(null);
      return;
    }
    void fetch('/api/campus/access', {
      headers: { authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    }).then(async (response) => {
      if (!response.ok) {
        setMessage('Signed in, but Campus could not check this purchase.');
        return;
      }
      setAccess((await response.json()) as Access);
    });
  }, [session]);

  useEffect(() => {
    localStorage.setItem('ls-theme', dark ? 'dark' : 'light');
  }, [dark]);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/campus` },
    });
    setMessage(error ? error.message : 'Check your email for a 6-digit code.');
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    const { error } = await getSupabase().auth.verifyOtp({ email, token: code, type: 'email' });
    setMessage(error ? error.message : '');
  }

  async function passwordSignIn(event: FormEvent) {
    event.preventDefault();
    const { error } = await getSupabase().auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : '');
  }

  async function signUp(event: FormEvent) {
    event.preventDefault();
    const { error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/campus` },
    });
    setMessage(error ? error.message : 'Check your email to confirm the account.');
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/campus`,
    });
    setMessage(error ? error.message : 'Password reset email sent.');
  }

  async function google() {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/campus` },
    });
    if (error) setMessage(error.message);
  }

  const theme = dark ? 'bg-ink text-paper' : 'bg-paper text-ink';
  const whatsapp = Object.values(access?.content || {}).map((block) => block.whatsapp).find((url) => url?.startsWith('https://'));
  const items = Object.values(access?.content || {}).flatMap((block) => block.items || []);
  const lessons = access?.content.aivakeel?.lessons || [];

  return (
    <div className={`min-h-screen ${theme}`}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ember">Campus</p>
            <h1 className="font-display text-4xl">{session ? access?.name || session.user.email : 'Sign in'}</h1>
          </div>
          <button type="button" onClick={() => setDark((value) => !value)} className="rounded-full border border-current px-4 py-2 text-sm">
            {dark ? 'Light' : 'Dark'}
          </button>
        </div>
        {!session ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <form onSubmit={sendCode} className="rounded-3xl border border-slate-200 bg-white p-5 text-ink">
              <h2 className="font-display text-2xl">Email code</h2>
              <p className="mt-1 text-sm text-slate-600">{inApp ? 'Google does not run inside Instagram or Facebook. Use the email you paid with.' : 'Use the email from checkout.'}</p>
              <label className="mt-3 block text-sm font-medium">Email
                <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3" />
              </label>
              <button className="thumb-cta mt-3 w-full rounded-full bg-ember font-semibold" type="submit">Email me a code</button>
              <label className="mt-3 block text-sm font-medium">Code
                <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" className="mt-1 w-full rounded-xl border px-3 py-3 font-mono tracking-[0.3em]" />
              </label>
              <button className="mt-3 w-full rounded-full border py-3 text-sm font-semibold" type="button" onClick={(event) => void verifyCode(event)}>Verify code</button>
            </form>
            <form onSubmit={passwordSignIn} className="rounded-3xl border border-slate-200 bg-white p-5 text-ink">
              <h2 className="font-display text-2xl">Email and password</h2>
              <label className="mt-3 block text-sm font-medium">Email
                <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3" />
              </label>
              <label className="mt-3 block text-sm font-medium">Password
                <input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-3" />
              </label>
              <button className="thumb-cta mt-3 w-full rounded-full bg-ink font-semibold text-paper" type="submit">Sign in</button>
              <div className="mt-3 flex gap-3 text-sm">
                <button type="button" onClick={(event) => void signUp(event)}>Create account</button>
                <button type="button" onClick={(event) => void resetPassword(event)}>Reset password</button>
              </div>
              {inApp ? null : <button type="button" onClick={() => void google()} className="mt-4 w-full rounded-full border py-3 text-sm font-semibold">Continue with Google</button>}
            </form>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <p className="text-sm">{access?.products.length ? `Unlocked: ${access.products.join(', ')}` : `No purchase is linked to ${session.user.email} yet.`}</p>
            {access && !access.contentConfigured && access.products.length ? (
              <p className="text-sm">Your payment is verified. Course files are not connected yet. Email {SUPPORT_EMAIL} with your payment id.</p>
            ) : null}
            <section>
              <h2 className="font-display text-2xl">Downloads</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {items.filter((item) => item.url?.startsWith('https://')).map((item) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="rounded-2xl border border-current/20 px-4 py-4 font-semibold">{item.title || item.id}</a>
                ))}
                {!items.length ? <p className="text-sm">Files appear here after a verified purchase on this email.</p> : null}
              </div>
              {whatsapp ? <a className="thumb-cta mt-4 inline-flex items-center rounded-full bg-leaf px-5 font-semibold text-white" href={whatsapp} target="_blank" rel="noreferrer">Join WhatsApp community</a> : <button type="button" disabled className="thumb-cta mt-4 rounded-full bg-slate-400 px-5 font-semibold text-white">Join WhatsApp community</button>}
            </section>
            <section>
              <h2 className="font-display text-2xl">Video modules</h2>
              <ol className="mt-3 space-y-2">
                {days.map((day, index) => {
                  const lesson = lessons[index];
                  return (
                    <li key={day.day} className="rounded-2xl border border-current/15 px-4 py-3">
                      <p className="font-semibold">{day.day} · {day.title}</p>
                      <p className="text-sm opacity-80">{day.detail}</p>
                      {lesson?.startsWith('https://') ? <a className="mt-2 inline-block text-sm font-semibold text-ember" href={lesson} target="_blank" rel="noreferrer">Play module</a> : null}
                    </li>
                  );
                })}
              </ol>
            </section>
            <section className="rounded-3xl border border-current/15 p-5">
              <h2 className="font-display text-2xl">Account</h2>
              <p className="mt-2 text-sm">{session.user.email}</p>
              <button type="button" className="mt-3 rounded-full border px-4 py-2 text-sm" onClick={() => void getSupabase().auth.signOut()}>Sign out</button>
            </section>
          </div>
        )}
        <p className="mt-4 min-h-6 text-sm" role="status">{message}</p>
      </div>
    </div>
  );
}
