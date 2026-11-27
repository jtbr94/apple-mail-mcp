// Gallery controller: orbital carousel + shared-element inspection + discovery modes.
import * as O from './orbit.js';
import { transition, initial, BROWSING, ENTERING, INSPECTING, RETURNING } from './state.js';

const scene = document.querySelector('[data-scene]');
if (scene) boot(scene);

function boot(scene) {
  const catalogue = JSON.parse(document.getElementById('catalogue').textContent);
  const coffees = catalogue.coffees;
  const stage = scene.querySelector('[data-stage]');
  const orbit = scene.querySelector('[data-orbit]');
  const items = Array.from(orbit.children);
  const indicator = Array.from(scene.querySelectorAll('[data-indicator] li'));
  const plate = { name: scene.querySelector('[data-plate-name]'), origin: scene.querySelector('[data-plate-origin]'), notes: scene.querySelector('[data-plate-notes]'), link: scene.querySelector('[data-plate-link]') };
  const live = scene.querySelector('[data-live]');
  const inspection = scene.querySelector('[data-inspection]');
  const backLink = scene.querySelector('[data-back]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ms = () => (reduced.matches ? 0 : 1);
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  // Real deployments route /coffee/<slug>/; the hosted sandbox can only change the hash.
  const hashRouting = document.documentElement.dataset.routing === 'hash';
  const inspectUrl = (slug) => (hashRouting ? `#inspect-${slug}` : `/coffee/${slug}/`);
  const browseUrl = (slug) => (hashRouting ? `#${slug}` : `/#${slug}`);
  const routeSlug = () => { const m = hashRouting ? location.hash.match(/^#inspect-([a-z0-9-]+)$/) : location.pathname.match(/^\/coffee\/([a-z0-9-]+)\/?$/); return m ? m[1] : null; };
  const atHome = () => (hashRouting ? !/^#inspect-/.test(location.hash) : location.pathname === '/');

  // ----- orbit state -----
  let order = coffees.map((_, i) => i); // indices currently in the orbit (filters narrow it)
  let phase = 0, target = 0, raf = 0, last = 0;
  let geo = { rx: 420, ry: 26 };
  let drag = null;
  let suppressClickUntil = 0;
  let st = initial;
  let pushed = 0; // history entries we created
  let running = { anims: [], seq: 0 };

  const bySlug = (slug) => coffees.findIndex((c) => c.slug === slug);
  const posOf = (idx) => order.indexOf(idx);
  const frontIdx = () => (order.length ? order[O.frontIndex(target, order.length)] : -1);

  function measure() {
    const r = stage.getBoundingClientRect();
    const phone = r.width < 810;
    const bagW = phone ? Math.min(r.width * 0.68, 300) : Math.min(Math.max(r.height * 0.46, 220), 440, r.width * 0.36);
    const rx = phone ? Math.max(r.width * 0.62, 160) : Math.min(Math.max(r.width * 0.4, 180), 600);
    geo = { rx, rz: rx * 0.9, ry: phone ? 34 : Math.round(r.height * 0.11), focal: 2.2 };
    const cy = phone ? 0.4 : 0.51;
    stage.style.setProperty('--bag-w', `${Math.round(bagW)}px`);
    stage.style.setProperty('--cy', `${cy * 100}%`);
    // the plinth line sits under the front bag: the image is centred 6% above cy and the bag graphic ends at 90% of the image height
    stage.style.setProperty('--plinth-y', `${Math.round(r.height * cy + bagW * 0.34 + 2)}px`);
  }

  function render() {
    const n = order.length;
    const L = O.layout(phase, n, geo);
    items.forEach((li) => li.classList.add('is-out'));
    L.forEach((p, k) => {
      const li = items[order[k]];
      li.classList.remove('is-out');
      li.style.setProperty('--x', `${p.x.toFixed(2)}px`);
      li.style.setProperty('--y', `${p.y.toFixed(2)}px`);
      li.style.setProperty('--s', p.scale.toFixed(4));
      li.style.setProperty('--o', p.opacity.toFixed(3));
      li.style.setProperty('--z', String(p.z));
      li.style.setProperty('--blur', `${p.blur.toFixed(2)}px`);
      li.classList.toggle('is-front', p.front);
    });
  }

  function settle() {
    const idx = frontIdx();
    if (idx < 0) return;
    const c = coffees[idx];
    items.forEach((li, i) => {
      const a = li.querySelector('a');
      const front = i === idx;
      a.tabIndex = front ? 0 : -1;
      if (front) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    indicator.forEach((d, i) => d.classList.toggle('on', i === idx));
    plate.name.textContent = c.name;
    plate.origin.textContent = `${c.region}, ${c.country}${c.process ? ' · ' + c.process : ''}`;
    plate.notes.textContent = c.notes.slice(0, 3).join(', ');
    plate.link.href = inspectUrl(c.slug);
    plate.link.dataset.inspect = c.slug;
    backLink.href = browseUrl(c.slug);
    live.textContent = `${c.name}, ${c.country}. ${posOf(idx) + 1} of ${order.length}.`;
    if (st.state === BROWSING && atHome()) history.replaceState(history.state, '', `${location.search}#${c.slug}`);
  }

  function loop(now) {
    const dt = Math.min((now - (last || now)) / 1000, 0.05);
    last = now;
    phase = O.approach(phase, target, dt);
    if (Math.abs(target - phase) < 0.0006) { phase = target; render(); raf = 0; last = 0; settle(); return; }
    render();
    raf = requestAnimationFrame(loop);
  }

  function animateTo(t) {
    target = t;
    if (!ms()) { phase = t; render(); settle(); return; }
    if (!raf) raf = requestAnimationFrame(loop);
  }
  const step = () => O.stepAngle(order.length);
  const next = () => order.length > 1 && animateTo(target - step());
  const prev = () => order.length > 1 && animateTo(target + step());
  function goToIndex(idx, direction = 0) {
    const pos = posOf(idx);
    if (pos < 0) return;
    animateTo(O.phaseForIndex(pos, order.length, target, direction));
  }

  // ----- controls -----
  scene.querySelector('[data-next]').addEventListener('click', next);
  scene.querySelector('[data-prev]').addEventListener('click', prev);
  stage.addEventListener('keydown', (e) => {
    if (st.state !== BROWSING) return;
    if (e.key === 'ArrowRight') { next(); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { prev(); e.preventDefault(); }
  });

  // drag / swipe on the stage; clicks on bags select or inspect
  stage.addEventListener('pointerdown', (e) => {
    if (st.state !== BROWSING || e.button !== 0 || e.target.closest('button')) return;
    drag = { id: e.pointerId, x0: e.clientX, phase0: target, moved: false, lastX: e.clientX, lastT: performance.now(), v: 0 };
    if (raf) { cancelAnimationFrame(raf); raf = 0; last = 0; }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; stage.classList.add('dragging'); stage.setPointerCapture?.(e.pointerId); }
    if (!drag.moved) return;
    const now = performance.now();
    drag.v = (e.clientX - drag.lastX) / Math.max(now - drag.lastT, 1);
    drag.lastX = e.clientX; drag.lastT = now;
    phase = drag.phase0 + dx / geo.rx;
    render();
  });
  const endDrag = (e, cancelled) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    stage.classList.remove('dragging');
    if (!d.moved) return;
    suppressClickUntil = performance.now() + 350;
    // snap, letting a brisk flick carry at most one extra step
    let t = phase;
    if (!cancelled) t += Math.max(-1, Math.min(1, d.v * 0.5)) * step() * 0.5;
    animateTo(O.snapPhase(t, order.length));
  };
  stage.addEventListener('pointerup', (e) => endDrag(e, false));
  stage.addEventListener('pointercancel', (e) => endDrag(e, true));
  stage.addEventListener('lostpointercapture', (e) => endDrag(e, true));

  scene.addEventListener('click', (e) => {
    const link = e.target.closest('[data-inspect]');
    if (!link) return;
    if (performance.now() < suppressClickUntil) { e.preventDefault(); return; }
    const idx = bySlug(link.dataset.inspect);
    const li = link.closest('.bag');
    if (li && idx !== frontIdx()) { e.preventDefault(); goToIndex(idx); return; } // peripheral bag: bring it round
    if (st.state !== BROWSING && st.state !== RETURNING) return;
    e.preventDefault();
    if (idx !== frontIdx()) { goToIndex(idx); }
    inspect(coffees[idx].slug, { push: true });
  });
  backLink.addEventListener('click', (e) => { e.preventDefault(); leave({ push: true }); });

  // ----- inspection choreography -----
  let decorative = [];
  function cancelRunning() {
    running.anims.concat(decorative).forEach((a) => { try { a.cancel(); } catch {} });
    running.anims = []; decorative = [];
  }

  function flip(img, firstRect, duration) {
    const lastRect = img.getBoundingClientRect();
    const dx = firstRect.left - lastRect.left, dy = firstRect.top - lastRect.top;
    const sx = firstRect.width / lastRect.width, sy = firstRect.height / lastRect.height;
    const a = img.animate(
      [{ transformOrigin: 'top left', transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transformOrigin: 'top left', transform: 'none' }],
      { duration: duration * ms(), easing: EASE, fill: 'both' }
    );
    a.finished.then(() => a.cancel()).catch(() => {});
    return a;
  }

  function reveal(panel, seq) {
    const info = panel.querySelector('.detail-info');
    const lines = Array.from(info.querySelectorAll('[data-reveal]'));
    panel.classList.add('is-revealed');
    // choreography (ms): neighbours recede 0–350, bag glides 0–750, name 350, metadata 450–700, notes & purchase 650–1100
    let specIndex = 0;
    const timing = (el) => {
      if (el.matches('.eyebrow')) return 300;
      if (el.matches('.name')) return 350;
      if (el.matches('.intro')) return 430;
      if (el.matches('.origin, .tags')) return 480;
      if (el.matches('.spec')) return 500 + specIndex++ * 22;
      if (el.matches('.prose')) return 600;
      if (el.matches('.notes')) return 660;
      if (el.matches('.purchase')) return 740;
      return 500;
    };
    lines.forEach((el) => {
      const a = el.animate(
        [{ clipPath: 'inset(0 0 100% 0)', opacity: 0, transform: 'translateY(8px)' }, { clipPath: 'inset(0 0 -4px 0)', opacity: 1, transform: 'none' }],
        { duration: 360 * ms(), delay: timing(el) * ms(), easing: EASE, fill: 'backwards' }
      );
      running.anims.push(a);
    });
    decode(panel.querySelector('.decode'), seq);
    // icon strokes draw themselves in, but they are decoration: they do not gate the "inspecting" state
    const strokes = panel.querySelectorAll('.notes .sicon path, .notes .sicon circle, .notes .sicon ellipse');
    strokes.forEach((p, i) => {
      let len = 60; try { len = p.getTotalLength(); } catch {}
      const a = p.animate([{ strokeDasharray: len, strokeDashoffset: len }, { strokeDasharray: len, strokeDashoffset: 0 }], { duration: 420 * ms(), delay: (700 + i * 14) * ms(), easing: EASE, fill: 'backwards' });
      decorative.push(a);
    });
  }

  // brief character decode on the small eyebrow only; final text is the DOM text, assistive tech never sees the scramble
  function decode(el, seq) {
    if (!el || !ms()) return;
    const final = el.dataset.text;
    el.setAttribute('aria-label', final);
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const start = performance.now(), dur = 420;
    const tick = (now) => {
      if (running.seq !== seq) { el.textContent = final; return; }
      const t = Math.min(1, (now - start) / dur);
      const settled = Math.floor(t * final.length);
      el.textContent = final.split('').map((ch, i) => (i < settled || !/[A-Za-z0-9]/.test(ch) ? ch : glyphs[(Math.random() * glyphs.length) | 0])).join('');
      if (t < 1) requestAnimationFrame(tick); else el.textContent = final;
    };
    requestAnimationFrame(tick);
  }

  function setState(next) {
    st = next;
    scene.dataset.state = st.state;
    // while a bag is inspected the stage is inert for keyboard and assistive tech, and vice versa
    const browsing = st.state === BROWSING;
    stage.inert = !browsing;
    scene.querySelector('.plate').inert = !browsing;
    scene.querySelector('.modes').inert = !browsing;
    scene.querySelector('[data-filters]').inert = !browsing;
    inspection.inert = browsing && inspection.hidden;
  }

  function inspect(slug, { push }) {
    const idx = bySlug(slug);
    if (idx < 0) return;
    const prevSt = st;
    setState(transition(st, { type: 'INSPECT', slug }));
    if (st === prevSt) return;
    const seq = ++running.seq;
    const li = items[idx];
    const img = li.querySelector('img') || inspection.querySelector(`[data-detail="${CSS.escape(st.last || '')}"] img.bag-img`) || document.querySelector(`img.bag-img[alt^="${coffees[idx].name}"]`);
    const first = img.getBoundingClientRect();
    cancelRunning();
    // put any previously inspected bag back where it belongs
    inspection.querySelectorAll('.detail:not([hidden])').forEach((p) => { if (p.dataset.detail !== slug) { restoreImage(p.dataset.detail); p.hidden = true; p.classList.remove('is-revealed'); } });
    items.forEach((l) => l.classList.toggle('is-chosen', l === li));
    const panel = inspection.querySelector(`[data-detail="${CSS.escape(slug)}"]`);
    panel.hidden = false;
    panel.classList.remove('is-revealed');
    inspection.hidden = false;
    inspection.scrollTop = 0;
    scene.classList.add('has-slot');
    panel.querySelector('[data-slot]').appendChild(img);
    const move = flip(img, first, 750);
    running.anims.push(move);
    reveal(panel, seq);
    document.title = `${coffees[idx].name} – ${catalogue.brand}`;
    if (push) { history.pushState({ slug }, '', inspectUrl(slug)); pushed++; }
    Promise.allSettled(running.anims.map((a) => a.finished)).then(() => {
      if (running.seq !== seq) return;
      setState(transition(st, { type: 'DONE', seq: st.seq }));
      if (st.state === INSPECTING) panel.querySelector('.name').focus({ preventScroll: true });
    });
  }

  function restoreImage(slug) {
    const idx = bySlug(slug);
    if (idx < 0) return;
    const img = inspection.querySelector(`[data-detail="${CSS.escape(slug)}"] img.bag-img`);
    if (img) items[idx].querySelector('a').appendChild(img);
  }

  function leave({ push }) {
    const prevSt = st;
    setState(transition(st, { type: 'BACK' }));
    if (st === prevSt) return;
    const seq = ++running.seq;
    const slug = st.slug;
    const idx = bySlug(slug);
    const panel = inspection.querySelector(`[data-detail="${CSS.escape(slug)}"]`);
    const img = panel.querySelector('img.bag-img');
    const first = img ? img.getBoundingClientRect() : null;
    cancelRunning();
    goToIndex(idx); // make sure the orbit has this bag at the front
    phase = target; render();
    items[idx].querySelector('a').appendChild(img);
    scene.classList.remove('has-slot');
    const fade = inspection.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320 * ms(), easing: EASE, fill: 'forwards' });
    running.anims.push(fade);
    if (first) running.anims.push(flip(img, first, 650));
    document.title = `${catalogue.brand} – Specialty Coffee`;
    if (push) { if (pushed > 0) { pushed--; history.back(); } else history.replaceState(null, '', browseUrl(slug)); }
    Promise.allSettled(running.anims.map((a) => a.finished)).then(() => {
      if (running.seq !== seq) return;
      fade.cancel();
      panel.hidden = true; panel.classList.remove('is-revealed');
      inspection.hidden = true;
      items[idx].classList.remove('is-chosen');
      setState(transition(st, { type: 'DONE', seq: st.seq }));
      settle();
      items[idx].querySelector('a').focus({ preventScroll: true });
    });
  }

  // routes: /coffee/<slug>/ ↔ /#slug, browser back/forward
  const onRoute = () => {
    const slug = routeSlug();
    if (slug) { pushed = Math.max(0, pushed - 1); inspect(slug, { push: false }); }
    else if (st.state !== BROWSING) { pushed = Math.max(0, pushed - 1); leave({ push: false }); }
    else { const h = location.hash.slice(1); const i = bySlug(h); if (i >= 0) goToIndex(i); }
  };
  window.addEventListener('popstate', onRoute);
  if (hashRouting) window.addEventListener('hashchange', onRoute);

  // ----- discovery modes -----
  const modes = Array.from(scene.querySelectorAll('[data-mode]'));
  const filtersBox = scene.querySelector('[data-filters]');
  const rows = { origin: scene.querySelector('[data-filter-row="origin"]'), profile: scene.querySelector('[data-filter-row="profile"]') };
  const countEl = scene.querySelector('[data-filter-count]');
  const clearBtn = scene.querySelector('[data-clear]');
  let mode = 'collection';
  const selected = { origin: new Set(), profile: new Set() };

  function applyFilter() {
    const keepSlug = frontIdx() >= 0 ? coffees[frontIdx()].slug : null;
    let keep = coffees.map((_, i) => i);
    if (mode === 'origin' && selected.origin.size) keep = keep.filter((i) => selected.origin.has(coffees[i].country));
    if (mode === 'profile' && selected.profile.size) keep = keep.filter((i) => coffees[i].families.some((f) => selected.profile.has(f)));
    order = keep;
    const n = order.length;
    let frontPos = Math.max(0, order.indexOf(bySlug(keepSlug)));
    target = phase = n ? O.phaseForIndex(frontPos, n, 0) : 0;
    render(); settle();
    const sel = mode === 'origin' ? selected.origin : selected.profile;
    countEl.textContent = mode === 'collection' ? '' : n === 0 ? 'No coffee matches that yet.' : sel.size ? `${n} of ${coffees.length} coffees` : '';
    if (clearBtn) clearBtn.hidden = !(mode === 'profile' && selected.profile.size);
    const params = new URLSearchParams();
    if (mode !== 'collection') params.set('mode', mode);
    if (sel.size) params.set('f', Array.from(sel).join(','));
    const q = params.toString();
    if (st.state === BROWSING) history.replaceState(history.state, '', `${location.pathname}${q ? '?' + q : ''}${location.hash}`);
  }
  function setMode(m) {
    mode = m;
    modes.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    filtersBox.hidden = m === 'collection';
    Object.entries(rows).forEach(([k, el]) => { el.hidden = k !== m; });
    applyFilter();
  }
  modes.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  scene.querySelectorAll('[data-filter]').forEach((b) => {
    b.addEventListener('click', () => {
      const set = selected[b.dataset.filter];
      const v = b.dataset.value;
      if (b.dataset.filter === 'origin') { const was = set.has(v); set.clear(); if (!was) set.add(v); }
      else { set.has(v) ? set.delete(v) : set.add(v); }
      rows[b.dataset.filter].querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(set.has(x.dataset.value))));
      applyFilter();
    });
  });
  clearBtn?.addEventListener('click', () => { selected.profile.clear(); rows.profile.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', 'false')); applyFilter(); });

  // ----- views inside detail (bag / roasted beans) -----
  scene.addEventListener('click', (e) => {
    const v = e.target.closest('[data-view]');
    if (!v) return;
    const media = v.closest('.detail-media');
    media.classList.toggle('show-beans', v.dataset.view === 'beans');
    media.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b === v)));
  });

  // ----- start -----
  const startHash = location.hash.slice(1); // read before settle() rewrites it
  const params = new URLSearchParams(location.search);
  stage.addEventListener('dragstart', (e) => e.preventDefault()); // links/images must not start a native drag
  measure(); render(); settle();
  window.addEventListener('resize', () => { measure(); render(); });
  if (params.get('mode') === 'origin' || params.get('mode') === 'profile') {
    const m = params.get('mode');
    (params.get('f') || '').split(',').filter(Boolean).forEach((v) => selected[m].add(v));
    rows[m].querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(selected[m].has(x.dataset.value))));
    setMode(m);
  }
  const startSlug = startHash.replace(/^inspect-/, '');
  if (startSlug && bySlug(startSlug) >= 0) { const pos = posOf(bySlug(startSlug)); if (pos >= 0) { target = phase = O.phaseForIndex(pos, order.length, 0); render(); settle(); } }
  if (hashRouting && /^inspect-/.test(startHash) && bySlug(startSlug) >= 0) inspect(startSlug, { push: false });
  if (reduced.matches) scene.classList.add('reduced');
}
