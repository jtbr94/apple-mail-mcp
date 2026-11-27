'use strict';
// POST /api/webhook  — Stripe sends events here. We verify the signature and record paid pre-orders.
// Point a Stripe webhook endpoint at https://<your-domain>/api/webhook with the event `checkout.session.completed`.
const { readRawBody, sendJson } = require('../lib/http');

async function notify(order) {
  const target = process.env.PREORDER_NOTIFY_URL;
  if (!target) return;
  try {
    await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `New pre-order: ${order.summary}`, order }),
    });
  } catch (err) {
    console.error('pre-order notify failed', err);
  }
}

function createHandler({ stripeFactory, onOrder = notify } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { error: 'Method not allowed' });
    }
    const key = process.env.STRIPE_SECRET_KEY;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!key || !secret) return sendJson(res, 500, { error: 'Webhook is not configured' });

    const stripe = stripeFactory ? stripeFactory(key) : require('stripe')(key);
    const raw = await readRawBody(req);
    let event;
    try {
      event = stripe.webhooks.constructEvent(raw, req.headers['stripe-signature'], secret);
    } catch (err) {
      return sendJson(res, 400, { error: `Signature verification failed: ${err.message}` });
    }

    if (event.type === 'checkout.session.completed') {
      const s = event.data.object;
      if (s.payment_status === 'paid' && s.metadata?.preorder === 'true') {
        const order = {
          sessionId: s.id,
          slug: s.metadata.slug,
          size: s.metadata.size,
          lot: s.metadata.lot,
          quantity: Number(s.metadata.quantity || 1),
          amountTotal: s.amount_total,
          currency: s.currency,
          email: s.customer_details?.email || null,
          name: s.customer_details?.name || null,
          shipping: s.shipping_details || s.collected_information?.shipping_details || null,
          summary: `${s.metadata.slug} ${s.metadata.size} × ${s.metadata.quantity || 1} (${s.customer_details?.email || 'no email'})`,
        };
        console.log('PRE-ORDER PAID', JSON.stringify(order));
        await onOrder(order);
      }
    }
    return sendJson(res, 200, { received: true });
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
// Stripe needs the raw body to verify signatures, so turn Vercel's body parser off for this route.
module.exports.config = { api: { bodyParser: false } };
