// Local dev server: serves public/ and runs the api/ functions the same way Vercel does.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');

// Load .env without a dependency.
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const api = {
  '/api/checkout': require('../api/checkout.js'),
  '/api/session': require('../api/session.js'),
  '/api/webhook': require('../api/webhook.js'),
};

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };

function serveStatic(pathname, res) {
  let file = path.normalize(path.join(publicDir, decodeURIComponent(pathname)));
  if (!file.startsWith(publicDir)) return notFound(res);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!pathname.endsWith('/')) {
      res.writeHead(308, { Location: pathname + '/' });
      return res.end();
    }
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) return notFound(res);
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

function notFound(res) {
  const file = path.join(publicDir, '404.html');
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(fs.existsSync(file) ? fs.readFileSync(file) : 'Not found');
}

const port = Number(process.env.PORT) || 3000;
http
  .createServer(async (req, res) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const handler = api[pathname];
    if (handler) {
      try {
        await handler(req, res);
      } catch (err) {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal error' }));
      }
      return;
    }
    serveStatic(pathname, res);
  })
  .listen(port, () => console.log(`Sahkō dev server → http://localhost:${port}`));
