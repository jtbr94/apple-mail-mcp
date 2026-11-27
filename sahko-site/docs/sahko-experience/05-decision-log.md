# 05 · Decision log

## Owner-locked (kept)
- Wordmark "Sahkō" as live text in the brand serif; macron preserved. Bag label photographic, lower-left, never redrawn.
- Quiet luxury, negative space, actual product imagery, horizontal orbital discovery, continuous inspection, monochrome sensory icons, clear buying flow, authentic coffee data.

## Delegated decisions made (reversible)
| Decision | Why | Reverse by |
|---|---|---|
| Vanilla modules instead of React/Motion | smallest surface that can do FLIP + geometry well; testable pure modules | folder is self-contained; any framework could consume `orbit.js`/`state.js` |
| True perspective projection for the ring | the first version (x = rx·sin θ with manual scale) put the back row exactly behind the neighbours; it read as three cards | `layout()` options |
| Same `<img>` reparented for the transition | guarantees one visual owner, no duplicate flash, cancellable mid-flight | n/a |
| Choreography ≈ 1.1 s, icon strokes decorative | 800–1200 ms target; strokes would have pushed the "inspecting" state past 1.5 s | timing table in `atelier.js` |
| `/coffee/<slug>/` as canonical product URL; `/wholesale/<slug>` redirected | the Framer site used `/wholesale/<slug>` for products; the brief wants a Wholesale page at `/wholesale/` | `vercel.json` redirects |
| Register list under the stage | accessible list of all coffees, the no-JS and reduced-motion fallback, and crawlable content | CSS |
| Origin and Profile as filters on the same orbit | shared records, shared selection, URL state, one component | `applyFilter()` |
| Origin Atlas as a lazy-loaded SVG (Natural Earth 1:110m, Equal Earth projection, built at `npm run build`) | editorial outline map with region-level markers, no mapping SDK, public-domain data; loads only when Origin is chosen (≈95 KB uncompressed) | `scripts/atlas.mjs`; delete `data/atlas.json` to drop it |
| Profile taxonomy of 9 families derived only from published notes | no invented descriptors; every note maps to exactly one family (tested) | `data/sensory.json` |
| Phone: menu button, bags higher, plate above modes | the five-item nav did not fit 390 px | CSS |
| No cart, no "Bag (0)" in the nav | there is no cart; showing one would be dishonest | add when multi-item orders are needed |
| Theme respects system first; toggle persists | brief | `site.js` |

## Proposed, kept configurable, not finalised
- Name "The Coffee Atelier" (in `site.json`, not shown on the page), positioning "The art of origin." (About page headline).
- Weights 250 g / 1 kg with placeholder amounts; UI labels them "Prototype pricing, not a live offer."
- Colours per the brief's table.

## Unverified facts (do not publish as true)
- Prices, weights, availability, shipping countries.
- Licence of the farm photograph in the Figma banner (used on About with a note in the data file).
- Marcala (Honduras, honey, Lempira) and Guji Natural appear on label artwork but not on the live site: excluded.
- "Single Origin" tag is carried over from the live site for every coffee; not independently verified.
- Fonts: PP Eiko and Modern Gothic are substituted by Instrument Serif and Inter until licences are bought.

## Needs owner approval
- Buying web licences for PP Eiko and Modern Gothic.
- Real prices and weights; Stripe account keys; shipping policy and countries; pre-order terms copy.
- Confirming the About photograph and About/Wholesale copy (both drafted, marked as drafts in `site.json`).
- DNS switch from Framer to Vercel (steps in README). Nothing live has been changed.
- Whether the Origin Atlas (map) composition is wanted as built; markers are placed at country centroids (region level), never at farms.
