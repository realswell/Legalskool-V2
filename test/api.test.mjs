import assert from 'node:assert/strict';
import test from 'node:test';
import { handleRequest, hmacHex, quoteOrder } from '../worker/index.js';

const SECRET = 'rzp_test_secret_value';
const WEBHOOK_SECRET = 'whsec_test_value';
const SERVICE_ROLE = 'service_role_test_value';
const PASSKEY = 'admin-passkey-test';

function env(overrides = {}) {
  return {
    RAZORPAY_KEY_ID: 'rzp_test_key',
    RAZORPAY_KEY_SECRET: SECRET,
    RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE,
    ADMIN_EMAILS: 'admin@example.com',
    ADMIN_PASSKEY: PASSKEY,
    CONTENT_LINKS_JSON: JSON.stringify({
      notes: { whatsapp: 'https://files.example/notes-group', items: [{ id: 'chart', url: 'https://files.example/notes-chart' }] },
      aivakeel: { whatsapp: 'https://files.example/ai-group', items: [{ id: 'folder', url: 'https://files.example/ai-folder' }] },
      cheatsheet: { items: [{ id: 'sheet', url: 'https://files.example/sheet' }] },
    }),
    ...overrides,
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function mockFetch(handler) {
  const calls = [];
  const fetcher = async (url, init = {}) => {
    const href = typeof url === 'string' ? url : url.url;
    const call = { url: href, init, body: init.body || '' };
    calls.push(call);
    return handler(href, init, call);
  };
  return { fetcher, calls };
}

function gateway(handler) {
  return mockFetch((href, init) => {
    if (href.includes('/legalskool_settings')) return jsonResponse([]);
    if (href.includes('/auth/v1/admin/generate_link')) return jsonResponse({ hashed_token: 'session-token', verification_type: 'magiclink' });
    if (href.includes('/legalskool_orders') && init.method === 'POST') return jsonResponse({}, 201);
    if (href.includes('graph.facebook.com')) return jsonResponse({ events_received: 1 });
    return handler(href, init);
  });
}

test('server prices ignore a client amount and add the cheat sheet bump', () => {
  const notes = quoteOrder('notes', false);
  const bumped = quoteOrder('notes', true);
  assert.equal(notes.amountPaise, 49900);
  assert.deepEqual(notes.productIds, ['notes']);
  assert.equal(bumped.amountPaise, 64800);
  assert.deepEqual(bumped.productIds, ['notes', 'cheatsheet']);
  assert.equal(quoteOrder('aivakeel', false).amountPaise, 149900);
  assert.equal(quoteOrder('acceleration', true).amountPaise, 99900);
  assert.equal(quoteOrder('free', false), null);
});

test('create-order charges the server price and refuses a missing gateway', async () => {
  const blocked = await handleRequest(new Request('https://legalskool.store/api/create-order', {
    method: 'POST',
    body: JSON.stringify({ productId: 'notes', amount: 100, name: 'Buyer', email: 'buyer@example.com', phone: '9876543210' }),
  }), env({ RAZORPAY_KEY_SECRET: '' }));
  assert.equal(blocked.status, 503);
  assert.equal((await blocked.json()).error, 'payments_not_configured');

  const { fetcher, calls } = gateway((href, init) => {
    assert.equal(href, 'https://api.razorpay.com/v1/orders');
    const sent = JSON.parse(init.body);
    assert.equal(sent.amount, 64800);
    assert.equal(sent.notes.product_ids, 'notes,cheatsheet');
    assert.equal(sent.notes.amount_paise, '64800');
    assert.equal(sent.notes.email, 'buyer@example.com');
    return jsonResponse({ id: 'order_Server1', amount: 64800, currency: 'INR' });
  });
  const response = await handleRequest(new Request('https://legalskool.store/api/create-order', {
    method: 'POST',
    body: JSON.stringify({
      productId: 'notes',
      amount: 100,
      bump: true,
      name: 'Buyer',
      email: 'Buyer@Example.com',
      phone: '9876543210',
      utm_source: 'meta_ads',
    }),
  }), env(), fetcher);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.amount, 64800);
  assert.equal(body.orderId, 'order_Server1');
  assert.equal(calls.some((call) => call.url.includes('/v1/orders')), true);
  assert.equal(JSON.stringify(body).includes(SECRET), false);
});

test('the bundle upsell is refused until this email has a purchase', async () => {
  const denied = gateway(() => jsonResponse([]));
  const response = await handleRequest(new Request('https://legalskool.store/api/create-order', {
    method: 'POST',
    body: JSON.stringify({ productId: 'acceleration', name: 'Buyer', email: 'buyer@example.com', phone: '9876543210' }),
  }), env(), denied.fetcher);
  assert.equal(response.status, 409);
  assert.equal(denied.calls.some((call) => call.url.includes('api.razorpay.com')), false);
});

function paidFixture(amount = 49900, productIds = ['notes']) {
  return {
    order: {
      id: 'order_Server1',
      amount,
      currency: 'INR',
      notes: { product_ids: productIds.join(','), charge_id: 'notes', amount_paise: String(amount), email: 'buyer@example.com', name: 'Buyer', phone: '+919876543210', utm_source: 'meta_ads' },
    },
    payment: { id: 'pay_Server1', order_id: 'order_Server1', amount, currency: 'INR', status: 'captured', email: 'buyer@example.com', contact: '+919876543210' },
  };
}

test('verify accepts a valid signature, rejects a forged one, and does not return course links', async () => {
  const fixture = paidFixture();
  const signature = await hmacHex(SECRET, 'order_Server1|pay_Server1');
  const good = gateway((href, init) => {
    if (href.endsWith('/payments/pay_Server1')) return jsonResponse(fixture.payment);
    if (href.endsWith('/orders/order_Server1')) return jsonResponse(fixture.order);
    if (href.includes('/legalskool_students') && (!init.method || init.method === 'GET')) return jsonResponse([]);
    if (href.includes('/legalskool_students')) return jsonResponse({});
    return jsonResponse({ error: href }, 500);
  });
  const ok = await handleRequest(new Request('https://legalskool.store/api/verify-payment', {
    method: 'POST',
    body: JSON.stringify({ razorpay_order_id: 'order_Server1', razorpay_payment_id: 'pay_Server1', razorpay_signature: signature, amount: 100 }),
  }), env(), good.fetcher);
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.ok, true);
  assert.equal(body.session.token_hash, 'session-token');
  assert.equal(JSON.stringify(body).includes('files.example'), false);
  const saved = good.calls.find((call) => call.init.method === 'POST' && call.url.includes('legalskool_students'));
  assert.equal(JSON.parse(saved.body).products, 'notes');
  assert.equal(Object.hasOwn(JSON.parse(saved.body), 'password_hash'), false);

  const forged = gateway(() => jsonResponse({}));
  const bad = await handleRequest(new Request('https://legalskool.store/api/verify-payment', {
    method: 'POST',
    body: JSON.stringify({ razorpay_order_id: 'order_Server1', razorpay_payment_id: 'pay_Server1', razorpay_signature: 'deadbeef' }),
  }), env(), forged.fetcher);
  assert.equal(bad.status, 400);
  assert.equal(forged.calls.some((call) => call.url.includes('legalskool_students')), false);
});

test('webhook signature accepts the raw body and rejects a tampered body', async () => {
  const fixture = paidFixture(149900, ['aivakeel']);
  fixture.order.notes.charge_id = 'aivakeel';
  const event = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_Server1', order_id: 'order_Server1' } } } });
  const signature = await hmacHex(WEBHOOK_SECRET, event);
  const good = gateway((href, init) => {
    if (href.endsWith('/payments/pay_Server1')) return jsonResponse(fixture.payment);
    if (href.endsWith('/orders/order_Server1')) return jsonResponse(fixture.order);
    if (href.includes('/legalskool_students') && (!init.method || init.method === 'GET')) return jsonResponse([]);
    if (href.includes('/legalskool_students')) return jsonResponse({});
    return jsonResponse({});
  });
  const ok = await handleRequest(new Request('https://legalskool.store/api/webhook/lead-and-purchase', {
    method: 'POST',
    headers: { 'x-razorpay-signature': signature },
    body: event,
  }), env(), good.fetcher);
  assert.equal(ok.status, 200);
  const tampered = gateway(() => jsonResponse({}));
  const bad = await handleRequest(new Request('https://legalskool.store/api/webhook/lead-and-purchase', {
    method: 'POST',
    headers: { 'x-razorpay-signature': signature },
    body: `${event.slice(0, -1)},"x":1}`,
  }), env(), tampered.fetcher);
  assert.equal(bad.status, 400);
});

test('campus links are limited to the signed-in buyer and admin requires the server passkey', async () => {
  const { fetcher } = gateway((href, init) => {
    if (href.endsWith('/auth/v1/user')) {
      const token = init.headers.authorization;
      if (token.endsWith('buyer-token')) return jsonResponse({ email: 'buyer@example.com' });
      if (token.endsWith('admin-token')) return jsonResponse({ email: 'admin@example.com' });
      return jsonResponse({ email: 'other@example.com' });
    }
    if (href.includes('/legalskool_students') && href.includes('email=eq.')) {
      return href.includes('buyer%40example.com')
        ? jsonResponse([{ email: 'buyer@example.com', products: 'notes', name: 'Buyer' }])
        : jsonResponse([]);
    }
    if (href.includes('/legalskool_students')) return jsonResponse([{ name: 'Buyer', email: 'buyer@example.com', phone: '9198', products: 'notes', razorpay_payment_id: 'pay_Server1' }]);
    if (href.includes('/legalskool_orders')) return jsonResponse([{ email: 'buyer@example.com', utm_source: 'meta_ads' }]);
    return jsonResponse([]);
  });
  const paid = await handleRequest(new Request('https://legalskool.store/api/campus/access', {
    headers: { authorization: 'Bearer buyer-token' },
  }), env(), fetcher);
  const paidBody = await paid.json();
  assert.deepEqual(paidBody.products, ['notes']);
  assert.equal(paidBody.content.notes.items[0].url, 'https://files.example/notes-chart');
  assert.equal(paidBody.content.aivakeel, undefined);

  const unpaid = await handleRequest(new Request('https://legalskool.store/api/campus/access', {
    headers: { authorization: 'Bearer other-token' },
  }), env(), fetcher);
  assert.equal(JSON.stringify(await unpaid.json()).includes('files.example'), false);

  const noPass = await handleRequest(new Request('https://legalskool.store/api/admin/students', {
    headers: { authorization: 'Bearer admin-token' },
  }), env(), fetcher);
  assert.equal(noPass.status, 403);
  const allowed = await handleRequest(new Request('https://legalskool.store/api/admin/students', {
    headers: { authorization: 'Bearer admin-token', 'x-admin-passkey': PASSKEY },
  }), env(), fetcher);
  const csv = await allowed.json();
  assert.equal(csv.students[0].utm_source, 'meta_ads');
  assert.equal(Object.hasOwn(csv.students[0], 'password_hash'), false);
});

test('spa routes return index.html with 200 and keep the request path', async () => {
  const assets = [];
  const runtimeEnv = env({
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        assets.push(path);
        if (path === '/index.html') return new Response('<html>notes app</html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
        return new Response(null, { status: 307, headers: { location: '/' } });
      },
    },
  });
  const notes = await handleRequest(new Request('https://legalskool.store/notes?utm_source=meta&fbclid=abc'), runtimeEnv);
  assert.equal(notes.status, 200);
  assert.equal(notes.headers.get('location'), null);
  assert.match(await notes.text(), /notes app/);
  assert.deepEqual(assets, ['/index.html']);
  const head = await handleRequest(new Request('https://legalskool.store/aivakeel', { method: 'HEAD' }), runtimeEnv);
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('location'), null);
});
