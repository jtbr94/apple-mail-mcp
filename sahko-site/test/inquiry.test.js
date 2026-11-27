'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const inquiry = require('../api/inquiry.js');

function req(body, headers = {}) {
  const r = new PassThrough();
  r.method = 'POST'; r.url = '/api/inquiry'; r.headers = { host: 'x', ...headers };
  r.end(JSON.stringify(body));
  return r;
}
function res() {
  const o = { statusCode: 200, headers: {} };
  o.setHeader = (k, v) => { o.headers[k] = v; };
  o.end = (s) => { o.body = JSON.parse(s); };
  return o;
}

test('rejects invalid fields with per-field errors', async () => {
  inquiry._reset();
  const h = inquiry.createHandler({ notify: async () => ({ delivered: true }) });
  const r = res();
  await h(req({ kind: 'wholesale', name: '', email: 'nope', message: '' }), r);
  assert.equal(r.statusCode, 422);
  assert.deepEqual(Object.keys(r.body.fields).sort(), ['business', 'email', 'message', 'name']);
});

test('accepts a valid wholesale inquiry and forwards it', async () => {
  inquiry._reset();
  let got;
  const h = inquiry.createHandler({ notify: async (d) => { got = d; return { delivered: true }; } });
  const r = res();
  await h(req({ kind: 'wholesale', name: 'A', business: 'Café B', email: 'a@b.co', message: 'Hi', volume: '5 kg / week' }, { 'x-forwarded-for': '1.1.1.1' }), r);
  assert.equal(r.statusCode, 202);
  assert.equal(got.business, 'Café B');
  assert.equal(got.kind, 'wholesale');
});

test('honeypot submissions are swallowed and rate limiting kicks in', async () => {
  inquiry._reset();
  let calls = 0;
  const h = inquiry.createHandler({ notify: async () => { calls++; return { delivered: true }; } });
  let r = res();
  await h(req({ kind: 'contact', name: 'Bot', email: 'b@b.co', message: 'x', website: 'http://spam' }, { 'x-forwarded-for': '2.2.2.2' }), r);
  assert.equal(r.statusCode, 202);
  assert.equal(calls, 0);
  for (let i = 0; i < 5; i++) { r = res(); await h(req({ kind: 'contact', name: 'P', email: 'p@p.co', message: 'x' }, { 'x-forwarded-for': '3.3.3.3' }), r); }
  r = res();
  await h(req({ kind: 'contact', name: 'P', email: 'p@p.co', message: 'x' }, { 'x-forwarded-for': '3.3.3.3' }), r);
  assert.equal(r.statusCode, 429);
});
