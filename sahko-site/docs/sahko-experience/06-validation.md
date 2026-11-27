# 06 · Validation, measurements and critique

Everything here was run in this session against the local build (`node scripts/server.mjs`, headless Chromium with SwiftShader). Lab numbers, not field data.

## Automated checks
- `npm test`: **21 pass** (orbit geometry 7, state machine 4, checkout 6, inquiry 3, catalogue 1).
- Playwright scenario script (33 assertions): **33 pass**; Origin Atlas script (13 assertions: lazy load, ring repositions below the map, marker click, chip sync, glide, URL state, outline click, state unchanged, fade during inspection, restore on reload, phone overflow): **13 pass**. It covers: initial state and hash; 10× next (wraps to index 4), 10× prev (returns), 12 rapid alternating arrows; ArrowRight/Left; click on a peripheral bag (shortest path); drag with snap; click immediately after a drag is ignored; exactly one image of the chosen bag exists mid-transition; URL, state and focus after inspection; roasted-bean view; browser back restores browsing with the same coffee and the image back in the orbit; back during the enter animation; resize during the enter animation; Profile filter "floral" keeps exactly the four floral coffees and encodes `?mode=profile&f=floral`; Origin filter "Ethiopia" keeps two; direct load of `/coffee/guji/`; legacy `/wholesale/guji/` redirects; `/#cauca` deep link; server-side form validation renders field errors; theme toggle flips and persists; reduced motion makes step and inspection immediate; phone 390: no horizontal overflow, swipe advances, inspection reached; 320 px: no overflow.
- axe-core 4.10 (WCAG 2.x A/AA + best practice) on home browsing, home inspecting, coffee page, wholesale, about: **0 violations** after one fix (the emptied bag link needed an `aria-label`; the stage is now `inert` while inspecting).
- Keyboard order on home: skip link → logo → Collection → About → Wholesale → Contact → theme → front bag → previous → next → Inspect → Collection/Origin/Profile. Only the front bag is tabbable; arrows work when focus is anywhere in the stage.

## Performance (lab)
| | desktop 1440, no throttle | phone 390, 4× CPU slowdown |
|---|---|---|
| DOMContentLoaded | 74–251 ms | 287–362 ms |
| LCP (front bag image) | 136–308 ms | 208–324 ms |
| CLS | 0.0003 | 0 |
| Requests / transfer | 12 / 320 KB (atlas +87 KB only in Origin mode) | 12 / 320 KB |
| Click → first changed frame | 81–92 ms | 81–102 ms |
| Frames during an orbit step | 61 fps | 61 fps |
| Animations running 1.5 s after the last input | 0 | 0 |

Ranges are from two runs; the second ran alongside other headless sessions. Transfer is dominated by six 1024 px PNG cut-outs (≈45 KB each) and the Inter/Instrument Serif CSS. The render loop stops when the orbit settles; there is no idle work. Not measured: real devices, network throttling, field CWV.

## Screenshots (`screenshots/`)
home-desktop, inspect-mid (bag in flight, lines clipped), inspect-done, inspect-beans, home-dark, home-mobile, mobile-inspect, mobile-detail, home-320, home-768, profile-filter, origin-filter, atlas-desktop, atlas-ethiopia (map glided toward the chosen country, ring filtered to two), atlas-mobile, detail-direct, about, wholesale, reduced-inspect.

## Acceptance table

| Area | Status | Evidence |
|---|---|---|
| Orbital geometry | strong | perspective ring, upright bags, wrap tests, 0/1/2/N tests |
| Interaction | strong | 33-step script incl. interruption and rapid input |
| Shared transition | strong | single element, no duplicate (asserted), reverse from current rect |
| Routes | strong | direct, refresh, back/forward, legacy redirect, 404 page |
| Responsive | needs work | 320/390/768/1440 verified; 1024 not separately inspected; tablet layout is the desktop composition |
| Themes | strong | tokens, no flash (inline script), persisted, photos untouched |
| Reduced motion | strong | durations 0, card renders immediately, all controls usable |
| Data | strong (with flags) | every fact from the live site; prices flagged as prototype |
| Commerce | needs work | Checkout tested with a mocked Stripe client only; no live test-mode run |
| Discovery | strong | Origin/Profile share records, selection and URL state; Origin Atlas (outline map, markers, glide) built and checked: lazy load, marker and outline clicks, chip sync, URL restore, hidden during inspection, no phone overflow |
| Brand | strong | wordmark text, label untouched, one ornament (macron), no card grid |
| Accessibility | strong (automated) / needs work (manual) | axe clean; no screen-reader session was run |
| Performance | strong (lab) | table above |
| Operations | strong | build/tests pass; no secrets; nothing deployed |

## Self-critique
1. *Without the wordmark, is it Sahkō?* Mostly yes: the empty ground, the lower-left plate echoing the bag label, the plinth hairline and the macron indicator are specific. The substitute fonts are the weakest link; PP Eiko's contrast is a large part of the voice.
2. *Is the white space deliberate?* Yes at 1440 and 390. At 768 the stage is tall and the bags small; a tablet-specific radius would help.
3. *Derived or copied?* Derived: nothing from the references was reproduced; the principles are recorded.
4. *Genuinely orbital?* Yes: one projection drives position and size; the back row is visibly nearer the centre and higher. The first build was not (manual scale on a sine), and was changed after seeing it.
5. *Continuous object?* Yes, the same `<img>`; asserted mid-flight.
6. *Digital reveal sophisticated?* Restrained: clipped lines with staggered timing, one 420 ms decode on the eyebrow, icon strokes drawing in. No glitch, no scanlines.
7. *Do the modes answer real needs?* Profile does (plain-language families from real notes). Origin now has the atlas: an outline world with four region-level markers that glides toward the chosen country; the chips remain the accessible control.
8. *Truthful and straightforward purchase?* Yes, with prototype pricing flagged in the UI. Single-item checkout only.
9. *Mobile designed?* Yes: same composition, bags higher, menu button, inspection stacks with the bag on top.
10. *Weakest part?* The fonts, then the tablet composition. Evidence: the serif stand-in is lighter and narrower than PP Eiko; at 768 px the bags are small in a tall stage. Fix: license the fonts; give tablets their own radius and bag size.

## Unresolved / not verified
- Live Stripe test-mode run (no key in this session).
- Manual screen-reader pass (VoiceOver/NVDA).
- Real-device motion feel; the flick carry (`≤ half a step`) is tuned by eye in headless Chromium.
- The About photograph's licence.
