import { Link } from 'react-router-dom';
import hero from '../assets/hero-notes.webp';
import { faqs, products, testimonials } from '../content';

export function Home() {
  return (
    <div>
      <section className="bg-ink text-paper">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold text-ember">600+ students enrolled</p>
            <h1 className="mt-2 font-display text-4xl leading-tight sm:text-6xl">The court-safe school for Indian lawyers.</h1>
            <p className="mt-4 max-w-xl text-slate-300">New Criminal Laws notes for ₹499. AI Vakeel for ₹1,499. Unlock once. Lifetime access on Campus. 7-day refund.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/notes" className="thumb-cta rounded-full bg-ember px-5 py-3 text-center font-semibold text-ink">NCL Notes · ₹499</Link>
              <Link to="/aivakeel" className="thumb-cta rounded-full border border-white/20 px-5 py-3 text-center font-semibold">AI Vakeel · ₹1,499</Link>
            </div>
          </div>
          <img src={hero} alt="LegalSkool notes for BNS, BNSS and BSA" width={960} height={720} fetchPriority="high" decoding="async" className="rounded-3xl" />
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ember">₹{products.notes.price}</p>
          <h2 className="mt-2 font-display text-3xl">{products.notes.name}</h2>
          <p className="mt-2 text-sm text-slate-600">{products.notes.lede}</p>
          <Link to="/notes" className="mt-4 inline-flex thumb-cta items-center rounded-full bg-ink px-4 font-semibold text-paper">See the notes</Link>
        </article>
        <article className="rounded-3xl bg-ink p-6 text-paper">
          <p className="text-xs font-semibold uppercase tracking-wide text-ember">₹{products.aivakeel.price}</p>
          <h2 className="mt-2 font-display text-3xl">{products.aivakeel.name}</h2>
          <p className="mt-2 text-sm text-slate-300">{products.aivakeel.lede}</p>
          <Link to="/aivakeel" className="mt-4 inline-flex thumb-cta items-center rounded-full bg-ember px-4 font-semibold text-ink">See the week</Link>
        </article>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="font-display text-3xl">From chambers and classrooms</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {testimonials.map((item) => (
            <figure key={item.name} className="rounded-3xl border border-slate-200 bg-white p-5">
              <blockquote className="text-sm leading-relaxed">“{item.quote}”</blockquote>
              <figcaption className="mt-3 text-sm font-semibold">{item.name} · {item.place}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <h2 className="font-display text-3xl">Questions</h2>
        <div className="mt-4 space-y-3">
          {faqs.map(([question, answer]) => (
            <details key={question} className="rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer font-semibold">{question}</summary>
              <p className="mt-2 text-sm text-slate-600">{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
