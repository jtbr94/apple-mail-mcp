# 03 · Three directions and the decision

Static comps in `directions/` (HTML + screenshots at 1440 and 390 px). All three keep the orbital carousel, the real bag cut-outs, the brand palette and the serif/sans pairing. They differ in hierarchy, spatial rhythm and what the first interaction is.

## A · Editorial Gallery
A museum wall. The orbit sits in a fixed-height band under the nav; beneath it a caption strip (name · origin · "Explore"), then an essay block with the coffee's name set large, then a numbered index of the collection. Scroll is conventional. **Strength:** reads beautifully at rest, very literate, strong type hierarchy. **Weakness:** the orbit becomes a header image; the page is still a vertical document, and inspection would scroll rather than transform. Mobile is a long page again.

## B · Spatial Object Atelier
The stage is the whole viewport. A hairline "plinth" implies the platform, the front bag casts a soft contact shadow, neighbours recede with depth blur. Information lives on an exhibition plate bottom-left (name in serif, origin · process, three notes, "— Inspect"), the discovery modes bottom-right, a macron-dash position indicator top-centre. **Strength:** most distinctive; the object is unambiguously the subject; inspection as "the same bag moves to the left column" is natural here; mobile is the same composition at a smaller radius rather than a compressed page. **Weakness:** demands discipline so the stage never feels empty; the list fallback must be designed in, not bolted on.

## C · Sensory Archive
A register column on the left (every coffee, with its leading sensory family drawn as a monoline icon) and the orbit on the right. Modes sit at the top of the register. **Strength:** honest, scannable, accessible by construction; the Profile mode is already visible. **Weakness:** two competing centres; the orbit shrinks to an illustration beside a list; closest of the three to a conventional catalogue.

## Rubric

| Criterion | A Editorial | B Atelier | C Archive |
|---|---|---|---|
| Distinctiveness (logo-swap test) | needs work | strong | needs work |
| Clarity at rest | strong | strong | strong |
| Motion quality potential (orbit + shared-element) | needs work | strong | needs work |
| Feasibility in this stack | strong | strong | strong |
| Commerce usability | strong | strong (plate → inspect → buy) | strong |
| Mobile designed, not compressed | needs work | strong | needs work |
| Accessibility by construction | strong | needs work (list must be added) | strong |

## Decision
Build **B**, and take two things from the others: A's typographic treatment for the inspection card (serif name set large once, body in complete sentences), and C's register as the accessible list, the Profile/Origin mode surface and the no-JS/reduced-motion fallback. Why it is uniquely Sahkō: the composition is the bag label scaled up to a room (small information block lower-left, enormous blank ground, one object), and the only ornament is the macron from the wordmark used as the position indicator and the Inspect affordance. Remove the wordmark and the plate-plus-plinth still reads as this brand.
