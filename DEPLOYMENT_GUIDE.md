# Deployment guide

This repo deploys as the existing Cloudflare Worker `legalskool-v2`. A merge to `main` auto-deploys, so land the change as a pull request and set the build command before you merge.

Do not change the DNS for `legalskool.store` until you have checked the Worker on `https://legalskool-v2.swelluddin.workers.dev`.

## Build

Cloudflare’s Worker build must run the app build before Wrangler uploads assets:

- `dist/` is committed because Wrangler checks that `assets.directory` exists before it runs anything else. When `node_modules/typescript` is present, Wrangler rebuilds `dist/` before upload.
- Deploy command: `npx wrangler deploy`

`npm run build` typechecks the React app and writes `dist/`. Wrangler serves `dist/` as static assets and `worker/index.js` for `/api/*` and `/pay/callback`.

Hashed files under `/assets/*` are cached for one year and marked immutable. HTML is `max-age=0, must-revalidate`. The Worker also sends a Content-Security-Policy that allows Razorpay, Supabase, Google sign-in, and the Meta pixel. UPI apps (`upi://`, `tez://`, `phonepe://`, `paytmmp://`) are opened by Razorpay Checkout from its own frame, which is allowed by `frame-src`.

## Secrets and variables

Add these in **Workers & Pages → legalskool-v2 → Settings → Variables and Secrets**. Use encrypted secrets except where noted. Do not put them in `VITE_` variables.

| Name | Kind | Purpose |
| --- | --- | --- |
| `RAZORPAY_KEY_ID` | Secret | Key Id (`rzp_live_…` or `rzp_test_…`). Checkout receives this from the server. |
| `RAZORPAY_KEY_SECRET` | Secret | Key secret. Used to create orders and verify `order_id\|payment_id`. |
| `RAZORPAY_WEBHOOK_SECRET` | Secret | The secret you type when creating the Razorpay webhook. |
| `SUPABASE_URL` | Secret | `https://nbrcnqpibtbsljoevrhy.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Service role key. Bypasses RLS. Never send it to the browser. |
| `ADMIN_EMAILS` | Secret | Comma-separated emails allowed into `/admin`. |
| `ADMIN_PASSKEY` | Secret | Compared only on the Worker. The page never contains it. |
| `CONTENT_LINKS_JSON` | Secret | Paid Drive and WhatsApp links. Shape below. |
| `META_PIXEL_ID` | Plain variable, optional | Used until an admin saves a pixel id. |
| `META_CAPI_ACCESS_TOKEN` | Secret | Conversions API token. An admin can replace it later; the API never returns the full token. |
| `CRM_WEBHOOK_URL` | Secret, optional | Google Apps Script (or other) URL that receives the buyer JSON. |

`VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are the only browser values. They are already safe to ship. Copy `.env.example` for local `vite` if you want to override them.

Prices default to notes ₹499, AI Vakeel ₹1,499, cheat-sheet bump ₹149, and the post-purchase Complete Legal Acceleration Bundle ₹999. An admin can change them. The browser cannot choose the amount. Checkout always uses `RAZORPAY_KEY_ID` from the Worker, so saving a different Key Id in the browser cannot retarget the payment.

`CONTENT_LINKS_JSON`:

```json
{
  "notes": {
    "whatsapp": "https://example.com/notes-group",
    "items": [
      { "id": "chart", "title": "Comparative chart", "url": "https://example.com/chart" },
      { "id": "guide", "title": "Complete guide", "url": "https://example.com/guide" },
      { "id": "vault", "title": "Drafting library", "url": "https://example.com/vault" }
    ]
  },
  "aivakeel": {
    "whatsapp": "https://example.com/ai-group",
    "items": [{ "id": "folder", "title": "Course folder", "url": "https://example.com/folder" }],
    "lessons": []
  },
  "cheatsheet": {
    "items": [{ "id": "sheet", "title": "Cheat sheet", "url": "https://example.com/sheet" }]
  }
}
```

Put the real links here. They used to be in the page and are still in older commits until history is purged.

## Supabase tables

`public.legalskool_students` already exists and has RLS enabled with no policies. Leave it that way. The Worker writes it with the service role and does not store a password.

Run this once in the SQL editor for settings and UTM logs. Enable RLS and add no policies, same as the students table:

```sql
create table if not exists public.legalskool_settings (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
alter table public.legalskool_settings enable row level security;

create table if not exists public.legalskool_orders (
  id uuid primary key default gen_random_uuid(),
  email text,
  product_ids text,
  amount_paise integer,
  razorpay_order_id text,
  razorpay_payment_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz default now()
);
alter table public.legalskool_orders enable row level security;
```

Auth → URL configuration:

- Site URL: `https://legalskool-v2.swelluddin.workers.dev` until the domain moves, then `https://legalskool.store`
- Redirect URLs: `https://legalskool-v2.swelluddin.workers.dev/campus`, `https://legalskool-v2.swelluddin.workers.dev/admin`, and the same paths on `https://legalskool.store`

Google is already enabled. Returning students can use Google, an email code, or email and password. Passwords live in Supabase Auth, not in this app.

In Authentication → Email Templates, show the code in the magic-link email so Instagram and Facebook users can type it:

```html
<h2>Your LegalSkool code</h2>
<p>{{ .Token }}</p>
```

After a verified payment the Worker calls `generate_link` and the browser exchanges that token immediately, so the buyer lands in Campus without a second login when Supabase accepts the link.

## Razorpay

Webhook URL:

`https://legalskool-v2.swelluddin.workers.dev/api/webhook/lead-and-purchase`

After the domain moves, add the same path on `https://legalskool.store`.

Events: `payment.authorized`, `payment.captured`, `order.paid`.

The webhook secret must match `RAZORPAY_WEBHOOK_SECRET`.

Checkout uses a server order, `redirect: true`, and `callback_url` `https://<host>/pay/callback`, so a UPI return inside Instagram or Facebook still reaches the Worker when the in-page handler does not.

## Meta

1. Put the pixel id in `META_PIXEL_ID` or save it in admin settings.
2. Create a Conversions API access token and set `META_CAPI_ACCESS_TOKEN`.
3. The browser fires `Purchase` with `eventID` equal to the Razorpay payment id only after `/api/verify-payment` succeeds.
4. The same id is sent with `navigator.sendBeacon` to `/api/webhook/lead-and-purchase`, and the Worker posts the CAPI event. Meta dedupes on `event_id`.
5. The webhook sends the same event if the browser never returns.
6. Set `CRM_WEBHOOK_URL` to the Google Apps Script web app URL. The Worker POSTs the buyer, amount, payment id, and UTM fields. Deduplicate on `payment_id` in the sheet.

PageView fires on each route. ViewContent fires on `/notes` and `/aivakeel`. InitiateCheckout fires when the sheet opens and includes `_fbp`, `_fbc`, and `utm_*` when those cookies or parameters exist.

## Pointing legalskool.store later

1. Confirm a payment on the workers.dev host, including the Instagram in-app browser if you can.
2. In Cloudflare, attach `legalskool.store` to this Worker. Do not point the domain at the old site and this Worker at the same time without a cutover plan.
3. Add the production origin to Supabase redirect URLs and to the Razorpay webhook.

## Git history

Buyer names, emails, phone numbers, payment ids, the old admin PIN, and paid links were removed from the files. They remain in older commits. Purge them with a history rewrite (for example `git filter-repo`) and rotate the Razorpay key secret, the webhook secret, and the Supabase service role key. This change does not rewrite history.
