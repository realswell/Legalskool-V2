export const SUPPORT_EMAIL = 'legalskoolofficial@gmail.com';

export const products = {
  notes: {
    id: 'notes' as const,
    name: 'New Criminal Laws Simplified Notes',
    price: 499,
    strike: 999,
    eyebrow: 'In force 1 July 2024 · BNS · BNSS · BSA',
    headline: 'Master BNS, BNSS and BSA in 2 days, not months.',
    lede: 'Stop memorising 2,500+ pages of the new bare Acts. Section-by-section notes, old-to-new charts, and the drafts you actually file.',
  },
  aivakeel: {
    id: 'aivakeel' as const,
    name: 'AI Vakeel Masterclass',
    price: 1499,
    strike: 8999,
    eyebrow: 'Court-safe professional system',
    headline: 'From never-touched-AI to court-ready work — in one week.',
    lede: 'A follow-along masterclass for Indian law students and advocates. Research in 30 minutes. Draft only with verified citations. Build your own AI junior — on your phone, on free apps.',
  },
  cheatsheet: {
    id: 'cheatsheet' as const,
    name: 'Exam Answer Writing & Case Law Cheat Sheet',
    price: 149,
  },
  acceleration: {
    id: 'acceleration' as const,
    name: 'Complete Legal Acceleration Bundle',
    price: 999,
  },
};

export const days = [
  { day: 'Day 0', title: 'Setup & the Red Lines', detail: 'Free apps, privacy settings, and the three non-negotiable red lines: anonymise, verify, own.' },
  { day: 'Day 1', title: 'Research in 30 minutes', detail: 'Build the legal framework first, demand sources, and verify every authority on Indian Kanoon.' },
  { day: 'Day 2', title: 'The Citation Truth Test™', detail: 'Seven checks on a planted fake judgment, then a gauntlet of real and hallucinated citations.' },
  { day: 'Day 3', title: 'Draft a real notice or bail', detail: 'Brief first, clause by clause, then a style pass that removes robotic phrasing.' },
  { day: 'Day 4', title: 'Crush a 40-page judgment', detail: 'Facts, issues, held, and ratio. Quote only what you highlighted.' },
  { day: 'Day 5', title: 'Build your first AI Junior', detail: 'Custom instructions, bare-act knowledge, and a live test on phone and desktop.' },
  { day: 'Day 6', title: 'A live chamber file', detail: 'Run the week on one anonymised matter from research to a filing checklist.' },
  { day: 'Day 7', title: 'Exam and certificate', detail: 'Twenty questions, 70% to pass, unlimited retakes. A skill note, not a Bar Council accreditation.' },
];

export const mapper = [
  { act: 'BNS', oldSec: 'IPC 302', newSec: 'BNS 103', note: 'Murder. Mob-lynching by five or more is in 103(2).' },
  { act: 'BNS', oldSec: 'IPC 420', newSec: 'BNS 318(4)', note: 'Cheating and dishonestly inducing delivery of property.' },
  { act: 'BNS', oldSec: 'IPC 376', newSec: 'BNS 64', note: 'Punishment for rape. Minimum ten years rigorous imprisonment.' },
  { act: 'BNSS', oldSec: 'CrPC 154', newSec: 'BNSS 173', note: 'FIR, Zero FIR, and e-FIR.' },
  { act: 'BNSS', oldSec: 'CrPC 438', newSec: 'BNSS 482', note: 'Anticipatory bail.' },
  { act: 'BNSS', oldSec: 'CrPC 439', newSec: 'BNSS 483', note: 'Special bail powers of the High Court and Sessions Court.' },
  { act: 'BSA', oldSec: 'IEA 65B', newSec: 'BSA 63', note: 'Electronic records. Hash value and a certificate.' },
  { act: 'BSA', oldSec: 'IEA 45', newSec: 'BSA 39', note: 'Expert opinion, including digital examiners.' },
];

export const notesInside = [
  'BNS, BNSS and BSA simplified notes with the old section beside the new one.',
  '1,059-section old-to-new chart: 358 BNS, 531 BNSS, 170 BSA.',
  'Top 20 drafts juniors actually file, written on BNS and BNSS.',
  '5,000+ editable chamber templates, unlocked only after payment.',
  'Recent landmark judgment summaries for revision and filings.',
  'Lifetime updates and a 7-day full refund.',
];

export const aiInside = [
  '110–130 page masterclass ebook with phone and laptop click-lists.',
  '8 screen recordings, 8–16 minutes, Android flow shown.',
  '100 copy-paste prompts plus 10 BNS/BNSS starters.',
  'Citation Truth Test™ card, chamber compliance kit, and AI safety card.',
  '20-question exam and a verifiable skill note. Not a Bar Council credential.',
];

export const testimonials = [
  { name: 'Adv. R. Kulkarni', place: 'Pune', quote: 'The old-to-new chart is what I keep open in court. IPC 420 to BNS 318(4) is no longer a guess.' },
  { name: 'Priya S.', place: 'Delhi', quote: 'I stopped citing repealed CrPC sections in bail drafts. The BNSS numbering is finally in my notes.' },
  { name: 'Adv. M. Chatterjee', place: 'Kolkata', quote: 'The Citation Truth Test caught a paragraph number that did not exist. That alone was worth the week.' },
];

export const faqs = [
  ['Is this updated for the 1 July 2024 codes?', 'Yes. Notes and prompts use BNS, BNSS, and BSA. The old IPC, CrPC, and Evidence Act numbers sit beside the new ones.'],
  ['When do I get the files?', 'After Razorpay confirms the payment and the server checks the signature. The files are not on the public page.'],
  ['What if it is not for me?', `You have 7 days. Email ${SUPPORT_EMAIL} with your payment id for a full refund. No questions asked.`],
  ['Does the certificate let me practise?', 'No. It is a LegalSkool skill note. It is not a Bar Council of India accreditation and it is not legal advice.'],
  ['Can I use it on my phone?', 'Yes. The masterclass shows an Android flow, and Campus is built for a thumb, not a laptop.'],
];

export const truthCards = [
  { id: 1, citation: 'State of Maharashtra v. Unknown, (2019) 4 SCC 112, para 73', detail: 'The reported order is 27 paragraphs long.', fake: true, why: 'A 27-paragraph order cannot contain paragraph 73. Open it on Indian Kanoon before you cite it.' },
  { id: 2, citation: 'Gurbaksh Singh Sibbia v. State of Punjab, (1980) 2 SCC 565', detail: 'Constitution Bench on anticipatory bail.', fake: false, why: 'The citation is real. You still read the paragraphs you quote.' },
  { id: 3, citation: 'FIR under IPC 420 for an offence dated 12 August 2024', detail: 'The draft charges the old cheating section.', fake: true, why: 'For an offence after 1 July 2024, plead BNS 318(4), not IPC 420.' },
];
