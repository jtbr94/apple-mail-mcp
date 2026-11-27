(function () {
  'use strict';
  var track = document.querySelector('[data-track]');
  if (!track) return;
  var slides = Array.prototype.slice.call(track.querySelectorAll('.slide'));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-goto]'));
  var nameEl = document.querySelector('[data-current-name]');
  var countEl = document.querySelector('[data-count]');
  var prev = document.querySelector('[data-prev]');
  var next = document.querySelector('[data-next]');
  var desktop = window.matchMedia('(min-width: 810px)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var current = 0;
  var lock = 0;

  function slideWidth() { return slides[0] ? slides[0].getBoundingClientRect().width : track.clientWidth; }

  function goTo(i, instant) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: i * slideWidth(), behavior: instant || reduced.matches ? 'auto' : 'smooth' });
  }

  function setActive(i) {
    if (i === current && track.dataset.ready) return;
    current = i;
    track.dataset.ready = '1';
    var slug = slides[i].dataset.slug;
    tabs.forEach(function (t, k) { t.toggleAttribute('aria-current', k === i); });
    slides.forEach(function (s, k) { s.classList.toggle('active', k === i); });
    if (nameEl) nameEl.textContent = slides[i].querySelector('.title').textContent;
    if (countEl) countEl.textContent = (i + 1) + ' / ' + slides.length;
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === slides.length - 1;
    if (history.replaceState) history.replaceState(null, '', '#' + slug);
    track.dispatchEvent(new CustomEvent('carousel:change', { bubbles: true, detail: { index: i, slug: slug } }));
  }

  var raf = 0;
  track.addEventListener('scroll', function () {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      setActive(Math.round(track.scrollLeft / slideWidth()));
    });
  }, { passive: true });

  if (prev) prev.addEventListener('click', function () { goTo(current - 1); });
  if (next) next.addEventListener('click', function () { goTo(current + 1); });
  tabs.forEach(function (t) { t.addEventListener('click', function () { goTo(Number(t.dataset.goto)); }); });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowRight') { goTo(current + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { goTo(current - 1); e.preventDefault(); }
  });

  // Mouse wheel glides between coffees on desktop; trackpads already scroll the track sideways.
  var acc = 0;
  track.addEventListener('wheel', function (e) {
    if (!desktop.matches || track.dataset.wheel === 'off') return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // native horizontal swipe
    var body = e.target.closest && e.target.closest('.body');
    if (body && body.scrollHeight > body.clientHeight + 2) {
      var atTop = body.scrollTop <= 0 && e.deltaY < 0;
      var atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 1 && e.deltaY > 0;
      if (!atTop && !atBottom) return; // let the details column scroll first
    }
    e.preventDefault();
    var now = Date.now();
    if (now < lock) return;
    acc += e.deltaY;
    if (Math.abs(acc) > 60) {
      goTo(current + (acc > 0 ? 1 : -1));
      acc = 0;
      lock = now + 650;
    }
  }, { passive: false });

  // Deep link: /#guji opens on that coffee.
  var start = 0;
  if (location.hash) {
    var idx = slides.findIndex(function (s) { return '#' + s.dataset.slug === location.hash; });
    if (idx > -1) start = idx;
  }
  goTo(start, true);
  setActive(start);
  if (location.hash) window.scrollTo(0, 0); // the native anchor jump would tuck the row header under the nav
  window.addEventListener('resize', function () { goTo(current, true); });
})();
