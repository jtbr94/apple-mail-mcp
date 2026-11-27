'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const { createHandler } = require('../api/checkout.js');
const webhook = require('../api/webhook.js');
const { findOffer, loadCoffees, loadSite } = require('../lib/catalog.js');

function fakeReq({ method = 'POST', body, headers = {}, url = '/api/checkout' } = {}) {
  const req = new PassThrough();
  req.method = method;
  req.url = url;
  req.headers = { host: 'example.test', 'x-forwarded-proto': 'https', ...headers };
  if (body !== undefined) req.end(typeof body === 'string' ? body : JSON.stringify(body));
  else req.end();
  return req;
}
function fakeRes() {
  const res = { headers: {}, statusCode: 200 };
  res.setHeader = (k, v) => { res.headers[k.toLowerCase()] = v; };
  res.end = (s) => { res.body = s ? JSON.parse(s) : null; };
  return res;
}
function fakeStripe(onCreate) {
  return () => ({ checkout: { sessions: { create: async (params) => { onCreate && onCreate(params); return { id: 'cs_test_123', url: 'https://checkout.stripe.com/c/pay/cs_test_123' }; } } } });
}

test('catalogue exposes every coffee with two offers', () => {
  const coffees = loadCoffees();
  assert.equal(coffees.length, 6);
  for (const c of coffees) {
    assert.ok(c.slug && c.name && c.lot && c.tastingNotes, c.slug);
    assert.equal(c.offers.length, 2);
    assert.ok(c.offers.every((o) => Number.isInteger(o.amount) && o.amount > 0));
  }
  assert.equal(findOffer('cerrado', '1kg').offer.size, '1kg');
  assert.equal(findOffer('cerrado', '5kg'), null);
  assert.equal(findOffer('nope', '1kg'), null);
});

test('checkout rejects non-POST', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  const res = fakeRes();
  await createHandler({ stripeFactory: fakeStripe() })(fakeReq({ method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
});

test('checkout reports missing configuration', async () => {
  delete process.env.STRIPE_SECRET_KEY;
  const res = fakeRes();
  await createHandler({ stripeFactory: fakeStripe() })(fakeReq({ body: { slug: 'cerrado', size: '1kg', quantity: 1 } }), res);
  assert.equal(res.statusCode, 500);
  assert.match(res.body.error, /STRIPE_SECRET_KEY/);
});

test('checkout validates slug, size, quantity and JSON', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  const h = createHandler({ stripeFactory: fakeStripe() });
  let res = fakeRes();
  await h(fakeReq({ body: { slug: 'cerrado', size: '9kg', quantity: 1 } }), res);
  assert.equal(res.statusCode, 400);
  res = fakeRes();
  await h(fakeReq({ body: { slug: 'cerrado', size: '1kg', quantity: 99 } }), res);
  assert.equal(res.statusCode, 400);
  res = fakeRes();
  await h(fakeReq({ body: '{not json' }), res);
  assert.equal(res.statusCode, 400);
});

test('checkout creates a pre-order session with the right line item and URLs', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  delete process.env.SITE_URL;
  let params;
  const res = fakeRes();
  await createHandler({ stripeFactory: fakeStripe((p) => { params = p; }) })(fakeReq({ body: { slug: 'guji', size: '250g', quantity: 3 } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.url, 'https://checkout.stripe.com/c/pay/cs_test_123');
  assert.equal(params.mode, 'payment');
  assert.equal(params.line_items.length, 1);
  assert.equal(params.line_items[0].quantity, 3);
  assert.equal(params.line_items[0].price_data.unit_amount, findOffer('guji', '250g').offer.amount);
  assert.equal(params.line_items[0].price_data.currency, loadSite().currency);
  assert.equal(params.line_items[0].price_data.product_data.name, 'Guji 250g');
  assert.equal(params.success_url, 'https://example.test/success/?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(params.cancel_url, 'https://example.test/wholesale/guji/');
  assert.equal(params.metadata.preorder, 'true');
  assert.equal(params.metadata.lot, 'GUJ01W-25');
  assert.deepEqual(params.shipping_address_collection.allowed_countries, loadSite().preorder.shippingCountries);
});

test('checkout uses a Stripe Price id when one is configured', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  const coffees = loadCoffees();
  coffees[0].offers[1].stripePriceId = 'price_abc';
  let params;
  const res = fakeRes();
  await createHandler({ stripeFactory: fakeStripe((p) => { params = p; }), coffees })(fakeReq({ body: { slug: coffees[0].slug, size: '1kg', quantity: 2 } }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(params.line_items[0], { price: 'price_abc', quantity: 2 });
});

test('webhook rejects bad signatures and records paid pre-orders', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';
  const event = { type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', payment_status: 'paid', amount_total: 5600, currency: 'usd', metadata: { preorder: 'true', slug: 'minas', size: '1kg', lot: 'MIN01N–25', quantity: '1' }, customer_details: { email: 'buyer@example.com', name: 'B' } } } };
  const stripeFactory = () => ({ webhooks: { constructEvent: (raw, sig) => { if (sig !== 'good') throw new Error('bad sig'); return event; } } });
  const orders = [];
  const h = webhook.createHandler({ stripeFactory, onOrder: async (o) => orders.push(o) });
  let res = fakeRes();
  await h(fakeReq({ url: '/api/webhook', body: '{}', headers: { 'stripe-signature': 'bad' } }), res);
  assert.equal(res.statusCode, 400);
  res = fakeRes();
  await h(fakeReq({ url: '/api/webhook', body: '{}', headers: { 'stripe-signature': 'good' } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(orders.length, 1);
  assert.equal(orders[0].slug, 'minas');
  assert.equal(orders[0].email, 'buyer@example.com');
});
