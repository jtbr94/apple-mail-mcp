// HTML templates for the Sahkō atelier. Plain template strings; no framework.
import { formatMoney } from '../lib/catalog.js';
import { FAMILY_ICONS, UI_ICONS } from './icons.mjs';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const pad2 = (n) => String(n).padStart(2, '0');

export function familyOf(note, sensory) {
  for (const f of sensory.families) if (f.notes.includes(note)) return f;
  return null;
}
export function familiesOf(coffee, sensory) {
  const ids = [];
  for (const n of coffee.notes) {
    const f = familyOf(n, sensory);
    if (f && !ids.includes(f.id)) ids.push(f.id);
  }
  return ids;
}

const pills = (tags) => `<ul class="tags" aria-label="Character" data-reveal>${tags.map((t) => `<li class="pill">${esc(t)}</li>`).join('')}</ul>`;

const specsList = (c) =>
  `<dl class="specs">${c.specs.map(([k, v]) => `<div class="spec" data-reveal><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;

const notesList = (c, sensory) =>
  `<ul class="notes-list">${c.notes
    .map((n) => {
      const f = familyOf(n, sensory);
      return `<li class="note" data-family="${esc(f?.id || '')}">${f ? FAMILY_ICONS[f.id] : ''}<span>${esc(n)}</span></li>`;
    })
    .join('')}</ul>`;

export function purchaseForm(site, c) {
  if (!c.offers?.length) return '';
  const offers = c.offers
    .map((o, i) => {
      const price = formatMoney(o.amount, site.currency, site.locale);
      const sold = o.availability === 'soldout';
      return `<label class="size${sold ? ' is-soldout' : ''}"><input type="radio" name="size" value="${esc(o.size)}" data-amount="${o.amount}" data-link="${esc(o.paymentLink || '')}" ${i === 0 ? 'checked' : ''} ${sold ? 'disabled' : ''}><span class="pill pill-button">${esc(o.size)} <span class="muted">${esc(price)}</span>${sold ? ' <span class="muted">· sold out</span>' : ''}</span></label>`;
    })
    .join('');
  const first = c.offers[0];
  const verb = (c.offers.find((o) => o.availability !== 'soldout')?.availability === 'preorder') ? 'Pre-order' : 'Order';
  return `
<form class="preorder" data-slug="${esc(c.slug)}" data-currency="${esc(site.currency)}" data-locale="${esc(site.locale)}" novalidate>
  <fieldset class="sizes"><legend class="visually-hidden">Size</legend>${offers}</fieldset>
  <div class="preorder-row">
    <div class="qty"><button type="button" class="qty-btn" data-step="-1" aria-label="Decrease quantity">−</button><input class="qty-input" type="number" name="quantity" inputmode="numeric" min="1" max="${site.preorder.maxQuantity || 20}" value="1" aria-label="Quantity"><button type="button" class="qty-btn" data-step="1" aria-label="Increase quantity">+</button></div>
    <button type="submit" class="button preorder-button"><span class="label">${verb}</span><span class="total">${esc(formatMoney(first.amount, site.currency, site.locale))}</span></button>
  </div>
  <p class="preorder-note">${esc(site.preorder.shipsNote || '')}${site.pricesVerified ? '' : ' <span class="proto">Prototype pricing, not a live offer.</span>'}</p>
  <p class="preorder-error" role="alert" hidden></p>
</form>`;
}

export function detailArticle(site, c, index, total, sensory, { panel = false } = {}) {
  const origin = `${c.origin.region}, ${c.origin.country}`;
  const process = c.specs.find(([k]) => k === 'Processing')?.[1] || '';
  return `
<article class="detail" data-detail="${esc(c.slug)}" id="detail-${esc(c.slug)}" ${panel ? 'hidden' : ''} aria-labelledby="name-${esc(c.slug)}">
  <div class="detail-media">
    <figure class="slot" data-slot>${panel ? '' : `<img class="bag-img" src="${esc(c.images.bag)}" width="1024" height="1024" alt="${esc(c.name)} bag" decoding="async">`}</figure>
    <figure class="beans" data-beans><img src="${esc(c.images.beans)}" width="1024" height="1024" alt="${esc(c.name)} roasted beans" loading="lazy" decoding="async"></figure>
    <div class="views" role="group" aria-label="View">
      <button type="button" class="view" data-view="bag" aria-pressed="true">Bag</button>
      <button type="button" class="view" data-view="beans" aria-pressed="false">Roasted beans</button>
    </div>
  </div>
  <div class="detail-info">
    <p class="eyebrow" data-reveal data-decode><span class="macron" aria-hidden="true"></span><span class="decode" data-text="No. ${pad2(index + 1)} / ${pad2(total)} · Lot ${esc(c.lot)}">No. ${pad2(index + 1)} / ${pad2(total)} · Lot ${esc(c.lot)}</span></p>
    <h1 class="name" id="name-${esc(c.slug)}" data-reveal tabindex="-1">${esc(c.name)}</h1>
    <p class="intro" data-reveal>${esc(c.intro)}</p>
    <p class="origin" data-reveal>${esc(origin)}${process ? ` · ${esc(process)}` : ''}</p>
    ${pills(c.tags)}
    ${specsList(c)}
    <p class="prose" data-reveal>${esc(c.description)}</p>
    <section class="notes" data-reveal aria-labelledby="notes-${esc(c.slug)}"><h2 id="notes-${esc(c.slug)}">Tasting notes</h2>${notesList(c, sensory)}</section>
    <section class="purchase" data-reveal aria-label="Order">${purchaseForm(site, c)}</section>
  </div>
</article>`;
}

export function layout(site, { title, description, path, body, bodyClass = '', extra = '', nav = true }) {
  const relative = !!site.__relative;
  const depth = relative ? Math.max(0, path.split('/').filter(Boolean).length - (path.endsWith('/') ? 0 : 1)) : 0;
  const base = relative ? (depth ? '../'.repeat(depth) : './') : '/';
  const fullTitle = title ? `${title} – ${site.brand}` : `${site.brand} – ${site.tagline}`;
  const url = `${site.url.replace(/\/+$/, '')}${path}`;
  const current = (href) => (href === '/' ? path === '/' || path.startsWith('/coffee') : path.startsWith(href));
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || site.tagline)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description || site.tagline)}">
<meta property="og:image" content="${esc(site.url.replace(/\/+$/, ''))}/images/og.png">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="color-scheme" content="light dark">
<script>(function(){try{var t=localStorage.getItem('sahko-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}document.documentElement.classList.add('js');})();</script>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Inter:wght@300;400;500&display=swap">
<link rel="stylesheet" href="/assets/styles.css">
</head>
<body class="${esc(bodyClass)}">
<a class="skip" href="#main">Skip to content</a>
${nav ? `<header class="nav">
  <a class="logo" href="/" aria-label="${esc(site.brand)} home">${esc(site.brand)}</a>
  <p class="date" data-date></p>
  <div class="nav-right">
    <nav class="links" id="primary-nav" aria-label="Primary">${site.nav
      .map((n) => `<a href="${esc(n.href)}" ${current(n.href) ? 'aria-current="page"' : ''}>${esc(n.label)}</a>`)
      .join('')}</nav>
    <button type="button" class="theme" data-theme-toggle aria-label="Switch to dark theme" title="Theme">${UI_ICONS.theme}</button>
    <button type="button" class="menu" data-menu aria-expanded="false" aria-controls="primary-nav" aria-label="Menu"><span class="macron" aria-hidden="true"></span><span class="macron" aria-hidden="true"></span></button>
  </div>
</header>` : ''}
<main id="main">
${body}
</main>
${extra || ''}
<script src="/assets/site.js" defer></script>
</body>
</html>`;
  if (!relative) return html;
  return html
    .replace(/(href|src)="\/(?!\/)([^"]*)"/g, (m, attr, rest) => `${attr}="${base}${rest}"`)
    .replace(/"\/images\//g, `"${base}images/`)
    .replace(/'\/images\//g, `'${base}images/`)
    .replace(/href="(\.\/|(?:\.\.\/)+)"/g, (m, b) => `href="${b}index.html"`)
    .replace(/href="((?:\.\.\/)*(?:\.\/)?[a-z0-9/-]+\/)(#[a-z-]*)?"/g, (m, b, h) => `href="${b}index.html${h || ''}"`);
}

export function catalogueJson(site, coffees, sensory) {
  const data = {
    brand: site.brand,
    coffees: coffees.map((c, i) => ({
      slug: c.slug,
      name: c.name,
      index: i,
      country: c.origin.country,
      region: c.origin.region,
      process: c.specs.find(([k]) => k === 'Processing')?.[1] || '',
      notes: c.notes,
      families: familiesOf(c, sensory),
      tags: c.tags,
    })),
    families: sensory.families.map((f) => ({ id: f.id, label: f.label })),
    combine: sensory.combine,
  };
  return `<script type="application/json" id="catalogue">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function homePage(site, coffees, sensory, atlas = null) {
  const n = coffees.length;
  const first = coffees[0];
  const orbit = coffees
    .map(
      (c, i) => `
<li class="bag" data-slug="${esc(c.slug)}" data-index="${i}" style="--x:0px;--y:0px;--s:1;--o:1;--z:1;--blur:0px">
  <a class="bag-link" href="/coffee/${esc(c.slug)}/" aria-label="${esc(c.name)}" ${i === 0 ? 'aria-current="true"' : 'tabindex="-1"'} data-inspect="${esc(c.slug)}">
    <img class="bag-img" src="${esc(c.images.bag)}" width="1024" height="1024" alt="${esc(c.name)} bag" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async" draggable="false">
  </a>
</li>`
    )
    .join('');
  const countries = [...new Set(coffees.map((c) => c.origin.country))];
  const originFilters = countries
    .map((co) => `<button type="button" class="filter" data-filter="origin" data-value="${esc(co)}" aria-pressed="false">${esc(co)} <span class="muted">${coffees.filter((c) => c.origin.country === co).length}</span></button>`)
    .join('');
  const profileFilters = sensory.families
    .filter((f) => coffees.some((c) => familiesOf(c, sensory).includes(f.id)))
    .map((f) => `<button type="button" class="filter" data-filter="profile" data-value="${esc(f.id)}" aria-pressed="false">${FAMILY_ICONS[f.id]}<span>${esc(f.label)}</span></button>`)
    .join('');
  const register = coffees
    .map(
      (c, i) => `<li><a href="/coffee/${esc(c.slug)}/" data-inspect="${esc(c.slug)}"><span class="no">${pad2(i + 1)}</span><span class="rn">${esc(c.name)}</span><span class="muted">${esc(c.origin.region)}, ${esc(c.origin.country)}</span><span class="muted">${esc(c.specs.find(([k]) => k === 'Processing')?.[1] || '')}</span><span class="muted rnotes">${esc(c.notes.slice(0, 3).join(', '))}</span></a></li>`
    )
    .join('');
  const markers = atlas
    ? countries
        .filter((co) => atlas.countries[co])
        .map((co) => `<button type="button" class="marker" data-marker="${esc(co)}" aria-pressed="false" style="left:${atlas.countries[co].x}%;top:${atlas.countries[co].y}%" aria-label="${esc(co)}: ${coffees.filter((c) => c.origin.country === co).map((c) => c.name).join(', ')}">${UI_ICONS.bean}<span class="marker-label">${esc(co)}</span></button>`)
        .join('')
    : '';
  const atlasHtml = atlas
    ? `<div class="atlas" data-atlas data-src="/images/atlas.svg" hidden aria-label="Origin atlas"><div class="atlas-frame" style="aspect-ratio:${atlas.viewBox[0]} / ${atlas.viewBox[1]}"><div class="atlas-pan" data-atlas-pan><div class="atlas-map" data-atlas-map></div>${markers}</div></div><p class="atlas-note muted">Region-level markers · outlines Natural Earth</p></div>`
    : '';
  const body = `
<section class="scene" data-scene data-state="browsing" aria-label="The collection">
  ${atlasHtml}
  <div class="stage" data-stage>
    <ol class="indicator" data-indicator aria-hidden="true">${coffees.map((c, i) => `<li ${i === 0 ? 'class="on"' : ''}></li>`).join('')}</ol>
    <div class="plinth" aria-hidden="true"></div>
    <ul class="orbit" data-orbit aria-label="Coffees" aria-roledescription="carousel">${orbit}</ul>
    <button type="button" class="arrow prev" data-prev aria-label="Previous coffee">${UI_ICONS.arrowLeft}</button>
    <button type="button" class="arrow next" data-next aria-label="Next coffee">${UI_ICONS.arrowRight}</button>
  </div>
  <div class="plate">
    <p class="plate-name" data-plate-name>${esc(first.name)}</p>
    <p class="plate-origin muted" data-plate-origin>${esc(first.origin.region)}, ${esc(first.origin.country)} · ${esc(first.specs.find(([k]) => k === 'Processing')?.[1] || '')}</p>
    <p class="plate-notes muted" data-plate-notes>${esc(first.notes.slice(0, 3).join(', '))}</p>
    <a class="inspect" data-plate-link data-inspect="${esc(first.slug)}" href="/coffee/${esc(first.slug)}/"><span class="macron" aria-hidden="true"></span>Inspect</a>
    <p class="visually-hidden" aria-live="polite" data-live></p>
  </div>
  <div class="modes" role="group" aria-label="Discover by">
    <button type="button" class="mode" data-mode="collection" aria-pressed="true">Collection</button>
    <button type="button" class="mode" data-mode="origin" aria-pressed="false">Origin</button>
    <button type="button" class="mode" data-mode="profile" aria-pressed="false">Profile</button>
  </div>
  <div class="filters" data-filters hidden>
    <div class="filter-row" data-filter-row="origin" hidden>${originFilters}</div>
    <div class="filter-row" data-filter-row="profile" hidden>${profileFilters}<button type="button" class="filter clear" data-clear hidden>Clear</button></div>
    <p class="filter-count muted" data-filter-count></p>
  </div>
  <div class="inspection" data-inspection hidden>
    <a class="back" data-back href="/#${esc(first.slug)}"><span class="macron" aria-hidden="true"></span>Collection</a>
    ${coffees.map((c, i) => detailArticle(site, c, i, n, sensory, { panel: true })).join('\n')}
  </div>
</section>
<section class="register" id="register" aria-labelledby="register-title">
  <h2 id="register-title" class="eyebrow"><span class="macron" aria-hidden="true"></span>The collection, as a list</h2>
  <ol class="register-list">${register}</ol>
</section>`;
  return layout(site, { title: '', description: `${site.tagline}. ${site.positioning}`, path: '/', body, bodyClass: 'home', extra: catalogueJson(site, coffees, sensory) });
}

export function coffeePage(site, c, index, coffees, sensory) {
  const body = `
<div class="detail-page">
  <a class="back" href="/#${esc(c.slug)}"><span class="macron" aria-hidden="true"></span>Collection</a>
  ${detailArticle(site, c, index, coffees.length, sensory)}
  <nav class="detail-nav" aria-label="Other coffees">${coffees
    .filter((o) => o.slug !== c.slug)
    .map((o) => `<a href="/coffee/${esc(o.slug)}/">${esc(o.name)}</a>`)
    .join('')}</nav>
</div>`;
  return layout(site, {
    title: c.name,
    description: `${c.name}: ${c.intro} ${c.origin.region}, ${c.origin.country}. ${c.tastingNotes}.`,
    path: `/coffee/${c.slug}/`,
    body,
    bodyClass: 'coffee-page',
  });
}

function inquiryForm(kind, site) {
  const w = kind === 'wholesale';
  return `
<form class="inquiry" data-inquiry data-kind="${kind}" novalidate>
  <div class="field"><label for="${kind}-name">Name</label><input id="${kind}-name" name="name" autocomplete="name" required></div>
  ${w ? `<div class="field"><label for="${kind}-business">Business</label><input id="${kind}-business" name="business" autocomplete="organization" required></div>` : ''}
  <div class="field"><label for="${kind}-email">Email</label><input id="${kind}-email" name="email" type="email" autocomplete="email" required></div>
  <div class="field"><label for="${kind}-location">Location <span class="muted">optional</span></label><input id="${kind}-location" name="location" autocomplete="address-level2"></div>
  ${w ? `<div class="field"><label for="${kind}-volume">Expected weekly volume <span class="muted">optional</span></label><input id="${kind}-volume" name="volume" placeholder="e.g. 10 kg"></div>` : ''}
  <div class="field"><label for="${kind}-message">Message</label><textarea id="${kind}-message" name="message" rows="5" required></textarea></div>
  <div class="field hp" aria-hidden="true"><label for="${kind}-website">Website</label><input id="${kind}-website" name="website" tabindex="-1" autocomplete="off"></div>
  <p class="muted small">We use what you send only to reply to you. Nothing is shared or added to a list.</p>
  <div class="preorder-row"><button type="submit" class="button">Send</button><p class="form-status" role="status" aria-live="polite"></p></div>
</form>
<p class="muted">Or write to <a href="mailto:${esc(site.information.email)}">${esc(site.information.email)}</a>.</p>`;
}

export function aboutPage(site) {
  const a = site.about;
  const body = `
<article class="page page-about">
  <header class="page-head"><p class="eyebrow"><span class="macron" aria-hidden="true"></span>About ${esc(site.brand)}</p><h1 class="display">${esc(site.positioning)}</h1></header>
  ${a.photo ? `<figure class="photo"><img src="${esc(a.photo)}" width="800" height="534" alt="${esc(a.photoAlt)}" loading="lazy"></figure>` : ''}
  <div class="page-body">${a.paragraphs.map((p) => `<p class="prose">${esc(p)}</p>`).join('')}</div>
</article>`;
  return layout(site, { title: 'About', description: site.positioning, path: '/about/', body, bodyClass: 'text-page' });
}

export function wholesalePage(site) {
  const body = `
<article class="page">
  <header class="page-head"><p class="eyebrow"><span class="macron" aria-hidden="true"></span>Wholesale</p><h1 class="display">Coffee for the people who pour it.</h1></header>
  <div class="page-body"><p class="prose">${esc(site.wholesale.intro)}</p></div>
  ${inquiryForm('wholesale', site)}
</article>`;
  return layout(site, { title: 'Wholesale', description: site.wholesale.intro, path: '/wholesale/', body, bodyClass: 'text-page' });
}

export function contactPage(site) {
  const body = `
<article class="page">
  <header class="page-head"><p class="eyebrow"><span class="macron" aria-hidden="true"></span>Contact</p><h1 class="display">Say hello.</h1></header>
  ${inquiryForm('contact', site)}
</article>`;
  return layout(site, { title: 'Contact', description: 'Contact Sahkō', path: '/contact/', body, bodyClass: 'text-page' });
}

export function successPage(site) {
  const body = `
<article class="page" data-success>
  <header class="page-head"><p class="eyebrow"><span class="macron" aria-hidden="true"></span>Order confirmed</p><h1 class="display">Thank you.</h1></header>
  <div class="page-body"><p class="prose" data-success-lead>Your pre-order is confirmed. A receipt is on its way to your inbox.</p><div data-success-items hidden></div><p class="prose muted">${esc(site.preorder?.shipsNote || '')}</p><p><a class="inspect" href="/"><span class="macron" aria-hidden="true"></span>Back to the collection</a></p></div>
</article>`;
  return layout(site, { title: 'Order confirmed', description: 'Pre-order confirmed', path: '/success/', body, bodyClass: 'text-page' });
}

export function notFoundPage(site) {
  const body = `<article class="page"><header class="page-head"><p class="eyebrow"><span class="macron" aria-hidden="true"></span>Not found</p><h1 class="display">That page is not in the collection.</h1></header><p><a class="inspect" href="/"><span class="macron" aria-hidden="true"></span>Back to the collection</a></p></article>`;
  return layout(site, { title: 'Not found', path: '/404', body, bodyClass: 'text-page' });
}
