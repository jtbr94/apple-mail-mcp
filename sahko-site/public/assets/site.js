(function () {
  'use strict';
  var ownSrc = (document.currentScript && document.currentScript.src) || '/assets/site.js';

  // Live date (home nav), like the original site.
  var dateEl = document.querySelector('[data-date]');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Theme: system by default; an explicit choice is stored and applied before paint by the inline head script.
  var toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var isDark = function () { var t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : mq.matches; };
    var label = function () { toggle.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme'); };
    toggle.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('sahko-theme', next); } catch (e) {}
      label();
    });
    mq.addEventListener('change', label);
    label();
  }

  // Phone menu.
  var menu = document.querySelector('[data-menu]');
  if (menu) {
    var links = document.getElementById('primary-nav');
    menu.addEventListener('click', function () { var open = links.classList.toggle('is-open'); menu.setAttribute('aria-expanded', String(open)); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && links.classList.contains('is-open')) { links.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); menu.focus(); } });
  }

  function money(amount, currency, locale) {
    try { return new Intl.NumberFormat(locale || 'en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format(amount / 100); }
    catch (e) { return (amount / 100).toFixed(2); }
  }

  // Pre-order forms → Stripe Checkout (or a Payment Link when one is configured for that size).
  document.querySelectorAll('form.preorder').forEach(function (form) {
    var qty = form.querySelector('.qty-input'), total = form.querySelector('.total'), button = form.querySelector('.preorder-button'), error = form.querySelector('.preorder-error');
    var max = parseInt(qty.max, 10) || 20;
    var selected = function () { return form.querySelector('input[name="size"]:checked'); };
    var clampQty = function () { var n = parseInt(qty.value, 10); if (!n || n < 1) n = 1; if (n > max) n = max; qty.value = n; return n; };
    var update = function () { var s = selected(); if (!s) return; total.textContent = money(parseInt(s.dataset.amount, 10) * clampQty(), form.dataset.currency, form.dataset.locale); };
    var showError = function (msg) { error.textContent = msg; error.hidden = !msg; };
    form.querySelectorAll('.qty-btn').forEach(function (b) { b.addEventListener('click', function () { qty.value = (parseInt(qty.value, 10) || 1) + parseInt(b.dataset.step, 10); update(); }); });
    qty.addEventListener('input', update);
    form.querySelectorAll('input[name="size"]').forEach(function (r) { r.addEventListener('change', update); });
    update();
    form.addEventListener('submit', function (ev) {
      ev.preventDefault(); showError('');
      var s = selected(); if (!s) return showError('Choose a size.');
      var quantity = clampQty();
      if (s.dataset.link) { var link = s.dataset.link; window.location.href = link + (link.indexOf('?') === -1 ? '?' : '&') + 'quantity=' + quantity; return; }
      if (button.disabled) return; // no double submission
      button.disabled = true;
      fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: form.dataset.slug, size: s.value, quantity: quantity }) })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (res) { if (!res.ok || !res.data.url) throw new Error(res.data.error || 'Checkout is unavailable right now.'); window.location.href = res.data.url; })
        .catch(function (err) { button.disabled = false; showError(err.message || 'Something went wrong. Please try again.'); });
    });
  });

  // Wholesale / contact inquiry forms.
  document.querySelectorAll('form[data-inquiry]').forEach(function (form) {
    var status = form.querySelector('.form-status');
    var button = form.querySelector('button[type="submit"]');
    var setFieldError = function (name, msg) {
      var input = form.querySelector('[name="' + name + '"]'); if (!input) return;
      var field = input.closest('.field'); var err = field.querySelector('.err');
      if (msg) { if (!err) { err = document.createElement('p'); err.className = 'err'; err.id = input.id + '-err'; field.appendChild(err); } err.textContent = msg; field.classList.add('is-invalid'); input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', err.id); }
      else { if (err) err.remove(); field.classList.remove('is-invalid'); input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
    };
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (button.disabled) return;
      ['name', 'business', 'email', 'location', 'volume', 'message'].forEach(function (n) { setFieldError(n, ''); });
      status.classList.remove('is-error'); status.textContent = 'Sending…';
      button.disabled = true;
      var data = { kind: form.dataset.kind };
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      fetch('/api/inquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); })
        .then(function (res) {
          if (res.ok) { status.textContent = 'Thank you. We will reply by email.'; form.reset(); return; }
          if (res.data.fields) { Object.keys(res.data.fields).forEach(function (k) { setFieldError(k, res.data.fields[k]); }); var firstBad = form.querySelector('[aria-invalid="true"]'); if (firstBad) firstBad.focus(); }
          throw new Error(res.data.error || 'Could not send.');
        })
        .catch(function (err) { status.classList.add('is-error'); status.textContent = err.message; })
        .then(function () { button.disabled = false; });
    });
  });

  // Thank-you page: show what was ordered.
  var success = document.querySelector('[data-success]');
  if (success) {
    var id = new URLSearchParams(window.location.search).get('session_id');
    var itemsEl = success.querySelector('[data-success-items]'), lead = success.querySelector('[data-success-lead]');
    if (id) fetch('/api/session?id=' + encodeURIComponent(id)).then(function (r) { return r.ok ? r.json() : null; }).then(function (o) {
      if (!o) return;
      if (o.email) lead.textContent = 'Your pre-order is confirmed. A receipt has been sent to ' + o.email + '.';
      if (o.items && o.items.length) { var html = '<div class="order-items">'; o.items.forEach(function (it) { html += '<p>' + it.quantity + ' × ' + it.description + ' — ' + money(it.amount, o.currency) + '</p>'; }); html += '<p><strong>Total</strong>: ' + money(o.amountTotal, o.currency) + '</p></div>'; itemsEl.innerHTML = html; itemsEl.hidden = false; }
    }).catch(function () {});
  }

  // The gallery module is loaded only on the home page.
  if (document.querySelector('[data-scene]')) { var s = document.createElement('script'); s.type = 'module'; s.src = ownSrc.replace(/site\.js(\?.*)?$/, 'atelier.js'); document.body.appendChild(s); }
})();
