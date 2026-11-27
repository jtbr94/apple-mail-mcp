'use strict';
// GET /api/session?id=cs_...  ->  a safe summary of a completed Checkout Session for the thank-you page.
const { sendJson } = require('../lib/http');

function createHandler({ stripeFactory } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return sendJson(res, 405, { error: 'Method not allowed' });
    }
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return sendJson(res, 500, { error: 'Stripe is not configured' });

    const url = new URL(req.url, 'http://localhost');
    const id = url.searchParams.get('id') || '';
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return sendJson(res, 400, { error: 'Invalid session id' });

    const stripe = stripeFactory ? stripeFactory(key) : require('stripe')(key);
    try {
      const s = await stripe.checkout.sessions.retrieve(id, { expand: ['line_items'] });
      return sendJson(res, 200, {
        status: s.status,
        paymentStatus: s.payment_status,
        email: s.customer_details?.email || null,
        name: s.customer_details?.name || null,
        amountTotal: s.amount_total,
        currency: s.currency,
        items: (s.line_items?.data || []).map((li) => ({ description: li.description, quantity: li.quantity, amount: li.amount_total })),
        metadata: s.metadata || {},
      });
    } catch (err) {
      console.error('stripe session lookup error', err);
      return sendJson(res, 404, { error: 'Order not found' });
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
