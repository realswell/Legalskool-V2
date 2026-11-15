import { useState } from 'react';
import hero from '../assets/hero-notes.webp';
import { CheckoutSheet } from '../components/CheckoutSheet';
import { SamplePreview } from '../components/SamplePages';
import { StickyBuy } from '../components/Shell';
import { mapper, notesInside, products } from '../content';
import type { PublicConfig } from '../lib/catalog';

export function NotesPage({ config, onVerified }: { config: PublicConfig; onVerified: (result: { email: string; products: string[]; paymentId: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const price = config.prices.notes;
  const rows = mapper.filter((row) => `${row.act} ${row.oldSec} ${row.newSec} ${row.note}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="pb-24">
      <section className="bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 lg:grid-cols-2">
          <div>
            <p className="inline-flex rounded-full bg-leaf/20 px-3 py-1 text-xs font-semibold text-emerald-200">4.9★ · 600+ sold</p>
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-6xl">{products.notes.headline}</h1>
            <p className="mt-4 text-slate-300">{products.notes.lede}</p>
            <button type="button" onClick={() => setOpen(true)} className="thumb-cta mt-6 rounded-full bg-ember px-6 font-semibold text-ink">Get Instant Access — ₹{price}</button>
          </div>
          <img src={hero} alt="Three volumes of BNS, BNSS and BSA notes" width={960} height={720} fetchPriority="high" decoding="async" className="rounded-3xl" />
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <h2 className="font-display text-3xl">What is inside</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {notesInside.map((item) => <li key={item} className="rounded-2xl bg-white px-4 py-3">{item}</li>)}
        </ul>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-12">
        <h2 className="font-display text-3xl">Sample pages</h2>
        <p className="mt-2 text-sm text-slate-600">Three watermarked pages. The full chart stays locked until the payment is verified.</p>
        <div className="mt-4">
          <SamplePreview index={preview} onOpen={setPreview} onClose={() => setPreview(null)} />
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-4 pb-12">
        <div className="rounded-3xl bg-white p-5">
          <h2 className="font-display text-3xl">Old to new lookup</h2>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search murder, bail, 420, 65B" className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-3" />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-xs uppercase text-slate-500"><th className="py-2">Code</th><th>Old</th><th>New</th><th>Note</th></tr></thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.newSec} className="border-t border-slate-100">
                    <td className="py-2 pr-3">{row.act}</td>
                    <td className="pr-3 line-through">{row.oldSec}</td>
                    <td className="pr-3 font-semibold">{row.newSec}</td>
                    <td>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <StickyBuy label={`Get Instant Access — ₹${price}`} onClick={() => setOpen(true)} />
      <CheckoutSheet
        open={open}
        productId="notes"
        title="New Criminal Laws Notes"
        priceLabel={`₹${price}`}
        value={price}
        bumpLabel={config.bumpEnabled ? `Exam Answer Writing & Case Law Cheat Sheet — ₹${config.prices.cheatsheet}` : undefined}
        onClose={() => setOpen(false)}
        onVerified={onVerified}
      />
    </div>
  );
}
