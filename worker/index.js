/**
 * LegalSkool Worker. Prices, signatures, course links, and admin checks stay here.
 * The browser never chooses an amount and never receives a paid link before a verified session.
 */

export const DEFAULT_PRICES = {
  notes: 49900,
  aivakeel: 149900,
  cheatsheet: 14900,
  acceleration: 99900,
};

const GRANTS = {
  notes: ['notes'],
  aivakeel: ['aivakeel'],
  cheatsheet: ['cheatsheet'],
  acceleration: ['notes', 'aivakeel', 'cheatsheet'],
};

const DESCRIPTIONS = {
  notes: 'New Criminal Laws Simplified Notes',
  aivakeel: 'AI Vakeel Masterclass',
  cheatsheet: 'Exam Answer Writing and Case Law Cheat Sheet',
  acceleration: 'Complete Legal Acceleration Bundle',
};

const SPA_PATHS = new Set(['notes', 'aivakeel', 'campus', 'admin']);
const PAID_STATUSES = new Set(['captured', 'authorized']);
const ID_PATTERN = /^(order|pay)_[A-Za-z0-9]+$/;

export function quoteOrder(productId, bump, options = {}) {
  const prices = { ...DEFAULT_PRICES, ...(options.prices || {}) };
  const id = String(productId || '').trim();
  if (!GRANTS[id]) return null;
  const bumpOn = options.bumpEnabled !== false && bump === true && id !== 'acceleration';
  const productIds = [...GRANTS[id]];
  let amountPaise = prices[id];
  if (bumpOn && id !== 'cheatsheet') {
    if (!productIds.includes('cheatsheet')) productIds.push('cheatsheet');
    amountPaise += prices.cheatsheet;
  }
  if (!Number.isFinite(amountPaise) || amountPaise < 100 || amountPaise > 2000000) return null;
  return {
    chargeId: id,
    productIds,
    amountPaise,
    requiresPurchase: id === 'acceleration',
    description: productIds.length > 1 && id !== 'acceleration'
      ? `${DESCRIPTIONS[id]} + cheat sheet`
      : DESCRIPTIONS[id],
  };
}

export async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(mac)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function safeEqual(leftValue, rightValue) {
  const left = String(leftValue || '');
  const right = String(rightValue || '');
  const length = Math.max(left.length, right.length);
  let diff = left.length === right.length ? 0 : 1;
  for (let i = 0; i < length; i += 1) {
    diff |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

function paymentsEnabled(env) {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

function razorpayAuth(env) {
  return `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

function cleanName(value) {
  return String(value || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80);
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizePhone(value) {
  let raw = digits(value);
  if (raw.length === 12 && raw.startsWith('91')) raw = raw.slice(2);
  if (raw.length === 11 && raw.startsWith('0')) raw = raw.slice(1);
  if (!/^[6-9]\d{9}$/.test(raw)) return '';
  return raw;
}

function mergeProducts(existing, incoming) {
  const ids = new Set();
  for (const part of String(existing || '').split(/[^a-z0-9_]+/i)) {
    const id = part.trim().toLowerCase();
    if (GRANTS[id] || id === 'cheatsheet') ids.add(id);
  }
  for (const id of incoming || []) {
    if (GRANTS[id] || id === 'notes' || id === 'aivakeel' || id === 'cheatsheet') ids.add(id);
  }
  return [...ids].filter((id) => id !== 'acceleration').sort().join(',');
}

function productList(value) {
  return mergeProducts(value, []).split(',').filter(Boolean);
}

function contentMap(env) {
  if (!env.CONTENT_LINKS_JSON) return null;
  try {
    const parsed = JSON.parse(env.CONTENT_LINKS_JSON);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function contentFor(map, productIds) {
  if (!map) return {};
  const content = {};
  for (const id of productIds) {
    if (map[id] && typeof map[id] === 'object') content[id] = map[id];
  }
  return content;
}

function adminEmails(env) {
  return String(env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
}

function recordsConfigured(env) {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders(env, extra = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

function baseUrl(env) {
  return String(env.SUPABASE_URL || '').replace(/\/+$/, '');
}

async function readJson(request, limit = 20000) {
  const raw = await request.text();
  if (raw.length > limit) {
    const error = new Error('payload_too_large');
    error.status = 413;
    throw error;
  }
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('invalid_json');
    error.status = 400;
    throw error;
  }
}

async function razorpay(env, fetcher, path, init = {}) {
  const response = await fetcher(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      authorization: razorpayAuth(env),
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
  return { response, body };
}

async function findStudent(env, fetcher, email) {
  const response = await fetcher(
    `${baseUrl(env)}/rest/v1/legalskool_students?select=name,email,phone,products,razorpay_payment_id&email=eq.${encodeURIComponent(email)}`,
    { headers: supabaseHeaders(env) },
  );
  if (!response.ok) return { error: true, row: null };
  const rows = await response.json().catch(() => []);
  return { error: false, row: Array.isArray(rows) ? rows[0] || null : null };
}

async function upsertStudent(env, fetcher, row) {
  const response = await fetcher(`${baseUrl(env)}/rest/v1/legalskool_students?on_conflict=email`, {
    method: 'POST',
    headers: supabaseHeaders(env, {
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify(row),
  });
  return response.ok;
}

async function insertOrderLog(env, fetcher, row) {
  if (!recordsConfigured(env)) return;
  try {
    await fetcher(`${baseUrl(env)}/rest/v1/legalskool_orders`, {
      method: 'POST',
      headers: supabaseHeaders(env, {
        'content-type': 'application/json',
        prefer: 'return=minimal',
      }),
      body: JSON.stringify(row),
    });
  } catch {
    // The purchase still stands if the optional order log is not created yet.
  }
}

async function loadSettings(env, fetcher) {
  const settings = {
    prices: { ...DEFAULT_PRICES },
    bumpEnabled: true,
    upsellEnabled: true,
    pixelId: String(env.META_PIXEL_ID || ''),
    razorpayKeyId: String(env.RAZORPAY_KEY_ID || ''),
    crmWebhookUrl: String(env.CRM_WEBHOOK_URL || ''),
    capiToken: String(env.META_CAPI_ACCESS_TOKEN || ''),
  };
  if (!recordsConfigured(env)) return settings;
  try {
    const response = await fetcher(
      `${baseUrl(env)}/rest/v1/legalskool_settings?id=eq.site&select=value`,
      { headers: supabaseHeaders(env) },
    );
    if (!response.ok) return settings;
    const rows = await response.json().catch(() => []);
    const value = rows && rows[0] && rows[0].value;
    if (!value || typeof value !== 'object') return settings;
    for (const key of Object.keys(DEFAULT_PRICES)) {
      const amount = Number(value.prices?.[key]);
      if (Number.isFinite(amount) && amount >= 100 && amount <= 2000000) settings.prices[key] = amount;
    }
    if (typeof value.bumpEnabled === 'boolean') settings.bumpEnabled = value.bumpEnabled;
    if (typeof value.upsellEnabled === 'boolean') settings.upsellEnabled = value.upsellEnabled;
    if (value.pixelId) settings.pixelId = String(value.pixelId).slice(0, 32);
    if (value.razorpayKeyId && String(value.razorpayKeyId).startsWith('rzp_')) {
      settings.razorpayKeyId = String(value.razorpayKeyId).slice(0, 40);
    }
    if (value.crmWebhookUrl && /^https:\/\//.test(value.crmWebhookUrl)) {
      settings.crmWebhookUrl = String(value.crmWebhookUrl).slice(0, 500);
    }
    if (value.capiToken) settings.capiToken = String(value.capiToken).slice(0, 500);
    return settings;
  } catch {
    return settings;
  }
}

async function saveSettings(env, fetcher, value) {
  const response = await fetcher(`${baseUrl(env)}/rest/v1/legalskool_settings?on_conflict=id`, {
    method: 'POST',
    headers: supabaseHeaders(env, {
      'content-type': 'application/json',
      prefer: 'resolution=merge-duplicates,return=minimal',
    }),
    body: JSON.stringify({ id: 'site', value }),
  });
  return response.ok;
}

function utmFrom(source) {
  const read = (key) => String(source?.[key] || '').replace(/[\u0000-\u001f]/g, '').slice(0, 120);
  return {
    utm_source: read('utm_source'),
    utm_medium: read('utm_medium'),
    utm_campaign: read('utm_campaign'),
    utm_content: read('utm_content'),
    utm_term: read('utm_term'),
  };
}

async function issueSession(env, fetcher, email, name, redirectTo) {
  if (!recordsConfigured(env)) return null;
  try {
    const response = await fetcher(`${baseUrl(env)}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: supabaseHeaders(env, { 'content-type': 'application/json' }),
      body: JSON.stringify({
        type: 'magiclink',
        email,
        options: { redirect_to: redirectTo, data: { full_name: name || '' } },
      }),
    });
    if (!response.ok) return null;
    const body = await response.json().catch(() => ({}));
    const token = body.hashed_token || body.properties?.hashed_token || '';
    if (!token) return null;
    const verification = body.verification_type || body.properties?.verification_type || 'magiclink';
    return { token_hash: token, otp_type: verification === 'email' ? 'email' : 'magiclink' };
  } catch {
    return null;
  }
}

async function sendSideEffects(env, fetcher, settings, payload, request) {
  const eventId = payload.paymentId;
  const tasks = [];
  if (settings.crmWebhookUrl) {
    tasks.push(fetcher(settings.crmWebhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: payload.email,
        name: payload.name,
        phone: payload.phone,
        products: payload.products,
        payment_id: payload.paymentId,
        order_id: payload.orderId,
        amount_inr: payload.amount / 100,
        currency: 'INR',
        ...payload.utm,
      }),
    }).catch(() => {}));
  }
  if (settings.pixelId && settings.capiToken && eventId) {
    const userData = {
      em: [await sha256(payload.email)],
    };
    const phone = digits(payload.phone);
    if (phone) userData.ph = [await sha256(phone)];
    if (payload.fbp) userData.fbp = String(payload.fbp).slice(0, 200);
    if (payload.fbc) userData.fbc = String(payload.fbc).slice(0, 200);
    const ip = request.headers.get('cf-connecting-ip');
    const ua = request.headers.get('user-agent');
    if (ip) userData.client_ip_address = ip;
    if (ua) userData.client_user_agent = ua.slice(0, 500);
    tasks.push(fetcher(`https://graph.facebook.com/v21.0/${encodeURIComponent(settings.pixelId)}/events?access_token=${encodeURIComponent(settings.capiToken)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: 'website',
          user_data: userData,
          custom_data: {
            currency: 'INR',
            value: payload.amount / 100,
            content_ids: payload.products,
            content_type: 'product',
          },
        }],
      }),
    }).catch(() => {}));
  }
  await Promise.all(tasks);
}

function notesOf(order, payment) {
  const orderNotes = order && order.notes && typeof order.notes === 'object' && !Array.isArray(order.notes) ? order.notes : {};
  const paymentNotes = payment && payment.notes && typeof payment.notes === 'object' && !Array.isArray(payment.notes) ? payment.notes : {};
  return { ...paymentNotes, ...orderNotes };
}

async function grantPayment(env, fetcher, settings, { order, payment, paymentId, request, fbp, fbc }) {
  if (!order || !payment) return { ok: false, status: 402, error: 'payment_not_found', message: 'Razorpay did not return this payment.' };
  if (payment.order_id && order.id && payment.order_id !== order.id) {
    return { ok: false, status: 400, error: 'order_mismatch', message: 'This payment does not match the order.' };
  }
  const amount = Number(order.amount);
  if (!Number.isFinite(amount) || amount !== Number(payment.amount) || order.currency !== 'INR' || payment.currency !== 'INR') {
    return { ok: false, status: 400, error: 'amount_mismatch', message: 'The paid amount does not match this order.' };
  }
  if (!PAID_STATUSES.has(payment.status)) {
    return { ok: false, status: 402, error: 'payment_not_captured', message: 'The payment is not complete.' };
  }
  const notes = notesOf(order, payment);
  const productIds = String(notes.product_ids || '').split(',').map((id) => id.trim()).filter((id) => GRANTS[id] || id === 'cheatsheet');
  const notedAmount = Number(notes.amount_paise);
  if (!productIds.length || !Number.isFinite(notedAmount) || notedAmount !== amount) {
    return { ok: false, status: 400, error: 'amount_mismatch', message: 'The paid amount does not match a LegalSkool product.' };
  }
  const email = normalizeEmail(payment.email || notes.email);
  if (!email) return { ok: false, status: 400, error: 'missing_email', message: 'The payment has no email address.' };
  if (!recordsConfigured(env)) {
    return { ok: false, status: 503, error: 'records_not_configured', message: 'Payment was verified, but student records are not configured yet.', email, paymentId, amount };
  }
  const existing = await findStudent(env, fetcher, email);
  if (existing.error) return { ok: false, status: 502, error: 'student_lookup_failed', message: 'The Campus record could not be saved.' };
  const products = mergeProducts(existing.row?.products, productIds);
  const saved = await upsertStudent(env, fetcher, {
    email,
    name: cleanName(notes.name || existing.row?.name || ''),
    phone: normalizePhone(notes.phone || payment.contact || '') || existing.row?.phone || '',
    products,
    razorpay_payment_id: paymentId,
  });
  if (!saved) {
    return { ok: false, status: 502, error: 'student_upsert_failed', message: 'Payment was verified, but the Campus record could not be saved.', email, paymentId, amount };
  }
  const utm = utmFrom(notes);
  await insertOrderLog(env, fetcher, {
    email,
    product_ids: products,
    amount_paise: amount,
    razorpay_order_id: order.id,
    razorpay_payment_id: paymentId,
    ...utm,
  });
  const origin = new URL(request.url).origin;
  const session = await issueSession(env, fetcher, email, cleanName(notes.name || ''), `${origin}/campus`);
  await sendSideEffects(env, fetcher, settings, {
    email,
    name: cleanName(notes.name || ''),
    phone: notes.phone || payment.contact || '',
    products: productList(products),
    paymentId,
    orderId: order.id,
    amount,
    utm,
    fbp,
    fbc,
  }, request);
  return {
    ok: true,
    status: 200,
    email,
    paymentId,
    orderId: order.id,
    amount,
    products: productList(products),
    description: notes.charge_id ? DESCRIPTIONS[notes.charge_id] || 'LegalSkool' : 'LegalSkool',
    session,
  };
}

async function loadGatewayPayment(env, fetcher, orderId, paymentId) {
  const paymentResult = await razorpay(env, fetcher, `/payments/${paymentId}`);
  const orderResult = await razorpay(env, fetcher, `/orders/${orderId}`);
  if (!paymentResult.response.ok || !orderResult.response.ok) {
    return { error: { ok: false, status: 502, error: 'gateway_lookup_failed', message: 'Razorpay could not be reached to confirm this payment.' } };
  }
  return { order: orderResult.body, payment: paymentResult.body };
}

async function publicConfig(env, fetcher) {
  const settings = await loadSettings(env, fetcher);
  const enabled = paymentsEnabled(env);
  const prices = {};
  for (const [key, paise] of Object.entries(settings.prices)) prices[key] = paise / 100;
  return json({
    paymentsEnabled: enabled,
    razorpayKeyId: enabled ? env.RAZORPAY_KEY_ID : '',
    pixelId: settings.pixelId || '',
    prices,
    bumpEnabled: settings.bumpEnabled,
    upsellEnabled: settings.upsellEnabled,
  });
}

async function createOrder(request, env, fetcher) {
  if (!paymentsEnabled(env)) return json({ error: 'payments_not_configured', message: 'Payments are not configured.' }, 503);
  const body = await readJson(request);
  const settings = await loadSettings(env, fetcher);
  const quote = quoteOrder(body.productId, body.bump === true, {
    prices: settings.prices,
    bumpEnabled: settings.bumpEnabled,
  });
  if (!quote) return json({ error: 'unknown_product', message: 'Choose a LegalSkool product to continue.' }, 400);
  const email = normalizeEmail(body.email);
  const name = cleanName(body.name);
  const phone = normalizePhone(body.phone);
  if (!email || !name || !phone) {
    return json({ error: 'invalid_customer', message: 'Enter your name, a 10-digit WhatsApp number, and email.' }, 400);
  }
  if (quote.requiresPurchase) {
    if (!recordsConfigured(env)) return json({ error: 'records_not_configured', message: 'Payments are not configured.' }, 503);
    const existing = await findStudent(env, fetcher, email);
    if (existing.error) return json({ error: 'student_lookup_failed', message: 'Could not check this offer.' }, 502);
    if (!productList(existing.row?.products).length) {
      return json({ error: 'upsell_unavailable', message: 'This bundle is offered after a verified purchase on this email.' }, 409);
    }
  }
  const utm = utmFrom(body);
  const notes = {
    product_ids: quote.productIds.join(','),
    charge_id: quote.chargeId,
    amount_paise: String(quote.amountPaise),
    email,
    name,
    phone: `+91${phone}`,
  };
  for (const [key, value] of Object.entries(utm)) {
    if (value) notes[key] = value;
  }
  const keyId = env.RAZORPAY_KEY_ID;
  const created = await razorpay(env, fetcher, '/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: quote.amountPaise,
      currency: 'INR',
      receipt: `ls${Date.now().toString(36)}`.slice(0, 40),
      payment_capture: true,
      notes,
    }),
  });
  if (!created.response.ok || !created.body.id || Number(created.body.amount) !== quote.amountPaise) {
    return json({ error: 'order_failed', message: 'Razorpay could not start this payment. Try again.' }, 502);
  }
  return json({
    orderId: created.body.id,
    amount: quote.amountPaise,
    currency: 'INR',
    keyId,
    description: quote.description,
    productIds: quote.productIds,
  });
}

async function verifySignature(env, orderId, paymentId, signature) {
  if (!ID_PATTERN.test(orderId) || !ID_PATTERN.test(paymentId) || !signature) return false;
  const expected = await hmacHex(env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`);
  return safeEqual(expected, signature);
}

async function verifyPayment(request, env, fetcher) {
  if (!paymentsEnabled(env)) return json({ error: 'payments_not_configured', message: 'Payments are not configured.' }, 503);
  const body = await readJson(request);
  const orderId = String(body.razorpay_order_id || '');
  const paymentId = String(body.razorpay_payment_id || '');
  const signature = String(body.razorpay_signature || '');
  if (!(await verifySignature(env, orderId, paymentId, signature))) {
    return json({ error: 'invalid_signature', message: 'The payment signature could not be verified.' }, 400);
  }
  const loaded = await loadGatewayPayment(env, fetcher, orderId, paymentId);
  if (loaded.error) return json(loaded.error, loaded.error.status);
  const settings = await loadSettings(env, fetcher);
  const granted = await grantPayment(env, fetcher, settings, {
    order: loaded.order,
    payment: loaded.payment,
    paymentId,
    request,
    fbp: body.fbp,
    fbc: body.fbc,
  });
  const { status, ...payload } = granted;
  return json(payload, status);
}

async function leadAndPurchase(request, env, fetcher) {
  const webhookSignature = request.headers.get('x-razorpay-signature');
  const raw = await request.text();
  if (raw.length > 131072) return json({ error: 'payload_too_large' }, 413);
  if (!paymentsEnabled(env)) return json({ error: 'payments_not_configured' }, 503);
  if (webhookSignature && env.RAZORPAY_WEBHOOK_SECRET) {
    const expected = await hmacHex(env.RAZORPAY_WEBHOOK_SECRET, raw);
    if (!safeEqual(expected, webhookSignature)) return json({ error: 'invalid_signature' }, 400);
    let event;
    try { event = JSON.parse(raw); } catch { return json({ error: 'invalid_json' }, 400); }
    const name = event?.event;
    if (name !== 'payment.captured' && name !== 'payment.authorized' && name !== 'order.paid') {
      return json({ ok: true, ignored: true });
    }
    const payment = event.payload?.payment?.entity;
    const orderId = payment?.order_id || event.payload?.order?.entity?.id;
    const paymentId = payment?.id;
    if (!ID_PATTERN.test(String(orderId || '')) || !ID_PATTERN.test(String(paymentId || ''))) {
      return json({ error: 'invalid_payment' }, 400);
    }
    const loaded = await loadGatewayPayment(env, fetcher, orderId, paymentId);
    if (loaded.error) return json({ error: loaded.error.error }, loaded.error.status);
    const settings = await loadSettings(env, fetcher);
    const granted = await grantPayment(env, fetcher, settings, {
      order: loaded.order,
      payment: loaded.payment,
      paymentId,
      request,
    });
    if (!granted.ok) return json({ error: granted.error }, granted.status);
    return json({ ok: true });
  }
  let body;
  try { body = raw ? JSON.parse(raw) : {}; } catch { return json({ error: 'invalid_json' }, 400); }
  const orderId = String(body.razorpay_order_id || '');
  const paymentId = String(body.razorpay_payment_id || '');
  if (!(await verifySignature(env, orderId, paymentId, String(body.razorpay_signature || '')))) {
    return json({ error: 'invalid_signature' }, 400);
  }
  const loaded = await loadGatewayPayment(env, fetcher, orderId, paymentId);
  if (loaded.error) return json({ error: loaded.error.error }, loaded.error.status);
  const settings = await loadSettings(env, fetcher);
  const granted = await grantPayment(env, fetcher, settings, {
    order: loaded.order,
    payment: loaded.payment,
    paymentId,
    request,
    fbp: body.fbp,
    fbc: body.fbc,
  });
  if (!granted.ok) return json({ error: granted.error }, granted.status);
  return json({ ok: true, event_id: paymentId });
}

function bearer(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : '';
}

async function authUser(env, fetcher, request) {
  if (!recordsConfigured(env)) return { error: json({ error: 'records_not_configured' }, 503) };
  const token = bearer(request);
  if (!token) return { error: json({ error: 'unauthorized' }, 401) };
  const response = await fetcher(`${baseUrl(env)}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${token}` },
  });
  if (!response.ok) return { error: json({ error: 'unauthorized' }, 401) };
  const user = await response.json().catch(() => null);
  const email = normalizeEmail(user && user.email);
  if (!email) return { error: json({ error: 'unauthorized' }, 401) };
  return { email, user };
}

async function campusAccess(request, env, fetcher) {
  const auth = await authUser(env, fetcher, request);
  if (auth.error) return auth.error;
  const student = await findStudent(env, fetcher, auth.email);
  if (student.error) return json({ error: 'student_lookup_failed' }, 502);
  const products = productList(student.row?.products);
  const map = contentMap(env);
  return json({
    email: auth.email,
    name: student.row?.name || auth.user.user_metadata?.full_name || '',
    products,
    contentConfigured: Boolean(map),
    content: contentFor(map, products),
  });
}

async function requireAdmin(request, env, fetcher) {
  const auth = await authUser(env, fetcher, request);
  if (auth.error) return auth;
  if (!env.ADMIN_PASSKEY || !adminEmails(env).includes(auth.email)) {
    return { error: json({ error: 'forbidden' }, 403) };
  }
  const passkey = request.headers.get('x-admin-passkey') || '';
  if (!safeEqual(passkey, env.ADMIN_PASSKEY)) return { error: json({ error: 'forbidden' }, 403) };
  return auth;
}

async function adminStudents(request, env, fetcher, asCsv) {
  const auth = await requireAdmin(request, env, fetcher);
  if (auth.error) return auth.error;
  const studentsResponse = await fetcher(
    `${baseUrl(env)}/rest/v1/legalskool_students?select=name,email,phone,products,razorpay_payment_id,created_at&order=created_at.desc&limit=1000`,
    { headers: supabaseHeaders(env) },
  );
  if (!studentsResponse.ok) return json({ error: 'student_lookup_failed' }, 502);
  const students = await studentsResponse.json().catch(() => []);
  let orders = [];
  const ordersResponse = await fetcher(
    `${baseUrl(env)}/rest/v1/legalskool_orders?select=email,utm_source,utm_medium,utm_campaign,created_at&order=created_at.desc&limit=1000`,
    { headers: supabaseHeaders(env) },
  );
  if (ordersResponse.ok) orders = await ordersResponse.json().catch(() => []);
  const utmByEmail = new Map();
  for (const order of Array.isArray(orders) ? orders : []) {
    if (order.email && !utmByEmail.has(order.email)) utmByEmail.set(order.email, order);
  }
  const rows = (Array.isArray(students) ? students : []).map((row) => {
    const utm = utmByEmail.get(row.email) || {};
    return {
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      products: row.products || '',
      razorpay_payment_id: row.razorpay_payment_id || '',
      utm_source: utm.utm_source || '',
      utm_medium: utm.utm_medium || '',
      utm_campaign: utm.utm_campaign || '',
      created_at: row.created_at || '',
    };
  });
  if (!asCsv) return json({ students: rows });
  const header = 'name,email,phone,products,payment_id,utm_source,utm_medium,utm_campaign,created_at';
  const csv = [header, ...rows.map((row) => [row.name, row.email, row.phone, row.products, row.razorpay_payment_id, row.utm_source, row.utm_medium, row.utm_campaign, row.created_at].map(csvCell).join(','))].join('\n');
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="legalskool-buyers.csv"',
      'cache-control': 'no-store',
    },
  });
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function mask(value) {
  const text = String(value || '');
  if (text.length < 8) return text ? 'set' : '';
  return `${text.slice(0, 4)}…${text.slice(-2)}`;
}

async function adminSettings(request, env, fetcher) {
  const auth = await requireAdmin(request, env, fetcher);
  if (auth.error) return auth.error;
  const settings = await loadSettings(env, fetcher);
  if (request.method === 'GET') {
    return json({
      prices: settings.prices,
      bumpEnabled: settings.bumpEnabled,
      upsellEnabled: settings.upsellEnabled,
      pixelId: settings.pixelId,
      razorpayKeyId: env.RAZORPAY_KEY_ID || '',
      crmWebhookUrl: settings.crmWebhookUrl,
      capiConfigured: Boolean(settings.capiToken),
      capiHint: mask(settings.capiToken),
    });
  }
  const body = await readJson(request);
  const next = {
    prices: { ...settings.prices },
    bumpEnabled: typeof body.bumpEnabled === 'boolean' ? body.bumpEnabled : settings.bumpEnabled,
    upsellEnabled: typeof body.upsellEnabled === 'boolean' ? body.upsellEnabled : settings.upsellEnabled,
    pixelId: body.pixelId != null ? String(body.pixelId).replace(/\D/g, '').slice(0, 32) : settings.pixelId,
    razorpayKeyId: env.RAZORPAY_KEY_ID || '',
    crmWebhookUrl: body.crmWebhookUrl != null ? String(body.crmWebhookUrl).slice(0, 500) : settings.crmWebhookUrl,
    capiToken: settings.capiToken,
  };
  if (body.prices && typeof body.prices === 'object') {
    for (const key of Object.keys(DEFAULT_PRICES)) {
      if (body.prices[key] == null) continue;
      const paise = Math.round(Number(body.prices[key]) * 100);
      if (!Number.isFinite(paise) || paise < 100 || paise > 2000000) {
        return json({ error: 'invalid_price', message: 'Enter a price between ₹1 and ₹20,000.' }, 400);
      }
      next.prices[key] = paise;
    }
  }
  if (body.capiToken) next.capiToken = String(body.capiToken).slice(0, 500);
  if (next.crmWebhookUrl && !/^https:\/\//.test(next.crmWebhookUrl)) {
    return json({ error: 'invalid_webhook', message: 'The CRM webhook must be an https URL.' }, 400);
  }
  if (next.razorpayKeyId && !String(next.razorpayKeyId).startsWith('rzp_')) {
    return json({ error: 'invalid_key', message: 'The Razorpay Key Id should start with rzp_.' }, 400);
  }
  const saved = await saveSettings(env, fetcher, next);
  if (!saved) return json({ error: 'settings_not_saved', message: 'Create the legalskool_settings table before saving. Prices in the Worker are still in force.' }, 502);
  return json({ ok: true });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function callbackHtml({ ok, title, body, next }) {
  const refresh = next ? `<meta http-equiv="refresh" content="0;url=${escapeHtml(next)}" />` : '';
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>${refresh}<title>${escapeHtml(title)}</title><style>body{margin:0;font-family:Inter,system-ui,sans-serif;background:#090D16;color:#F8FAFC}main{max-width:32rem;margin:0 auto;padding:2.5rem 1.2rem}a{color:#D97706}</style></head><body><main><h1>${escapeHtml(title)}</h1><p>${body}</p>${next ? `<p><a href="${escapeHtml(next)}">Continue to Campus</a></p>` : ''}</main></body></html>`, {
    status: ok ? 200 : 400,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function paymentCallback(request, env, fetcher) {
  const url = new URL(request.url);
  let params = url.searchParams;
  if (request.method === 'POST') {
    const raw = await request.text();
    params = (request.headers.get('content-type') || '').includes('application/json')
      ? new URLSearchParams(Object.entries(JSON.parse(raw || '{}')).map(([key, value]) => [key, String(value ?? '')]))
      : new URLSearchParams(raw);
  }
  let failed = false;
  for (const key of params.keys()) if (key === 'error' || key.startsWith('error[')) failed = true;
  if (failed || !paymentsEnabled(env)) {
    return callbackHtml({ ok: false, title: 'Payment not completed', body: 'The course stays locked. You can try the payment again from the course page.' });
  }
  const orderId = params.get('razorpay_order_id') || '';
  const paymentId = params.get('razorpay_payment_id') || '';
  const signature = params.get('razorpay_signature') || '';
  if (!orderId && request.method === 'GET') {
    return callbackHtml({ ok: false, title: 'Waiting for Razorpay', body: 'This page opens after Razorpay redirects back.' });
  }
  if (!(await verifySignature(env, orderId, paymentId, signature))) {
    return callbackHtml({ ok: false, title: 'Payment not confirmed', body: 'The signature did not match, so nothing was unlocked.' });
  }
  const loaded = await loadGatewayPayment(env, fetcher, orderId, paymentId);
  if (loaded.error) {
    return callbackHtml({ ok: false, title: 'Payment not confirmed', body: 'Razorpay could not be reached. If money left your account, email legalskoolofficial@gmail.com with the time of payment.' });
  }
  const settings = await loadSettings(env, fetcher);
  const granted = await grantPayment(env, fetcher, settings, { order: loaded.order, payment: loaded.payment, paymentId, request });
  if (!granted.ok) {
    return callbackHtml({ ok: false, title: 'Payment not unlocked', body: escapeHtml(granted.message || 'The course stays locked.') });
  }
  const next = new URL('/campus', url.origin);
  if (granted.session?.token_hash) {
    next.searchParams.set('token_hash', granted.session.token_hash);
    next.searchParams.set('otp_type', granted.session.otp_type || 'magiclink');
  } else {
    next.searchParams.set('email', granted.email);
  }
  return callbackHtml({
    ok: true,
    title: 'Payment verified',
    body: 'Taking you to Campus.',
    next: next.pathname + next.search,
  });
}

function withAssetHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  headers.set('content-security-policy', [
    "default-src 'self'",
    "script-src 'self' https://checkout.razorpay.com https://connect.facebook.net https://www.facebook.com",
    "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com https://*.supabase.co https://www.facebook.com https://connect.facebook.net https://graph.facebook.com",
    "frame-src https://api.razorpay.com https://checkout.razorpay.com",
    "img-src 'self' data: blob: https://www.facebook.com https://www.google.com https://*.googleusercontent.com",
    "style-src 'self'",
    "font-src 'self'",
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self' https://api.razorpay.com https://checkout.razorpay.com",
    "object-src 'none'",
  ].join('; '));
  if (pathname.startsWith('/assets/')) headers.set('cache-control', 'public, max-age=31536000, immutable');
  else if (response.headers.get('content-type')?.includes('text/html') || SPA_PATHS.has(pathname.replace(/^\/+|\/+$/g, ''))) {
    headers.set('cache-control', 'public, max-age=0, must-revalidate');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function serveAsset(request, env) {
  if (!env.ASSETS) return new Response('Not found', { status: 404 });
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  let assetRequest = request;
  if ((request.method === 'GET' || request.method === 'HEAD') && SPA_PATHS.has(path)) {
    const rewritten = new URL(request.url);
    rewritten.pathname = '/index.html';
    assetRequest = new Request(rewritten.toString(), request);
  }
  const response = await env.ASSETS.fetch(assetRequest);
  if (response.status === 404 && (request.method === 'GET' || request.method === 'HEAD')) {
    const rewritten = new URL(request.url);
    rewritten.pathname = '/index.html';
    const fallback = await env.ASSETS.fetch(new Request(rewritten.toString(), request));
    return withAssetHeaders(fallback, '/index.html');
  }
  return withAssetHeaders(response, new URL(assetRequest.url).pathname);
}

export async function handleRequest(request, env, fetcher = fetch) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (request.method === 'OPTIONS' && (path.startsWith('/api/') || path === '/pay/callback')) {
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  }
  try {
    if (path === '/api/public-config' && request.method === 'GET') return await publicConfig(env, fetcher);
    if (path === '/api/create-order' && request.method === 'POST') return await createOrder(request, env, fetcher);
    if (path === '/api/verify-payment' && request.method === 'POST') return await verifyPayment(request, env, fetcher);
    if (path === '/api/webhook/lead-and-purchase' && request.method === 'POST') return await leadAndPurchase(request, env, fetcher);
    if (path === '/api/campus/access' && request.method === 'GET') return await campusAccess(request, env, fetcher);
    if (path === '/api/admin/students.csv' && request.method === 'GET') return await adminStudents(request, env, fetcher, true);
    if (path === '/api/admin/students' && request.method === 'GET') return await adminStudents(request, env, fetcher, false);
    if (path === '/api/admin/settings' && (request.method === 'GET' || request.method === 'POST')) return await adminSettings(request, env, fetcher);
    if (path === '/pay/callback' && (request.method === 'GET' || request.method === 'POST')) return await paymentCallback(request, env, fetcher);
    if (path.startsWith('/api/') || path.startsWith('/pay/')) return json({ error: 'not_found' }, 404);
    return await serveAsset(request, env);
  } catch (error) {
    const status = error?.status || 500;
    return json({ error: status >= 500 ? 'server_error' : error.message }, status);
  }
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env, fetch);
  },
};
