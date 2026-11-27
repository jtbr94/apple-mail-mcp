// Builds the Origin Atlas: a monochrome world outline (Natural Earth 1:110m via world-atlas, public domain)
// projected with Equal Earth, plus centroids for the countries in the catalogue.
// Output: public/images/atlas.svg and data/atlas.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { feature, mesh } from 'topojson-client';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const topo = require('world-atlas/countries-110m.json');
const coffees = JSON.parse(fs.readFileSync(path.join(root, 'data', 'coffees.json'), 'utf8'));
const wanted = [...new Set(coffees.map((c) => c.origin.country))];

// Equal Earth projection (Šavrič, Patterson, Jenny 2018)
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
function project([lon, lat]) {
  const λ = (lon * Math.PI) / 180, φ = (lat * Math.PI) / 180;
  const θ = Math.asin(M * Math.sin(φ));
  const θ2 = θ * θ, θ6 = θ2 * θ2 * θ2;
  const x = (2 * Math.sqrt(3) * λ * Math.cos(θ)) / (3 * (9 * A4 * θ6 * θ2 + 7 * A3 * θ6 + 3 * A2 * θ2 + A1));
  const y = θ * (A4 * θ6 * θ2 + A3 * θ6 + A2 * θ2 + A1);
  return [x, y];
}
// fit to a 1000-wide canvas, latitude clipped to [-58, 84] (no Antarctica)
const W = 1000;
const corners = [project([-180, 0]), project([180, 0]), project([0, 84]), project([0, -58])];
const minX = corners[0][0], maxX = corners[1][0], maxY = corners[2][1], minY = corners[3][1];
const s = W / (maxX - minX);
const H = Math.round((maxY - minY) * s);
const toSvg = ([lon, lat]) => { const [x, y] = project([lon, Math.max(-58, Math.min(84, lat))]); return [((x - minX) * s).toFixed(1), ((maxY - y) * s).toFixed(1)]; };

// Break a line wherever it jumps across the antimeridian, so no segment is drawn across the whole map.
function segments(points) {
  const out = [];
  let cur = [];
  for (let i = 0; i < points.length; i++) {
    if (i && Math.abs(points[i][0] - points[i - 1][0]) > 180) { if (cur.length > 1) out.push(cur); cur = []; }
    cur.push(points[i]);
  }
  if (cur.length > 1) out.push(cur);
  return out;
}
function ringPath(ring) {
  return segments(ring).map((seg) => seg.map((pt, i) => { const [x, y] = toSvg(pt); return (i ? 'L' : 'M') + x + ' ' + y; }).join('')).join('');
}
function geomPath(geom) {
  if (geom.type === 'Polygon') return geom.coordinates.map(ringPath).join('');
  if (geom.type === 'MultiPolygon') return geom.coordinates.map((poly) => poly.map(ringPath).join('')).join('');
  return '';
}
function linePath(geom) {
  const lines = geom.type === 'MultiLineString' ? geom.coordinates : [geom.coordinates];
  return lines.flatMap(segments).map((line) => line.map((pt, i) => { const [x, y] = toSvg(pt); return (i ? 'L' : 'M') + x + ' ' + y; }).join('')).join('');
}
function centroid(geom) {
  // area-weighted centroid of the largest ring, in projected space
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  let best = null, bestArea = 0;
  for (const poly of polys) {
    const ring = poly[0].map((p) => toSvg(p).map(Number));
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, y0] = ring[i], [x1, y1] = ring[i + 1];
      const f = x0 * y1 - x1 * y0; a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
    }
    a /= 2; if (Math.abs(a) > bestArea) { bestArea = Math.abs(a); best = [cx / (6 * a), cy / (6 * a)]; }
  }
  return best;
}

const notAntarctica = { type: 'GeometryCollection', geometries: topo.objects.countries.geometries.filter((g) => g.properties.name !== 'Antarctica') };
const countries = feature(topo, notAntarctica).features;
const borders = mesh(topo, notAntarctica, (a, b) => a !== b);
const land = mesh(topo, notAntarctica, (a, b) => a === b); // coastlines only
const origins = countries.filter((f) => wanted.includes(f.properties.name));
const missing = wanted.filter((w) => !origins.some((f) => f.properties.name === w));
if (missing.length) throw new Error('Countries not found in atlas data: ' + missing.join(', '));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-linecap="round">
<path class="atlas-land" stroke-width="0.6" d="${linePath(land)}"/>
<path class="atlas-borders" stroke-width="0.35" opacity="0.5" d="${linePath(borders)}"/>
${origins.map((f) => `<path class="atlas-origin" data-country="${f.properties.name}" stroke-width="0.9" d="${geomPath(f.geometry)}"/>`).join('\n')}
</svg>`;
fs.writeFileSync(path.join(root, 'public', 'images', 'atlas.svg'), svg);
const data = { viewBox: [W, H], countries: Object.fromEntries(origins.map((f) => { const [x, y] = centroid(f.geometry); return [f.properties.name, { x: +(x / W * 100).toFixed(2), y: +(y / H * 100).toFixed(2) }]; })) };
fs.writeFileSync(path.join(root, 'data', 'atlas.json'), JSON.stringify(data, null, 2));
console.log(`atlas.svg ${(svg.length / 1024).toFixed(0)} KB, ${H}px tall;`, JSON.stringify(data.countries));
