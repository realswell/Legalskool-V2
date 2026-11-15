import { useState } from 'react';
import hero from '../assets/hero-ai.webp';
import { CheckoutSheet } from '../components/CheckoutSheet';
import { StickyBuy } from '../components/Shell';
import { aiInside, days, products, truthCards } from '../content';
import type { PublicConfig } from '../lib/catalog';

export function AiPage({ config, onVerified }: { config: PublicConfig; onVerified: (result: { email: string; products: string[]; paymentId: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const price = config.prices.aivakeel;
  const day = days[active];
  return (
    <div className="pb-24">
      <section className="bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-ember">{products.aivakeel.eyebrow}</p>
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-6xl">{products.aivakeel.headline}</h1>
            <p className="mt-4 text-slate-300">{products.aivakeel.lede}</p>
            <button type="button" onClick={() => setOpen(true)} className="thumb-cta mt-6 rounded-full bg-ember px-6 font-semibold text-ink">Get Instant Access — ₹{price}</button>
            <p className="mt-3 text-xs text-slate-400">Instant access · ebook · 8 videos · 100 prompts · 7-day refund</p>
          </div>
          <img src={hero} alt="AI Vakeel: anonymise, verify, and own the draft" width={960} height={720} fetchPriority="high" decoding="async" className="rounded-3xl" />
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="font-display text-3xl">One week. About 5.5 hours.</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            {days.map((item, index) => (
              <button type="button" key={item.day} onClick={() => setActive(index)} className={`w-full rounded-2xl px-4 py-3 text-left ${index === active ? 'bg-ink text-paper' : 'bg-white'}`}>
                <span className="text-xs text-ember">{item.day}</span>
                <span className="mt-1 block font-semibold">{item.title}</span>
              </button>
            ))}
          </div>
          <article className="rounded-3xl bg-ink p-6 text-paper lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs uppercase tracking-wide text-ember">{day.day}</p>
            <h3 className="mt-2 font-display text-3xl">{day.title}</h3>
            <p className="mt-3 text-sm text-slate-300">{day.detail}</p>
          </article>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 pb-12">
        <h2 className="font-display text-3xl">Try the Citation Truth Test™</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {truthCards.map((card) => (
            <article key={card.id} className="rounded-3xl bg-white p-4">
              <h3 className="text-sm font-semibold">{card.citation}</h3>
              <p className="mt-2 text-xs text-slate-600">{card.detail}</p>
              {checked[card.id] ? <p className="mt-3 text-sm">{card.why}</p> : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" className="rounded-xl bg-ink py-2 text-xs text-paper" onClick={() => setChecked((current) => ({ ...current, [card.id]: true }))}>Flag as fake</button>
                  <button type="button" className="rounded-xl border py-2 text-xs" onClick={() => setChecked((current) => ({ ...current, [card.id]: true }))}>Keep it</button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-12">
        <h2 className="font-display text-3xl">What you get</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {aiInside.map((item) => <li key={item} className="rounded-2xl bg-white px-4 py-3">{item}</li>)}
        </ul>
      </section>
      <StickyBuy label={`Get Instant Access — ₹${price}`} onClick={() => setOpen(true)} />
      <CheckoutSheet
        open={open}
        productId="aivakeel"
        title="AI Vakeel Masterclass"
        priceLabel={`₹${price}`}
        value={price}
        bumpLabel={config.bumpEnabled ? `Exam Answer Writing & Case Law Cheat Sheet — ₹${config.prices.cheatsheet}` : undefined}
        onClose={() => setOpen(false)}
        onVerified={onVerified}
      />
    </div>
  );
}
