# Sahkō site with Stripe pre-orders

A static rebuild of [sahkocoffee.com](https://www.sahkocoffee.com) (originally a Framer site) with a **Pre-order** button on every coffee that checks out through Stripe.

No framework, no build tooling beyond Node itself:

- `data/coffees.json` and `data/site.json` hold all content, prices and settings.
- `npm run build` renders them through `src/templates.mjs` into `public/` (home, one page per coffee, Information, order confirmation, 404).
- `api/` holds three serverless functions (Vercel-style `(req, res)` handlers) that talk to Stripe.
- `scripts/server.mjs` runs the static site and the API together locally.

## Animations and 3D bags

The home page is a horizontal carousel: one coffee per screen, snap-gliding between them with the arrows in the bottom bar, the coffee names, the arrow keys, a mouse wheel, a trackpad swipe or a finger. The URL hash follows along (`/#guji`), so every coffee is deep-linkable.

Each coffee's bag is a 3D object rendered with Three.js, not a photo. The bag is built procedurally (a pillow-shaped pouch with a paper material and a heat seal) and its label is drawn live from the coffee's data (brand, name, region, varietal, process, harvest, acidity, body, lot). When a coffee glides into view the bag "digitises": a wireframe mesh fills in from the bottom with a scan line and a dithered edge, then settles. Bags sway slowly, tilt toward the pointer, and can be dragged to turn.

- Real models: put a `.glb` in `public/models/` and set `"model": "/models/cerrado.glb"` on that coffee. It replaces the procedural bag and still gets the digitise reveal.
- Colours: `bags.paperColor` and `bags.labelColor` in `site.json`.
- Fallbacks: devices without WebGL, and visitors who prefer reduced motion, see the still photo and no sweep. Touch devices swipe the carousel instead of rotating the bag.
- Turn it off: `bags.enabled: false` in `site.json` goes back to photos. All six bags share one WebGL canvas, so the cost is one context, not six.

## Run it locally

```bash
cd sahko-site
npm install
cp .env.example .env        # add your Stripe test key
npm run dev                 # builds, then serves http://localhost:3000
npm test                    # unit tests for the catalogue, checkout and webhook handlers
```

Without a `STRIPE_SECRET_KEY` the site still works. The Pre-order button shows an inline "not configured yet" message instead of redirecting.

## How the pre-order flow works

1. The visitor picks a size (250g or 1kg) and a quantity. The button total updates live.
2. The browser POSTs `{ slug, size, quantity }` to `/api/checkout`.
3. The function looks the price up **server-side** in `data/coffees.json` (the browser never sends an amount), creates a Stripe Checkout Session in `payment` mode with `metadata.preorder = "true"`, collects a shipping address and phone number, and returns the hosted checkout URL.
4. Stripe hosts the payment page. On success the visitor lands on `/success/?session_id=...`, which calls `/api/session` to show what they ordered.
5. Stripe calls `/api/webhook` with `checkout.session.completed`. The handler verifies the signature, logs the paid pre-order, and, if `PREORDER_NOTIFY_URL` is set, POSTs a JSON summary there (a Slack incoming webhook, Zapier or Make scenario, or your own endpoint).

### Two ways to connect Stripe

**A. Checkout Sessions (default, recommended).** Needs the `api/` functions deployed. Prices come from `data/coffees.json`. To use products you already created in Stripe, paste each Price id into `stripePriceId` for that size and the function will charge that price instead of the JSON amount.

**B. Payment Links (no backend).** In the Stripe dashboard create a Payment Link per coffee and size, paste its URL into `paymentLink` for that offer, and rebuild. The button then sends the visitor straight to Stripe. The quantity selector is still passed along, and you can host `public/` anywhere static (Netlify, GitHub Pages, Cloudflare Pages) with no functions at all.

## Deploy on Vercel

```bash
npm i -g vercel
vercel                      # from the sahko-site folder
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add SITE_URL      # e.g. https://www.sahkocoffee.com
vercel --prod
```

`vercel.json` already sets the build command and output directory. Then, in the Stripe dashboard under Developers → Webhooks, add an endpoint for `https://<your-domain>/api/webhook` listening to `checkout.session.completed`, and copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

To test webhooks locally: `stripe listen --forward-to localhost:3000/api/webhook`.

### Pointing the Squarespace domain at Vercel

The domain stays registered at Squarespace; only its DNS records change.

1. In Vercel, open the project → Settings → Domains and add both `sahkocoffee.com` and `www.sahkocoffee.com`. Vercel shows the records it expects.
2. In Squarespace, open Domains → sahkocoffee.com → DNS settings and remove the Framer records (the `A` records for `@` and the `CNAME` for `www` that point at Framer).
3. Add the Vercel records: an `A` record for `@` pointing at `76.76.21.21`, and a `CNAME` for `www` pointing at `cname.vercel-dns.com`. Keep any `MX` or `TXT` records you have for email.
4. Wait for Vercel to show both domains as verified (usually minutes, sometimes an hour). Vercel issues the HTTPS certificate itself.
5. Set `SITE_URL` to `https://www.sahkocoffee.com` so Stripe's success and cancel links use the real domain, then redeploy.

Only cancel the Framer plan once the new domain is serving this site. Framer-hosted pages will stop at that point, and this folder is now the source of truth for the content.

## Editing content and prices

Everything visible lives in `data/`:

- `coffees.json`: one object per coffee with `name`, `tags`, ordered `specs`, `description`, `tastingNotes`, `lot`, image paths and `offers` (size, `amount` in the smallest currency unit, optional `stripePriceId`, optional `paymentLink`).
- `site.json`: brand name, currency and locale, nav links, the pre-order copy shown on the page and in Stripe Checkout, the max quantity, allowed shipping countries, and the Information page text.

Run `npm run build` after editing. The committed `public/` folder is the rendered output.

## What was carried over from the original

- Layout: 64px sticky nav with logo, live date and links; each coffee as a full-width two-column row (bag left, details right) with hairline borders; a sticky accordion header per coffee on phones; product pages with bag and bean photos beside sectioned details.
- Design tokens: `#f7f5f3` background, `#1c1917` ink, `#ebe6e0` hairlines, translucent pills, and the inverted dark scheme, all taken from the live CSS.
- Copy: every coffee's specs, description, tasting notes and lot number.
- Images: the bag and bean photos are copied into `public/images/` at 1024px.

Two things could not be copied: the original's licensed typefaces (PP Eiko and Modern Gothic) are replaced with Instrument Serif and Inter from Google Fonts, and the original site has no prices anywhere, so the amounts in `coffees.json` are placeholders to change before going live.
