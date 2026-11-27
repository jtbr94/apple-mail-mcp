// Renders data/*.json through src/templates.mjs into public/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { homePage, coffeePage, informationPage, successPage, notFoundPage } from '../src/templates.mjs';

const require = createRequire(import.meta.url);
const { loadSite, loadCoffees } = require('../lib/catalog.js');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public');
const site = loadSite();
const coffees = loadCoffees();

function write(rel, html) {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  console.log('wrote', path.relative(root, file));
}

write('index.html', homePage(site, coffees));
for (const c of coffees) write(path.join('wholesale', c.slug, 'index.html'), coffeePage(site, c));
write(path.join('information', 'index.html'), informationPage(site));
write(path.join('success', 'index.html'), successPage(site));
write('404.html', notFoundPage(site));
write(
  'favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#1c1917"/><text x="32" y="43" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="#f7f5f3">S</text></svg>`
);
