'use strict';
// POST /api/checkout  { slug, size, quantity }  ->  { url }
// Creates a Stripe Checkout Session for a pre-order and returns the hosted checkout URL.
const { findOffer, loadSite } = require('../lib/catalog');
const { readJsonBody, sendJson, requestOrigin } = require('../lib/http');

function createHandler({ stripeFactory, site = loadSite(), coffees } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { error: 'Method not allowed' });
    }
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      return sendJson(res, 500, { error: 'Pre-orders are not configured yet (STRIPE_SECRET_KEY is missing).' });
    }

    const body = await readJsonBody(req);
    if (!body) return sendJson(res, 400, { error: 'Invalid JSON body' });

    const quantity = Number.parseInt(body.quantity, 10) || 1;
    const max = site.preorder?.maxQuantity || 20;
    if (quantity < 1 || quantity > max) {
      return sendJson(res, 400, { error: `Quantity must be between 1 and ${max}` });
    }

    const match = findOffer(body.slug, body.size, coffees);
    if (!match) return sendJson(res, 400, { error: 'Unknown coffee or size' });
    const { coffee, offer } = match;

    const origin = requestOrigin(req);
    const stripe = stripeFactory ? stripeFactory(key) : require('stripe')(key);

    const lineItem = offer.stripePriceId
      ? { price: offer.stripePriceId, quantity }
      : {
          quantity,
          price_data: {
            currency: site.currency,
            unit_amount: offer.amount,
            product_data: {
              name: `${coffee.name} ${offer.size}`,
              description: `Pre-order · ${coffee.tags.join(', ')} · ${coffee.tastingNotes}`,
              images: [`${origin}${coffee.images.bag}`],
              metadata: { slug: coffee.slug, size: offer.size, lot: coffee.lot },
            },
          },
        };

    const params = {
      mode: 'payment',
      line_items: [lineItem],
      success_url: `${origin}/success/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/wholesale/${coffee.slug}/`,
      metadata: { preorder: 'true', slug: coffee.slug, size: offer.size, lot: coffee.lot, quantity: String(quantity) },
      payment_intent_data: {
        description: `Pre-order: ${coffee.name} ${offer.size} × ${quantity}`,
        metadata: { preorder: 'true', slug: coffee.slug, size: offer.size, lot: coffee.lot },
      },
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
    };
    if (site.preorder?.shippingCountries?.length) {
      params.shipping_address_collection = { allowed_countries: site.preorder.shippingCountries };
    }
    if (site.preorder?.checkoutMessage) {
      params.custom_text = { submit: { message: site.preorder.checkoutMessage } };
    }

    try {
      const session = await stripe.checkout.sessions.create(params);
      return sendJson(res, 200, { url: session.url, id: session.id });
    } catch (err) {
      console.error('stripe checkout error', err);
      return sendJson(res, 502, { error: 'Could not start checkout. Please try again.' });
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
