// Procedural 3D coffee bags, one per [data-bag] element, rendered through a single WebGL canvas.
// Each bag "digitises" in (wireframe → scanline → solid) when it enters view, idles with a slow sway,
// tilts toward the pointer and can be dragged to spin. A real GLB per coffee can replace the procedural bag.
import * as THREE from 'three';

const dataEl = document.getElementById('bag-data');
const targets = Array.from(document.querySelectorAll('[data-bag]'));
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

if (dataEl && targets.length && webglOk()) {
  const DATA = JSON.parse(dataEl.textContent);
  document.documentElement.classList.add('has-3d');
  boot(DATA).catch((err) => {
    console.error('3D bags failed, showing photos instead', err);
    document.documentElement.classList.remove('has-3d');
  });
}

async function boot(DATA) {
  await (document.fonts?.ready || Promise.resolve());

  const canvas = document.createElement('canvas');
  canvas.className = 'bag-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setScissorTest(true);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const ink = new THREE.Color();
  const readInk = () => ink.set(getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() || '#1c1917');
  readInk();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readInk);

  const paper = new THREE.Color(DATA.paperColor || '#ebe7df');
  const shared = { grain: makeGrain(), shadow: makeShadow() };

  const items = await Promise.all(
    targets.map(async (el) => {
      const slug = el.dataset.bag;
      const coffee = DATA.coffees[slug];
      if (!coffee) return null;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 30);
      camera.position.set(0, 0.05, 4.6);
      camera.lookAt(0, 0, 0);
      light(scene);

      const group = new THREE.Group();
      scene.add(group);
      const reveal = { value: reduced.matches ? 1 : 0, target: reduced.matches ? 1 : 0, uniforms: [] };
      let bounds;
      if (coffee.model) {
        try {
          bounds = await loadModel(coffee.model, group, reveal, ink);
        } catch (err) {
          console.warn(`Could not load ${coffee.model}, using the procedural bag`, err);
        }
      }
      if (!bounds) bounds = buildBag(group, coffee, DATA, paper, shared, reveal, ink);

      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: shared.shadow, transparent: true, opacity: 0.22, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = bounds.min.y - 0.01;
      scene.add(shadow);

      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = 'Drag to turn';
      el.appendChild(hint);

      const item = { el, slug, scene, camera, group, reveal, shadow, rot: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, pointer: { x: 0, y: 0, over: false }, drag: null, visible: false, seen: false, t: Math.random() * 10 };
      interaction(item);
      return item;
    })
  );
  const live = items.filter(Boolean);

  // Reveal when an element is mostly in view; reset when it leaves so gliding back re-digitises it.
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const it = live.find((x) => x.el === e.target);
        if (!it) continue;
        it.visible = e.isIntersecting;
        if (e.intersectionRatio >= 0.55) {
          it.reveal.target = 1;
          it.seen = true;
        } else if (!e.isIntersecting && !reduced.matches) {
          it.reveal.target = 0;
          it.reveal.value = 0;
        }
      }
    },
    { threshold: [0, 0.55] }
  );
  live.forEach((it) => io.observe(it.el));

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
  resize();
  window.addEventListener('resize', resize);

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (document.hidden) return;
    const H = canvas.clientHeight;
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    for (const it of live) {
      const r = it.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.right < 0 || r.left > canvas.clientWidth || r.width < 2 || r.height < 2) continue;
      update(it, dt);
      const w = Math.round(r.width), h = Math.round(r.height), x = Math.round(r.left), y = Math.round(H - r.bottom);
      renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, w, h);
      it.camera.aspect = w / h;
      it.camera.updateProjectionMatrix();
      renderer.render(it.scene, it.camera);
    }
  }
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = true;
  requestAnimationFrame((t) => { last = t; frame(t); });

  function update(it, dt) {
    it.t += dt;
    // digitise progress
    const speed = it.reveal.target > it.reveal.value ? 0.55 : 3;
    it.reveal.value += (it.reveal.target - it.reveal.value) * Math.min(1, dt * speed * 3);
    if (Math.abs(it.reveal.target - it.reveal.value) < 0.002) it.reveal.value = it.reveal.target;
    for (const u of it.reveal.uniforms) u.uReveal.value = it.reveal.value;

    // motion: idle sway + pointer tilt + drag inertia
    const idleY = reduced.matches ? 0 : Math.sin(it.t * 0.6) * 0.18;
    const idleX = reduced.matches ? 0 : Math.sin(it.t * 0.45 + 1) * 0.03;
    if (!it.drag) {
      it.rot.y += it.vel.y;
      it.rot.x += it.vel.x;
      it.vel.y *= 0.92;
      it.vel.x *= 0.92;
      it.rot.y += (0 - it.rot.y) * dt * 0.8; // ease back toward the front
      it.rot.x += (0 - it.rot.x) * dt * 1.2;
    }
    const tiltY = it.pointer.over ? it.pointer.x * 0.35 : 0;
    const tiltX = it.pointer.over ? -it.pointer.y * 0.2 : 0;
    const ty = idleY + tiltY + it.rot.y;
    const tx = idleX + tiltX + it.rot.x;
    it.group.rotation.y += (ty - it.group.rotation.y) * Math.min(1, dt * 6);
    it.group.rotation.x += (tx - it.group.rotation.x) * Math.min(1, dt * 6);
    // settle in from slightly below while digitising
    const lift = (1 - easeOut(it.reveal.value)) * -0.12;
    it.group.position.y += (lift - it.group.position.y) * Math.min(1, dt * 6);
    it.shadow.material.opacity = 0.22 * it.reveal.value;
  }
}

function easeOut(x) { return 1 - Math.pow(1 - x, 3); }

function light(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc8bd, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(-2.2, 3, 3.5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff4e8, 0.5);
  fill.position.set(2.5, 0.5, 2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.6);
  rim.position.set(0.5, 2, -3);
  scene.add(rim);
}

/* ---------- procedural bag ---------- */
const W = 1.08, Hh = 1.16, D = 0.42;
function bulge(xn, yn) {
  // xn -1..1 across, yn 0..1 bottom→top. Pillow bulge, fading at the bottom gusset and the top seal.
  const across = Math.pow(Math.max(0, Math.cos((xn * Math.PI) / 2)), 0.9);
  const up = Math.sin(Math.PI * Math.min(1, yn / 0.93));
  return 0.11 * across * up;
}
function pinch(yn) {
  const s = smooth(0.72, 1.0, yn);
  return 1 - 0.94 * s; // thickness → 6% at the seal
}
function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

function bagGeometry() {
  const g = new THREE.BoxGeometry(W, Hh, D, 40, 56, 10);
  const p = g.attributes.position;
  const halfD = D / 2;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const xn = x / (W / 2);
    const yn = (y + Hh / 2) / Hh;
    const zn = z / halfD; // -1..1
    const thick = pinch(yn);
    const width = 1 - 0.06 * smooth(0.8, 1, yn);
    // round the vertical edges a touch
    const edge = Math.pow(Math.abs(xn), 6) * Math.abs(zn) * 0.03;
    z = z * thick + Math.sign(zn || 1) * bulge(xn, yn) * Math.abs(zn) - Math.sign(zn || 1) * edge;
    x = x * width;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

function buildBag(group, coffee, DATA, paper, shared, reveal, ink) {
  const geo = bagGeometry();
  const mat = new THREE.MeshPhysicalMaterial({ color: paper, roughness: 0.82, metalness: 0, sheen: 0.35, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xffffff), bumpMap: shared.grain, bumpScale: 0.35 });
  digitise(mat, reveal, ink, Hh);
  const bag = new THREE.Mesh(geo, mat);
  group.add(bag);

  // seal strip along the top
  const seal = new THREE.Mesh(new THREE.BoxGeometry(W * 0.95, 0.045, 0.035, 1, 1, 1), new THREE.MeshPhysicalMaterial({ color: paper.clone().multiplyScalar(0.96), roughness: 0.75 }));
  digitise(seal.material, reveal, ink, Hh);
  seal.position.y = Hh / 2 + 0.01;
  group.add(seal);

  // label conforming to the front bulge
  const Ls = 0.46, lx = -0.2, ly = -0.22;
  const lg = new THREE.PlaneGeometry(Ls, Ls, 18, 18);
  const lp = lg.attributes.position;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i) + lx, y = lp.getY(i) + ly;
    const xn = x / (W / 2), yn = (y + Hh / 2) / Hh;
    lp.setZ(i, (D / 2) * pinch(yn) + bulge(xn, yn) + 0.003);
  }
  lg.computeVertexNormals();
  const lm = new THREE.MeshStandardMaterial({ map: labelTexture(coffee, DATA), roughness: 0.55, metalness: 0, emissive: new THREE.Color(0x3a3733), emissiveMap: labelTexture(coffee, DATA), emissiveIntensity: 0.35 });
  digitise(lm, reveal, ink, Hh);
  const label = new THREE.Mesh(lg, lm);
  label.position.set(lx, ly, 0);
  group.add(label);

  // wireframe ghost shown above the scan line while digitising
  const wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: ink, wireframe: true, transparent: true, opacity: 0.28, depthWrite: false }));
  digitise(wire.material, reveal, ink, Hh, true);
  group.add(wire);

  group.scale.setScalar(1.18);
  group.position.y = 0;
  return new THREE.Box3(new THREE.Vector3(-W / 2, -Hh / 2 * 1.18, -D / 2), new THREE.Vector3(W / 2, Hh / 2 * 1.18, D / 2));
}

// Injects the digitise effect into any three.js material: pixels above the sweep line are dropped,
// a thin band in the ink colour marks the line, and a dithered edge dissolves just below it.
function digitise(material, reveal, ink, height, invert = false) {
  material.transparent = material.transparent || false;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uReveal = { value: reveal.value };
    shader.uniforms.uInk = { value: ink };
    shader.uniforms.uHalf = { value: (height / 2) * 1.18 };
    shader.uniforms.uInvert = { value: invert ? 1 : 0 };
    reveal.uniforms.push(shader.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vDigY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDigY = (modelMatrix * vec4(position, 1.0)).y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vDigY;\nuniform float uReveal; uniform vec3 uInk; uniform float uHalf; uniform float uInvert;')
      .replace(
        'void main() {',
        `void main() {
  float yn = (vDigY + uHalf) / (2.0 * uHalf);
  float edge = uReveal * 1.45 - 0.15;
  vec2 cell = floor(gl_FragCoord.xy / 3.0);
  float n = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
  float dissolve = step(n, clamp((edge - yn) / 0.14, 0.0, 1.0));
  float solid = yn <= edge ? dissolve : 0.0;
  if (uReveal >= 0.999) solid = 1.0;
  if (uInvert < 0.5 && solid < 0.5) discard;
  if (uInvert > 0.5 && (solid > 0.5 || uReveal >= 0.999)) discard;`
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
  float band = (1.0 - smoothstep(0.0, 0.05, edge - yn)) * step(yn, edge) * step(uReveal, 0.999);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uInk, band * 0.85);`
      );
  };
  material.customProgramCacheKey = () => `digitise-${invert}`;
}

function labelTexture(coffee, DATA) {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = DATA.labelColor || '#f7f5f3';
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = '#1c1917';
  const pad = 80;
  let y = pad + 60;
  ctx.font = `400 72px "Instrument Serif", Georgia, serif`;
  ctx.fillText(DATA.brand || 'Sahkō', pad, y);
  y += 110;
  ctx.font = `500 54px Inter, system-ui, sans-serif`;
  ctx.fillText(coffee.name, pad, y);
  y += 90;
  ctx.font = `400 36px Inter, system-ui, sans-serif`;
  const lines = [];
  const spec = Object.fromEntries(coffee.specs);
  const push = (k) => { if (spec[k]) lines.push(`${k}: ${spec[k]}`); };
  push('Region'); push('Varietal'); lines.push(''); push('Processing'); push('Harvest'); lines.push(''); push('Acidity'); push('Body'); lines.push(''); lines.push(`Lot #: ${coffee.lot}`);
  for (const line of lines) {
    if (line) {
      for (const part of wrap(ctx, line, S - pad * 2)) { ctx.fillText(part, pad, y); y += 46; }
    } else y += 22;
    if (y > S - pad) break;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
function wrap(ctx, text, max) {
  const words = text.split(' '), out = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}

function makeGrain() {
  const S = 256, c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let i = 0; i < img.data.length; i += 4) { const v = 118 + Math.random() * 20; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 8);
  return t;
}
function makeShadow() {
  const S = 256, c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(28,25,23,1)');
  g.addColorStop(0.45, 'rgba(28,25,23,0.35)');
  g.addColorStop(1, 'rgba(28,25,23,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

async function loadModel(url, group, reveal, ink) {
  const { GLTFLoader } = await import('/assets/vendor/jsm/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const s = 1.5 / Math.max(size.x, size.y, size.z);
  root.scale.setScalar(s);
  box.setFromObject(root);
  root.position.sub(box.getCenter(new THREE.Vector3()));
  box.setFromObject(root);
  root.traverse((o) => { if (o.isMesh) digitise(o.material, reveal, ink, size.y * s); });
  group.add(root);
  return box;
}

function interaction(it) {
  const el = it.el;
  const norm = (e) => {
    const r = el.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 };
  };
  el.addEventListener('pointerenter', () => { it.pointer.over = true; });
  el.addEventListener('pointerleave', () => { it.pointer.over = false; });
  el.addEventListener('pointermove', (e) => {
    const n = norm(e);
    it.pointer.x = n.x; it.pointer.y = n.y;
    if (it.drag) {
      const dx = e.clientX - it.drag.x, dy = e.clientY - it.drag.y;
      it.vel.y = dx * 0.012; it.vel.x = dy * 0.006;
      it.rot.y += it.vel.y; it.rot.x = Math.max(-0.6, Math.min(0.6, it.rot.x + it.vel.x));
      it.drag.x = e.clientX; it.drag.y = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 2) el.classList.add('dragged');
    }
  });
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return; // keep horizontal swipe for the carousel on touch
    it.drag = { x: e.clientX, y: e.clientY };
    el.classList.add('dragging');
    el.setPointerCapture?.(e.pointerId);
  });
  const end = () => { it.drag = null; el.classList.remove('dragging'); };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('lostpointercapture', end);
}
