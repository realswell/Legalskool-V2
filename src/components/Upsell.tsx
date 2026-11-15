interface Props {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function Upsell({ open, onAccept, onDecline }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/80 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="upsell-title">
      <div className="w-full max-w-lg rounded-3xl bg-paper p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-leaf">Payment verified</p>
        <h2 id="upsell-title" className="mt-1 font-display text-3xl">Complete Legal Acceleration Bundle</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Add the notes, the AI Vakeel masterclass, and the exam cheat sheet you do not already have, for ₹999. This price is set on the server and is offered once after a verified payment.
        </p>
        <ul className="mt-4 space-y-1 text-sm">
          <li>BNS, BNSS and BSA notes</li>
          <li>AI Vakeel week, prompts, and certificate</li>
          <li>Exam answer writing and case-law cheat sheet</li>
        </ul>
        <button type="button" onClick={onAccept} className="thumb-cta mt-5 w-full rounded-full bg-ember font-semibold text-ink">Add the bundle — ₹999</button>
        <button type="button" onClick={onDecline} className="mt-3 w-full py-2 text-sm text-slate-600">No thanks, open Campus</button>
      </div>
    </div>
  );
}
