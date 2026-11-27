'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

let O;
test.before(async () => { O = await import('../public/assets/orbit.js'); });

const close = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('front index wraps continuously in both directions for repeated cycles', () => {
  const n = 6, step = O.stepAngle(n);
  let phase = 0;
  for (let k = 1; k <= 25; k++) { phase -= step; assert.equal(O.frontIndex(phase, n), k % n); }
  for (let k = 1; k <= 25; k++) { phase += step; assert.equal(O.frontIndex(phase, n), ((25 - k) % n + n) % n); }
});

test('phaseForIndex takes the shortest path and respects a forced direction', () => {
  const n = 6, step = O.stepAngle(n);
  // at item 0, going to item 5 is one step backward, not five forward
  assert.ok(close(O.phaseForIndex(5, n, 0), step));
  assert.ok(close(O.phaseForIndex(1, n, 0), -step));
  // forced forward to item 5 is five steps forward
  assert.ok(close(O.phaseForIndex(5, n, 0, +1), -5 * step));
  // forced backward to item 1 is five steps back
  assert.ok(close(O.phaseForIndex(1, n, 0, -1), 5 * step));
  // from an unbounded phase (many turns) it still lands on the item
  const far = -1234 * step;
  const p = O.phaseForIndex(3, n, far);
  assert.equal(O.frontIndex(p, n), 3);
  assert.ok(Math.abs(p - far) <= 3 * step + 1e-9);
});

test('last → first and first → last are single continuous steps', () => {
  const n = 6, step = O.stepAngle(n);
  const atLast = O.phaseForIndex(5, n, 0, +1);
  const toFirst = atLast - step; // one more "next"
  assert.equal(O.frontIndex(toFirst, n), 0);
  const back = toFirst + step; // one "prev"
  assert.equal(O.frontIndex(back, n), 5);
});

test('layout keeps the front item largest, most opaque and in front', () => {
  const n = 6;
  const L = O.layout(0, n, { rx: 400 });
  const front = L[0];
  assert.ok(front.front);
  assert.ok(close(front.x, 0));
  assert.ok(close(front.scale, 1));
  assert.ok(close(front.opacity, 1));
  for (const item of L.slice(1)) {
    assert.ok(item.scale < front.scale);
    assert.ok(item.opacity <= front.opacity);
    assert.ok(item.z < front.z);
  }
  // symmetric neighbours
  assert.ok(close(L[1].x, -L[5].x));
  assert.ok(close(L[1].scale, L[5].scale));
  // item directly behind (index 3) is hidden
  assert.equal(L[3].opacity, 0);
});

test('bags never leave the horizontal band (no vertical orbit)', () => {
  for (const n of [1, 2, 3, 6, 11]) {
    for (let p = -7; p < 7; p += 0.37) {
      for (const it of O.layout(p, n, { ry: 26 })) {
        assert.ok(it.y <= 0 && it.y >= -26, `y=${it.y}`);
      }
    }
  }
});

test('snap lands on an item and approach converges', () => {
  const n = 6, step = O.stepAngle(n);
  assert.ok(close(O.snapPhase(-2.4 * step, n), -2 * step));
  assert.ok(close(O.snapPhase(-2.6 * step, n), -3 * step));
  let p = 0; const target = -step;
  for (let i = 0; i < 200; i++) p = O.approach(p, target, 1 / 60);
  assert.ok(Math.abs(p - target) < 1e-3);
});

test('degenerate catalogues: 0, 1 and 2 items', () => {
  assert.equal(O.frontIndex(0, 0), -1);
  assert.deepEqual(O.layout(0, 0), []);
  const one = O.layout(0.3, 1);
  assert.equal(one.length, 1);
  assert.ok(one[0].front);
  const two = O.layout(0, 2);
  assert.ok(two[0].front && !two[1].front);
  assert.equal(two[1].opacity, 0); // the other sits directly behind
  assert.equal(O.frontIndex(O.phaseForIndex(1, 2, 0), 2), 1);
});
