# 01 · Audit and baseline

Date: 2026-11-27. Everything below was inspected directly in this session unless marked *not verified*.

## What exists

### Live site (https://www.sahkocoffee.com)
- Platform: **Framer** (server header `Framer/0a675d1`, `framerusercontent.com` assets). Static SSG pages; no cart, no checkout, no account, no forms. "Wholesale" is the home page; "Information" links to `./` (dead).
- Content: six coffees, each with tags, eight spec lines, a paragraph, tasting notes and a lot number. Home = vertical stack of 720 px rows (bag photo left, specs right). Product pages at `/wholesale/<slug>` with bag + roasted-bean photos. Live date in the nav.
- Visual: `#f7f5f3` ground, `#1c1917` ink, `#ebe6e0` hairlines, translucent pills, dark scheme inverted (`#1c1917` ground, `#22201e` surface). Fonts loaded by Framer: **PP Eiko Medium** (wordmark 24 px, −3 % tracking), **Modern Gothic Trial Light** (everything else, 14/18 px, −2 to −4 % tracking), Inter as a fallback. Fragment Mono declared, unused.
- Strengths to keep: discipline of the hairline grid, the airy 50/50 row, the pill tags, restraint of copy, real product photography on a true transparent cut-out, the live date as a quiet editorial detail.
- Weaknesses: no purchase path at all; "Information" dead; everything is a list, nothing invites inspection; mobile is a long scroll of near-identical rows; no About/Wholesale/Contact content.
- Evidence: `evidence/live-site-desktop.png`, `evidence/live-site-mobile.png`.

### Figma brand file (`a0D2d0pwuKIGZgQ1auXn4I`, "Sahkō")
- One page. Frames: Banner (farm photograph, 1500×787), Technicals, Assets, Labels, six "Bag Label" frames (1500×1500), Packaging (shipping-box label mock), a Labels sheet with Guji, Yirgacheffe, Minas, Marcala ×3, Antigua.
- Text styles read from the file's variables: **Logo** = PP Eiko Medium 24/100 %, −3 %; **H1** = Modern Gothic Trial Light 18, −3 %; **Body** = Modern Gothic Trial Light 14, −3 %. Spacing note: 10 px heading, 5 px body. `evidence/figma-technicals.png`.
- Assets › Logos holds a **bean mark**: an oval bean with an S-shaped seam, 17×20 viewBox, single black path. Exported to `public/images/bean-mark.svg`. It has no macron; the "Bean Ō" (bean + separate macron) does not exist as artwork. Two hidden pixel-grid "S" and "Bean" studies also exist (hidden layers; treated as abandoned).
- The wordmark is live text in PP Eiko, not a vector. No vector wordmark exists in the file.
- Bag imagery: the raw source is a **blank** bag render (1500×1500 RGBA, transparent); labels are composited in Figma. The site's per-coffee PNGs are those composites at 1024 px, also transparent (checked: palette PNG with alpha 0 background). Good enough to layer; 1500 px exports are available from the six Bag Label frames if we want sharper hero assets later.
- Banner photograph: a person picking cherries among coffee leaves (800×534 raw JPEG in the file). Copied to `public/images/about-harvest.jpg` for the About page. *Not verified*: who shot it and whether it is licensed for web. Flagged in the decision log.
- The Labels sheet shows coffees **not on the live site**: *Marcala, La Paz, Honduras · Honey · Lempira · lot MAR01H-26* and *Guji (Natural) · lot GUJ01N-25*, with roast dates in June 2026. Also an older Antigua record (harvest Mar 2024, lot ANT01W-24). Treated as unpublished/superseded; not added to the public catalogue. `evidence/figma-labels.png`.

### Exploration draft (`zN0czUYQ72e11AImznyRI8`)
- Page 1 is empty (canvas width 0). Nothing to review. Matches the brief's note that it is not approved artwork.

### Repository (`jtbr94/apple-mail-mcp`, branch `claude/clever-pascal-vzw9aj`)
- The repo is an unrelated Python MCP server. The site lives in `sahko-site/` (added this week): vanilla HTML/CSS/JS rendered from JSON by `scripts/build.mjs`, Stripe Checkout serverless functions in `api/`, Node test suite. No `CLAUDE.md`/`AGENTS.md` at root; CI workflow targets `main` but default branch is `master`, so no CI runs on PRs.
- Baseline (before this phase): `npm run build` renders 11 pages; `npm test` 7/7 pass; served locally and screenshotted at 1440 and 390 px; a carousel home with the photos is published as a private sandbox artifact.
- Uncommitted changes: none at start of this phase.

### Catalogue and commerce
- Product data: `data/coffees.json` (six records, transcribed from the live site; tags, ordered specs, description, tasting notes, lot, images, two offers each). `data/site.json` holds brand, currency, pre-order copy, shipping countries.
- **There is no existing commerce backend.** The live Framer site sells nothing. The Stripe Checkout integration built earlier this session is the only commerce layer, so "use the existing commerce system" resolves to: keep Stripe Checkout, keep prices server-side, keep the hosted checkout. No cart exists; a single-line pre-order checkout is the current flow.
- Prices in the data are placeholders (the live site shows none). Weights on the live site: the bag is 1 kg; the earlier build offered 250 g/1 kg. The brief proposes 150/250/500 g. None is verified. The prototype labels every price as a placeholder and keeps weights configurable.
- Fonts: PP Eiko (Pangram Pangram) and Modern Gothic (trial) are licensed/trial faces. Framer serves them on the live site; this repo cannot redistribute them. Substitutes in use: Instrument Serif (wordmark) and Inter 300/400 (text) from Google Fonts. Resolution path: buy PP Eiko web licence and a Modern Gothic web licence, self-host under `public/fonts/`, swap two CSS variables.

## Tooling and access limits this session
- Network egress is allow-listed. Added for this work: sahkocoffee.com, framerusercontent.com, Google Fonts hosts, www.figma.com. Reference websites (SEY, Aesop, Le Labo, etc.) could **not** be opened; only web-search snippets were available (see 02-research).
- Stripe connector not authorised; no Stripe key. Checkout code is covered by tests with a mocked client only.
- Headless Chromium with SwiftShader is available for screenshots and interaction checks.

## Risks
- Font substitution changes the brand's voice noticeably (PP Eiko's contrast is the identity). Highest-value fix is licensing the real faces.
- Prices, weights and availability are unverified; nothing may go live until the owner supplies them.
- The farm photograph's licence is unknown.
- Orbital carousel on low-end phones: must degrade to a flat list without losing purchase.
