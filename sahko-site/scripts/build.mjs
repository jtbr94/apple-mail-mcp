// Renders data/*.json through src/templates.mjs into public/ (or --out <dir>, optionally --relative for a sandbox copy).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { homePage, coffeePage, aboutPage, wholesalePage, contactPage, successPage, notFoundPage } from '../src/templates.mjs';

const require = createRequire(import.meta.url);
const { loadSite, loadCoffees } = require('../lib/catalog.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const relative = args.includes('--relative');
const outName = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'public';
const out = path.join(root, outName);
const site = loadSite();
const coffees = loadCoffees();
const sensory = JSON.parse(fs.readFileSync(path.join(root, 'data', 'sensory.json'), 'utf8'));
if (relative) site.__relative = true;
if (outName !== 'public') {
  fs.mkdirSync(out, { recursive: true });
  fs.cpSync(path.join(root, 'public', 'assets'), path.join(out, 'assets'), { recursive: true });
  fs.cpSync(path.join(root, 'public', 'images'), path.join(out, 'images'), { recursive: true });
}

function write(rel, html) {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  console.log('wrote', path.relative(root, file));
}

const home = homePage(site, coffees, sensory);
write(
  'index.html',
  relative
    ? home
        .replace(/^<!doctype html>\s*<html[^>]*>\s*<head>\s*/i, '')
        .replace(/<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*/i, '')
        .replace(/<\/head>\s*<body class="([^"]*)">/i, '<script>document.documentElement.dataset.routing="hash";</script><div class="$1">')
        .replace(/<\/body>\s*<\/html>\s*$/i, '</div>')
    : home
);
coffees.forEach((c, i) => write(path.join('coffee', c.slug, 'index.html'), coffeePage(site, c, i, coffees, sensory)));
write(path.join('about', 'index.html'), aboutPage(site));
write(path.join('wholesale', 'index.html'), wholesalePage(site));
write(path.join('contact', 'index.html'), contactPage(site));
write(path.join('success', 'index.html'), successPage(site));
write('404.html', notFoundPage(site));
write('favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#111110"/><text x="32" y="43" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="#f5f3ec">S</text></svg>`);
// legacy product URLs from the Framer site keep working
const legacy = coffees.map((c) => `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=/coffee/${c.slug}/"><link rel="canonical" href="${site.url}/coffee/${c.slug}/"><title>${c.name}</title><a href="/coffee/${c.slug}/">${c.name}</a>`);
coffees.forEach((c, i) => write(path.join('wholesale', c.slug, 'index.html'), legacy[i]));
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/about/', '/wholesale/', '/contact/', ...coffees.map((c) => `/coffee/${c.slug}/`)].map((p) => `<url><loc>${site.url}${p}</loc></url>`).join('')}</urlset>`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /success/\nSitemap: ${site.url}/sitemap.xml\n`);
