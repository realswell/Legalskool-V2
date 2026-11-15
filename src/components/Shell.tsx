import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { SUPPORT_EMAIL } from '../content';

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="font-display text-lg font-semibold">LegalSkool</Link>
          <nav className="flex items-center gap-3 text-sm">
            <NavLink to="/notes" className="hidden sm:inline">Notes · ₹499</NavLink>
            <NavLink to="/aivakeel" className="hidden sm:inline">AI Vakeel</NavLink>
            <NavLink to="/campus" className="rounded-full bg-ember px-3 py-2 font-semibold text-ink">Campus</NavLink>
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-slate-200 px-4 py-10 text-sm text-slate-600">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:justify-between">
          <p>Court-safe training for Indian lawyers. Educational only. Not a licence to practise.</p>
          <p>Support: {SUPPORT_EMAIL}</p>
        </div>
        <p className="mx-auto mt-4 max-w-6xl text-xs">Not affiliated with the Bar Council of India, any court, or any government body. 7-day full refund on digital products.</p>
      </footer>
    </div>
  );
}

export function StickyBuy({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <button type="button" onClick={onClick} className="thumb-cta w-full rounded-full bg-ember font-semibold text-ink">
        {label}
      </button>
    </div>
  );
}
