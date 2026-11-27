'use strict';
// POST /api/inquiry — wholesale and contact forms. Validates server-side, drops honeypot hits,
// rate-limits per IP, and forwards to INQUIRY_NOTIFY_URL (Slack/Zapier/your inbox relay) when set.
const { readJsonBody, sendJson } = require('../lib/http');

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > MAX_PER_WINDOW;
}

function clean(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function validate(body) {
  const errors = {};
  const data = {
    kind: clean(body.kind, 20) === 'wholesale' ? 'wholesale' : 'contact',
    name: clean(body.name, 120),
    business: clean(body.business, 160),
    email: clean(body.email, 200),
    location: clean(body.location, 160),
    volume: clean(body.volume, 80),
    message: clean(body.message, 4000),
  };
  if (!data.name) errors.name = 'Please tell us your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'That email address does not look right.';
  if (data.kind === 'wholesale' && !data.business) errors.business = 'Please name the café, restaurant or shop.';
  if (!data.message) errors.message = 'A sentence or two about what you are looking for helps us reply well.';
  return { data, errors };
}

async function forward(data, notify = defaultNotify) {
  return notify(data);
}

async function defaultNotify(data) {
  const target = process.env.INQUIRY_NOTIFY_URL;
  if (!target) {
    console.log('INQUIRY', JSON.stringify(data));
    return { delivered: false };
  }
  const res = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `${data.kind} inquiry from ${data.name} <${data.email}>${data.business ? ' · ' + data.business : ''}`, inquiry: data }),
  });
  return { delivered: res.ok };
}

function createHandler({ notify } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { error: 'Method not allowed' });
    }
    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (limited(ip)) return sendJson(res, 429, { error: 'Too many messages in a short time. Please try again later.' });
    const body = await readJsonBody(req);
    if (!body) return sendJson(res, 400, { error: 'Invalid JSON body' });
    if (clean(body.website, 50)) return sendJson(res, 202, { ok: true }); // honeypot: pretend success
    const { data, errors } = validate(body);
    if (Object.keys(errors).length) return sendJson(res, 422, { error: 'Please check the highlighted fields.', fields: errors });
    try {
      const r = await forward(data, notify);
      return sendJson(res, 202, { ok: true, delivered: !!r.delivered });
    } catch (err) {
      console.error('inquiry forward failed', err);
      return sendJson(res, 502, { error: 'We could not send your message. Please email us directly.' });
    }
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports.validate = validate;
module.exports._reset = () => hits.clear();
