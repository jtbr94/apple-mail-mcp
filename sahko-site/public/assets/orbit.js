// Pure geometry for the orbital carousel. No DOM. Imported by the gallery and by the tests.
// Model: a horizontal circular platform seen from the front. Item i sits at angle
// theta_i = phase + i * (2π / n). theta = 0 is the front (closest, largest).
// x = rx * sin(theta), depth = (cos(theta) + 1) / 2 in [0, 1] (1 = front).

export const TAU = Math.PI * 2;

export function stepAngle(n) {
  return n > 0 ? TAU / n : 0;
}

export function angleFor(i, n, phase) {
  return phase + i * stepAngle(n);
}

// Wrap an angle into (-π, π].
export function normalize(a) {
  a = a % TAU;
  if (a > Math.PI) a -= TAU;
  if (a <= -Math.PI) a += TAU;
  return a;
}

// Index of the item nearest the front for a given phase.
export function frontIndex(phase, n) {
  if (!n) return -1;
  const k = Math.round(-phase / stepAngle(n));
  return ((k % n) + n) % n;
}

// Phase that brings item i to the front, reached from `phase` by the shortest
// angular path. direction > 0 forces forward (next), < 0 forces backward.
export function phaseForIndex(i, n, phase, direction = 0) {
  if (!n) return phase;
  const step = stepAngle(n);
  const current = -phase / step; // continuous front index
  let delta = i - current;
  delta -= Math.round(delta / n) * n; // shortest, in (-n/2, n/2]
  if (direction > 0 && delta < -1e-9) delta += n;
  if (direction < 0 && delta > 1e-9) delta -= n;
  return -(current + delta) * step;
}

// Nearest phase at which some item is exactly at the front.
export function snapPhase(phase, n) {
  if (!n) return phase;
  const step = stepAngle(n);
  return Math.round(phase / step) * step;
}

export const DEFAULTS = {
  rx: 420, // horizontal radius of the platform, px
  rz: 420, // depth radius, px (a circle: rz = rx; a flatter ellipse: rz < rx)
  ry: 26, // how far the back of the platform rises on screen, px (camera slightly above)
  focal: 2.4, // camera distance as a multiple of rz; smaller = stronger perspective
  minOpacity: 0.18,
  maxBlur: 1.6,
  hideBehind: 0.06, // depth below which an item is fully hidden (directly behind)
};

// Per-item presentation for the current phase. Positions come from one perspective
// projection: items further round the circle are both nearer the centre line and smaller,
// which is what makes the ring read as a circle rather than a row of scaled cards.
export function layout(phase, n, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const f = o.focal * o.rz;
  const out = [];
  for (let i = 0; i < n; i++) {
    const theta = normalize(angleFor(i, n, phase));
    const depth = (Math.cos(theta) + 1) / 2; // 1 front … 0 back
    const zc = o.rz * (1 - Math.cos(theta)); // distance behind the front point, 0 … 2rz
    const k = f / (f + zc); // perspective factor, 1 at the front
    const hidden = depth < o.hideBehind;
    out.push({
      index: i,
      theta,
      depth,
      x: o.rx * Math.sin(theta) * k,
      y: -(1 - depth) * o.ry * k,
      scale: k,
      opacity: hidden ? 0 : o.minOpacity + (1 - o.minOpacity) * Math.pow(depth, 1.1),
      blur: (1 - depth) * o.maxBlur,
      z: Math.round(depth * 1000),
      front: Math.abs(theta) < stepAngle(n) / 2 - 1e-9 || n === 1,
    });
  }
  return out;
}

// Exponential approach used by the animation loop: returns the next phase.
export function approach(phase, target, dt, timeConstant = 0.13) {
  const k = 1 - Math.exp(-dt / timeConstant);
  return phase + (target - phase) * k;
}
