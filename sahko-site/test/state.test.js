'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

let S;
test.before(async () => { S = await import('../public/assets/state.js'); });

test('happy path: browse → enter → inspect → return → browse', () => {
  let s = S.initial;
  s = S.transition(s, { type: 'INSPECT', slug: 'guji' });
  assert.equal(s.state, S.ENTERING);
  s = S.transition(s, { type: 'DONE', seq: s.seq });
  assert.equal(s.state, S.INSPECTING);
  s = S.transition(s, { type: 'BACK' });
  assert.equal(s.state, S.RETURNING);
  s = S.transition(s, { type: 'DONE', seq: s.seq });
  assert.equal(s.state, S.BROWSING);
  assert.equal(s.last, 'guji');
});

test('back during entering reverses; stale completions are ignored', () => {
  let s = S.transition(S.initial, { type: 'INSPECT', slug: 'guji' });
  const enterSeq = s.seq;
  s = S.transition(s, { type: 'BACK' });
  assert.equal(s.state, S.RETURNING);
  const stale = S.transition(s, { type: 'DONE', seq: enterSeq });
  assert.equal(stale.state, S.RETURNING, 'the old enter animation finishing must not change state');
  s = S.transition(s, { type: 'DONE', seq: s.seq });
  assert.equal(s.state, S.BROWSING);
});

test('rapid repeated inspect of the same coffee is idempotent; another coffee retargets', () => {
  let s = S.transition(S.initial, { type: 'INSPECT', slug: 'guji' });
  const same = S.transition(s, { type: 'INSPECT', slug: 'guji' });
  assert.equal(same, s);
  const other = S.transition(s, { type: 'INSPECT', slug: 'cauca' });
  assert.equal(other.state, S.ENTERING);
  assert.equal(other.slug, 'cauca');
  assert.equal(other.last, 'guji');
});

test('routes map to inspect/back and back is a no-op while browsing', () => {
  assert.equal(S.transition(S.initial, { type: 'BACK' }), S.initial);
  const s = S.transition(S.initial, { type: 'ROUTE', slug: 'minas' });
  assert.equal(s.state, S.ENTERING);
  const r = S.transition(s, { type: 'ROUTE', slug: null });
  assert.equal(r.state, S.RETURNING);
});
