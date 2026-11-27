(function () {
  'use strict';

  // Live date in the nav, like the original ("Friday, November 27, 2026").
  var dateEl = document.querySelector('[data-date]');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Phone accordion: the "+" in each sticky row header reveals the specs and pre-order form.
  document.querySelectorAll('.coffee .toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = btn.closest('.coffee');
      var open = row.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      if (open) row.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  function money(amount, currency, locale) {
    try {
      return new Intl.NumberFormat(locale || 'en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format(amount / 100);
    } catch (e) {
      return (amount / 100).toFixed(2);
    }
  }

  // Pre-order forms: keep the button total in sync, then hand off to Stripe Checkout.
  document.querySelectorAll('form.preorder').forEach(function (form) {
    var qty = form.querySelector('.qty-input');
    var total = form.querySelector('.total');
    var button = form.querySelector('.preorder-button');
    var error = form.querySelector('.preorder-error');
    var max = parseInt(qty.max, 10) || 20;

    function selected() {
      return form.querySelector('input[name="size"]:checked');
    }
    function clampQty() {
      var n = parseInt(qty.value, 10);
      if (!n || n < 1) n = 1;
      if (n > max) n = max;
      qty.value = n;
      return n;
    }
    function update() {
      var s = selected();
      if (!s) return;
      var n = clampQty();
      total.textContent = money(parseInt(s.dataset.amount, 10) * n, form.dataset.currency, form.dataset.locale);
    }
    function showError(msg) {
      error.textContent = msg;
      error.hidden = !msg;
    }

    form.querySelectorAll('.qty-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        qty.value = (parseInt(qty.value, 10) || 1) + parseInt(b.dataset.step, 10);
        update();
      });
    });
    qty.addEventListener('input', update);
    form.querySelectorAll('input[name="size"]').forEach(function (r) { r.addEventListener('change', update); });
    update();

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      showError('');
      var s = selected();
      if (!s) return showError('Choose a size.');
      var quantity = clampQty();

      // No backend needed when a Stripe Payment Link is configured for this size.
      if (s.dataset.link) {
        var link = s.dataset.link;
        window.location.href = link + (link.indexOf('?') === -1 ? '?' : '&') + 'quantity=' + quantity;
        return;
      }

      button.disabled = true;
      fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: form.dataset.slug, size: s.value, quantity: quantity })
      })
        .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
        .then(function (res) {
          if (!res.ok || !res.data.url) throw new Error(res.data.error || 'Checkout is unavailable right now.');
          window.location.href = res.data.url;
        })
        .catch(function (err) {
          button.disabled = false;
          showError(err.message || 'Something went wrong. Please try again.');
        });
    });
  });

  // Thank-you page: show what was ordered.
  var success = document.querySelector('[data-success]');
  if (success) {
    var id = new URLSearchParams(window.location.search).get('session_id');
    var itemsEl = success.querySelector('[data-success-items]');
    var lead = success.querySelector('[data-success-lead]');
    if (id) {
      fetch('/api/session?id=' + encodeURIComponent(id))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (o) {
          if (!o) return;
          if (o.email) lead.textContent = 'Your pre-order is confirmed. A receipt has been sent to ' + o.email + '.';
          if (o.items && o.items.length) {
            var html = '<div class="order-items">';
            o.items.forEach(function (it) {
              html += '<p>' + it.quantity + ' × ' + it.description + ' — ' + money(it.amount, o.currency) + '</p>';
            });
            html += '<p><strong>Total</strong>: ' + money(o.amountTotal, o.currency) + '</p></div>';
            itemsEl.innerHTML = html;
            itemsEl.hidden = false;
          }
        })
        .catch(function () {});
    }
  }
})();
