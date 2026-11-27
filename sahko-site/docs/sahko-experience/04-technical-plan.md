# 04 · Technical plan (as built)

## Stack decision
The existing site folder is plain HTML/CSS/JS rendered from JSON by a small Node script, with Vercel-style serverless functions for Stripe. The brief allows React/Next and Motion; I did **not** migrate. Reasons: the catalogue is six records, there is no app state beyond the gallery, a framework would add a build chain and ~40 KB of runtime for no capability we need, and the two hard parts (orbital geometry, shared-element transition) are easier to control and test as pure modules plus the Web Animations API than through a layout-animation library. Rejected alternatives: View Transitions API (snapshots the bag as a bitmap, kills live drag mid-flight, Safari 18+ only), GSAP Flip (a dependency to do what 20 lines of FLIP do), Three.js (no real geometry; photos are the asset).

## Module boundaries
| Module | Role | Tested by |
|---|---|---|
| `public/assets/orbit.js` | pure geometry: phase ↔ index, shortest path, snap, perspective layout, easing approach | `test/orbit.test.js` |
| `public/assets/state.js` | pure inspection state machine with stale-completion guard | `test/state.test.js` |
| `public/assets/atelier.js` | gallery controller: orbit rendering, pointer/keyboard, FLIP enter/leave, reveal choreography, routes, discovery modes, bag/bean views | Playwright script (`06-validation`) |
| `public/assets/site.js` | shared: live date, theme toggle, phone menu, pre-order form → Stripe, inquiry forms, thank-you page | Playwright |
| `src/templates.mjs`, `src/icons.mjs` | server-side HTML, sensory icon set | build + screenshots |
| `api/checkout.js`, `api/session.js`, `api/webhook.js`, `api/inquiry.js` | Stripe Checkout, order summary, signed webhook, inquiry relay | `test/checkout.test.js`, `test/inquiry.test.js` |
| `data/coffees.json`, `data/site.json`, `data/sensory.json` | catalogue, site settings, sensory taxonomy | catalogue test |

## Orbit
θᵢ = phase + 2πi/N, unbounded phase. One perspective projection gives position and size: zc = rz(1 − cos θ), k = f/(f + zc), x = rx·sin θ·k, scale = k, y = −(1 − depth)·ry·k. No manual scale is layered on top. Opacity and blur come from depth; items within the back 6 % are hidden. Arrows move target by exactly one step; selection uses the shortest path; drag maps pointer dx to dθ ≈ dx/rx and snaps on release with a conservative flick carry (≤ half a step). The render loop runs only while |target − phase| > 0.0006 rad. Pointer capture is taken only after 5 px of movement, so taps stay clicks; a click within 350 ms of a drag is ignored; native link drag is suppressed.

## Shared-element inspection
The same `<img>` element is moved (reparented) from its orbit `<li>` into the detail slot; its old rect is measured before, its new rect after, and the inverse transform is animated to identity (FLIP, 750 ms, `cubic-bezier(0.22,1,0.36,1)`). Neighbours fade via CSS. Reverse does the same from the current on-screen rect, so interruption mid-flight is continuous. Every choreography carries a sequence number; animations of a superseded sequence are cancelled and their completions ignored (also enforced in the state machine). Focus moves to the coffee name once inspecting, and back to the bag on return. Reduced motion sets all durations to 0 and renders the card immediately. The "decode" plays on the tiny eyebrow only; its final text is the DOM text and `aria-label`.

## Routes
`/` gallery (hash = active coffee), `/coffee/<slug>/` static detail (works with no JS), `/about/`, `/wholesale/`, `/contact/`, `/success/`. Inspecting pushes `/coffee/<slug>/`; back/forward are handled by `popstate`. Legacy `/wholesale/<slug>` URLs from the Framer site are redirected (Vercel `redirects` + static meta-refresh pages). In the hosted sandbox (claude.ai artifact) routing falls back to hashes (`#inspect-<slug>`), chosen at build time.

## Commerce
Unchanged from the earlier slice: `/api/checkout` looks prices up server-side and creates a Stripe Checkout Session in payment mode with pre-order metadata; `/api/webhook` verifies signatures. The purchase form disables its button while a request is in flight. Prices are flagged as prototype values in the UI until `pricesVerified` is set true in `site.json`. There is still no cart: one line item per checkout. A bag/cart would be the first commerce addition once the owner confirms weights and prices.

## Theme
Tokens on `:root`; dark values under `prefers-color-scheme` guarded by `:root:not([data-theme="light"])` and again under `:root[data-theme="dark"]`. An inline head script applies the stored choice before paint (no flash). Photography is untouched in dark mode; only ground, ink and hairlines change.

## Performance notes
No animation loop at idle. Only transforms/opacity/clip-path animate. Six 1024 px PNGs (≈45 KB each) ship; three load eagerly. No third-party script. CSS ≈ 20 KB, JS ≈ 22 KB unminified. Lab measurements are in `06-validation.md`.

## Sequence and risk
1. Done: orbit + inspection + detail + theme + routes + modes (Origin/Profile as filters) + About/Wholesale/Contact + legacy redirects.
2. Done after the first pass: Origin Atlas (Natural Earth 1:110m → Equal Earth → SVG at build time, lazy-loaded, markers as server-rendered buttons). Next: real font licences, verified prices/weights, tablet-specific stage geometry, cart if multi-item orders are wanted.
3. Rollback: the whole experience is one folder; `git revert` of the atelier commits restores the carousel-only site. Nothing touches the live Framer site.
