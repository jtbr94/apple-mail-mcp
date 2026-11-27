// HTML templates. Everything is plain template strings so there is no framework to install.
import { formatMoney } from '../lib/catalog.js';

// When BASE is set to a relative prefix (e.g. './' or '../../'), every root-absolute URL is rewritten relative to the page.
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const pills = (tags) => `<div class="tags">${tags.map((t) => `<span class="pill">${esc(t)}</span>`).join('')}</div>`;

const specs = (coffee) =>
  `<div class="specs">${coffee.specs.map(([k, v]) => `<p>${esc(k)}: ${esc(v)}</p>`).join('')}</div>`;

export function preorderForm(site, coffee) {
  if (!site.preorder?.enabled || !coffee.offers?.length) return '';
  const offers = coffee.offers
    .map((o, i) => {
      const price = formatMoney(o.amount, site.currency, site.locale);
      return `<label class="size"><input type="radio" name="size" value="${esc(o.size)}" data-amount="${o.amount}" data-price="${esc(price)}" data-link="${esc(o.paymentLink || '')}" ${i === 0 ? 'checked' : ''}><span class="pill pill-button">${esc(o.size)} · ${esc(price)}</span></label>`;
    })
    .join('');
  const first = coffee.offers[0];
  return `
<form class="preorder" data-slug="${esc(coffee.slug)}" data-currency="${esc(site.currency)}" data-locale="${esc(site.locale)}" novalidate>
  <p class="preorder-title">${esc(site.preorder.headline || 'Pre-order')}</p>
  <div class="sizes" role="radiogroup" aria-label="Size">${offers}</div>
  <div class="preorder-row">
    <div class="qty" aria-label="Quantity">
      <button type="button" class="qty-btn" data-step="-1" aria-label="Decrease quantity">−</button>
      <input class="qty-input" type="number" name="quantity" inputmode="numeric" min="1" max="${site.preorder.maxQuantity || 20}" value="1" aria-label="Quantity">
      <button type="button" class="qty-btn" data-step="1" aria-label="Increase quantity">+</button>
    </div>
    <button type="submit" class="button preorder-button"><span class="label">Pre-order</span><span class="dot">·</span><span class="total">${esc(formatMoney(first.amount, site.currency, site.locale))}</span></button>
  </div>
  <p class="preorder-note">${esc(site.preorder.shipsNote || '')}</p>
  <p class="preorder-error" role="alert" hidden></p>
</form>`;
}

export function layout(site, { title, description, path, body, bodyClass = '', extra = '' }) {
  const relative = !!site.__relative;
  const depth = relative ? Math.max(0, path.split('/').filter(Boolean).length - (path.endsWith('/') ? 0 : 1)) : 0;
  const base = relative ? (depth ? '../'.repeat(depth) : './') : '/';
  const fullTitle = title ? `${title} – ${site.brand}` : site.brand;
  const url = `${site.url.replace(/\/+$/, '')}${path}`;
  const current = (href) => (href === '/' ? path === '/' || path.startsWith('/wholesale') : path.startsWith(href));
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || site.tagline)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description || site.tagline)}">
<meta property="og:image" content="${esc(site.url.replace(/\/+$/, ''))}/images/og.png">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@300;400;500&display=swap">
<link rel="stylesheet" href="/assets/styles.css">
</head>
<body class="${esc(bodyClass)}">
<nav class="nav">
  <a class="logo" href="/">${esc(site.brand)}</a>
  <p class="date" data-date aria-live="off"></p>
  <div class="links">${site.nav
    .map((n) => `<a href="${esc(n.href)}" ${current(n.href) ? 'class="current" aria-current="page"' : ''}>${esc(n.label)}</a>`)
    .join('')}</div>
</nav>
<main>
${body}
</main>
${extra || ''}
<script src="/assets/site.js" defer></script>
<script src="/assets/carousel.js" defer></script>
<script type="importmap">{"imports":{"three":"/assets/vendor/three.module.js"}}</script>
${site.bags?.enabled ? '<script type="module" src="/assets/bags.js"></script>' : ''}
</body>
</html>`;
  if (!relative) return html;
  // href="/x", src="/x", url in importmap and data paths → relative to this page; directory links keep their trailing slash
  return html
    .replace(/(href|src|content)="\/(?!\/)([^"]*)"/g, (m, attr, rest) => (attr === 'content' && /^https?:/.test(m) ? m : `${attr}="${base}${rest}"`))
    .replace(/"\/assets\/vendor\/three\.module\.js"/g, `"${base}assets/vendor/three.module.js"`)
    .replace(/"\/images\//g, `"${base}images/`)
    .replace(/'\/images\//g, `'${base}images/`)
    .replace(/\\"image\\":\\"\//g, `\\"image\\":\\"${base}`)
    .replace(/href="(\.\/|(?:\.\.\/)+)"/g, (m, b) => `href="${b}index.html"`)
    .replace(/href="((?:\.\.\/)*(?:\.\/)?[a-z0-9/-]+\/)"/g, (m, b) => `href="${b}index.html"`);
}

export function bagData(site, coffees) {
  const data = {
    paperColor: site.bags?.paperColor || '#ebe7df',
    labelColor: site.bags?.labelColor || '#f7f5f3',
    brand: site.brand,
    coffees: Object.fromEntries(
      coffees.map((c) => [
        c.slug,
        {
          name: c.name,
          specs: c.specs,
          lot: c.lot,
          model: c.model || '',
          image: c.images.bag,
        },
      ])
    ),
  };
  return `<script type="application/json" id="bag-data">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function homePage(site, coffees) {
  const n = coffees.length;
  const slides = coffees
    .map(
      (c, i) => `
<section class="coffee slide" id="${esc(c.slug)}" data-slug="${esc(c.slug)}" data-index="${i}" aria-roledescription="slide" aria-label="${i + 1} of ${n}: ${esc(c.name)}">
  <header class="head">
    <h1 class="title">${esc(c.name)}</h1>
    ${pills(c.tags)}
  </header>
  <div class="media" data-bag="${esc(c.slug)}">
    <img class="fallback" src="${esc(c.images.bag)}" width="1024" height="1024" alt="${esc(c.name)} 1kg bag" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async">
  </div>
  <div class="body">
    ${specs(c)}
    <p class="more"><a href="/wholesale/${esc(c.slug)}/">Learn More</a></p>
    ${preorderForm(site, c)}
  </div>
</section>`
    )
    .join('\n');
  const tabs = coffees
    .map((c, i) => `<button type="button" class="tab" data-goto="${i}" ${i === 0 ? 'aria-current="true"' : ''}>${esc(c.name)}</button>`)
    .join('');
  const body = `
<div class="carousel" data-carousel>
  <div class="track" data-track aria-roledescription="carousel" aria-label="Our coffees" tabindex="0">${slides}</div>
</div>`;
  const extra = `
<div class="bar" data-bar>
  <button type="button" class="arrow" data-prev aria-label="Previous coffee">←</button>
  <div class="tabs" role="tablist" aria-label="Coffees">${tabs}</div>
  <p class="counter" data-counter aria-live="polite"><span data-current-name>${esc(coffees[0].name)}</span> <span class="muted" data-count>1 / ${n}</span></p>
  <button type="button" class="arrow" data-next aria-label="Next coffee">→</button>
</div>
${bagData(site, coffees)}`;
  return layout(site, { title: '', description: site.tagline, path: '/', body, bodyClass: 'home', extra });
}

export function coffeePage(site, c) {
  const body = `
<article class="product" id="${esc(c.slug)}">
  <div class="product-media">
    <figure class="cell media" data-bag="${esc(c.slug)}"><img class="fallback" src="${esc(c.images.bag)}" width="1024" height="1024" alt="${esc(c.name)} 1kg bag" decoding="async"></figure>
    <figure class="cell"><img src="${esc(c.images.beans)}" width="1024" height="1024" alt="${esc(c.name)} roasted beans" loading="lazy" decoding="async"></figure>
  </div>
  <div class="product-info">
    <header class="section head"><h1 class="title">${esc(c.name)}</h1>${pills(c.tags)}</header>
    <div class="section">${specs(c)}</div>
    <div class="section"><p class="prose">${esc(c.description)}</p></div>
    <div class="section"><p><strong>Tasting Notes</strong>: ${esc(c.tastingNotes)}</p></div>
    <div class="section"><p>Lot #: &nbsp;${esc(c.lot)}</p></div>
    <div class="section">${preorderForm(site, c)}</div>
  </div>
</article>`;
  return layout(site, {
    title: c.name,
    description: `${c.name} · ${c.tags.join(', ')} · ${c.tastingNotes}`,
    path: `/wholesale/${c.slug}/`,
    body,
    bodyClass: 'product-page',
    extra: bagData(site, [c]),
  });
}

export function informationPage(site) {
  const info = site.information || {};
  const mail = info.email ? `<a href="mailto:${esc(info.email)}">${esc(info.email)}</a>` : '';
  const body = `
<article class="info">
  <div class="section"><h1 class="title">Information</h1></div>
  <div class="section"><p class="prose">${esc(info.about || site.tagline)}</p></div>
  <div class="section"><p><strong>Wholesale</strong></p><p class="prose">${esc(info.wholesale || '')} ${mail}</p></div>
  <div class="section"><p><strong>Pre-orders</strong></p><p class="prose">${esc(site.preorder?.shipsNote || '')} Payment is taken securely by Stripe at the time of ordering.</p></div>
  ${info.address ? `<div class="section"><p><strong>Roastery</strong></p><p class="prose">${esc(info.address)}</p></div>` : ''}
  <div class="section"><p><strong>Contact</strong></p><p>${mail}</p></div>
</article>`;
  return layout(site, { title: 'Information', description: site.tagline, path: '/information/', body, bodyClass: 'info-page' });
}

export function successPage(site) {
  const body = `
<article class="info success" data-success>
  <div class="section"><h1 class="title">Thank you</h1></div>
  <div class="section"><p class="prose" data-success-lead>Your pre-order is confirmed. A receipt is on its way to your inbox.</p></div>
  <div class="section" data-success-items hidden></div>
  <div class="section"><p class="prose">${esc(site.preorder?.shipsNote || '')}</p></div>
  <div class="section"><p><a href="/">Back to the coffees</a></p></div>
</article>`;
  return layout(site, { title: 'Order confirmed', description: 'Pre-order confirmed', path: '/success/', body, bodyClass: 'info-page' });
}

export function notFoundPage(site) {
  const body = `<article class="info"><div class="section"><h1 class="title">Not found</h1></div><div class="section"><p><a href="/">Back to the coffees</a></p></div></article>`;
  return layout(site, { title: 'Not found', path: '/404', body, bodyClass: 'info-page' });
}
