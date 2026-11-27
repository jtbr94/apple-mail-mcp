# Sahkō · The Coffee Atelier

The Sahkō website rebuilt as an interactive coffee gallery: a horizontal orbital carousel of the real bags, a shared-element inspection that moves the chosen bag into an exhibition card, discovery by Collection / Origin / Profile, and Stripe pre-orders. No framework: plain HTML/CSS/JS rendered from JSON by Node, with four serverless functions.

Design and engineering record: [`docs/sahko-experience/`](docs/sahko-experience/) (audit, research, three directions, technical plan, decision log, validation).

## Run it

```bash
npm install
cp .env.example .env     # optional: Stripe keys, inquiry relay URL
npm run dev              # builds, then serves http://localhost:3000 with the API
npm test                 # geometry, state machine, checkout, webhook, inquiry
npm run build            # renders public/ from data/
```

Without Stripe keys everything works except payment: the button explains that pre-orders are not configured yet.

## Where things live

- `data/coffees.json` – the six coffees (origin, specs, intro, description, notes, lot, images, offers). `data/site.json` – brand, nav, pre-order copy, About/Wholesale copy, `pricesVerified`. `data/sensory.json` – tasting-note families for the Profile mode.
- `src/templates.mjs` – every page as a template; `src/icons.mjs` – the monoline sensory icons.
- `public/assets/orbit.js` – pure orbit geometry; `state.js` – inspection state machine; `atelier.js` – the gallery controller; `site.js` – theme, menu, forms; `styles.css` – all styling and tokens.
- `api/checkout.js`, `api/session.js`, `api/webhook.js` – Stripe; `api/inquiry.js` – wholesale/contact relay.
- `scripts/build.mjs` – renders `public/`; `scripts/atlas.mjs` – builds the Origin Atlas SVG from Natural Earth data (public domain, via the `world-atlas` package); `scripts/server.mjs` – local server. `vercel.json` – build + legacy redirects.

## Routes
`/` gallery · `/coffee/<slug>/` coffee (static, no JS needed) · `/about/` · `/wholesale/` · `/contact/` · `/success/`. The old Framer product URLs `/wholesale/<slug>` redirect.

## Stripe
`/api/checkout` creates a Checkout Session with prices looked up server-side in `coffees.json` (or a `stripePriceId` per offer). Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`; point a webhook at `/api/webhook` for `checkout.session.completed`. Optional `PREORDER_NOTIFY_URL` and `INQUIRY_NOTIFY_URL` receive JSON for paid pre-orders and form submissions (Slack incoming webhook, Zapier, Make, or your own endpoint). A Payment Link per offer (`paymentLink`) works with no functions at all. Until `pricesVerified` is true in `site.json`, every price shows "Prototype pricing, not a live offer."

## Deploy on Vercel and move the domain from Framer

```bash
npm i -g vercel && vercel && vercel env add STRIPE_SECRET_KEY && vercel env add STRIPE_WEBHOOK_SECRET && vercel env add SITE_URL && vercel --prod
```

Then in Vercel add `sahkocoffee.com` and `www.sahkocoffee.com`; in Squarespace DNS replace the Framer records with an `A` record `@ → 76.76.21.21` and a `CNAME` `www → cname.vercel-dns.com`; keep MX/TXT records; wait for Vercel to verify; set `SITE_URL` to the real domain and redeploy. Cancel Framer only after the new domain serves this site.

## Before going live (owner decisions)
Real prices and weights · web licences for PP Eiko and Modern Gothic (Instrument Serif and Inter are stand-ins) · confirm the About photograph and copy · shipping countries and pre-order terms · Stripe account in live mode.
