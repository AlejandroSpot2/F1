# Design QA — Terminal Slipstream

## Comparison target

- Source visual truth: `C:\Users\alejo\.codex\generated_images\019f5ec8-5e6d-7650-ae68-b0af3883995a\exec-b9643484-56b8-491f-9916-7695526571db.png`
- Browser-rendered implementation: `C:\Users\alejo\Documents\Repos\F1\output\playwright\ultra-hero-v5.png`
- Full-view side-by-side comparison: `C:\Users\alejo\Documents\Repos\F1\output\playwright\design-qa-comparison.png`
- Focused typography/CTA comparison: `C:\Users\alejo\Documents\Repos\F1\output\playwright\design-qa-focus-type.png`
- Focused car/glyph-field comparison: `C:\Users\alejo\Documents\Repos\F1\output\playwright\design-qa-focus-car.png`
- Viewport: source normalized from 1487×1058 to the implementation's 1440×1024 aspect ratio; implementation captured at 1440×1024 CSS pixels.
- State: desktop hero, dark theme, both seasons visible, normal motion, ambient sound off, story progress 0%.

## Browser evidence

- Desktop full story: `C:\Users\alejo\Documents\Repos\F1\output\playwright\ultra-fullpage-desktop.png`
- Running-order interaction: `C:\Users\alejo\Documents\Repos\F1\output\playwright\ultra-order-interactive.png`
- Final paper-safe order palette: `C:\Users\alejo\Documents\Repos\F1\output\playwright\ultra-order-contrast-v2.png`
- Race-control full-neutralization mode: `C:\Users\alejo\Documents\Repos\F1\output\playwright\ultra-control-neutralized.png`
- Verdict: `C:\Users\alejo\Documents\Repos\F1\output\playwright\ultra-verdict.png`
- Final mobile hero: `C:\Users\alejo\Documents\Repos\F1\output\playwright\ultra-mobile-hero-v2.png`
- Final mobile reduced-motion full story: `C:\Users\alejo\Documents\Repos\F1\output\playwright\ultra-fullpage-mobile-reduced-v2.png`

Primary interactions tested in the browser:

- 2025 / both / 2026 visual-field isolation.
- Ambient sound opt in and opt out; default remained off.
- All three pace metrics and their explanatory copy.
- Circuit selection, paired lap scrubber and accessible lap status.
- Race-control all-states / full-neutralization filter.
- Method disclosures.
- Keyboard entry through the visible skip link.
- Desktop, 390×844 mobile and `prefers-reduced-motion: reduce` layouts.

Console errors checked after the desktop interaction sweep, mobile pass, reduced-motion pass and final release-state load: **0 errors, 0 warnings**.

## Findings

- No actionable P0, P1 or P2 findings remain.
- [P3] The source masks more dither texture directly through the headline, while the implementation keeps the Bebas Neue letterforms solid and places the moving glyph texture behind them. This is an intentional legibility tradeoff; the industrial condensed hierarchy, red/cream split and terminal rhythm remain faithful.
- [P3] The source exposes a pace teaser inside the first frame. The implementation gives the hero a full viewport and moves pace into the first dedicated track sector. This is intentional narrative pacing for the requested immersive scroll journey, not missing content.

## Required fidelity surfaces

- Fonts and typography: Bebas Neue recreates the source's tall condensed display voice; IBM Plex Mono carries telemetry, controls, annotations and prose. Hierarchy, wrapping and optical separation are stable on desktop and mobile. The source's distressed headline texture is the only residual P3 difference.
- Spacing and layout rhythm: the desktop preserves the source's left headline/right car tension and telemetry perimeter while expanding it into a full-viewport opening lap. Signal gates, alternating asphalt/paper sectors and terminal dividers maintain a deliberate racing cadence. Mobile chapters stack cleanly and dense evidence remains inside horizontal rails.
- Colors and visual tokens: asphalt `#080a08`, paper `#f2eee4`, 2025 red `#ff4a36` and 2026 lime `#c7ff36` match the selected direction. Paper surfaces use contrast-safe red `#c82e22` and olive `#4d6a05` variants for small text and marks while retaining the bright colors on dark sections.
- Image quality and asset fidelity: the implementation uses a real generated 2048×1152 wireframe open-wheel car asset with a clean black background, sharp detail and an intentional front-right crop. It is reinforced by original GPU glyph particles and an ASCII reconstruction rather than replaced by CSS, inline SVG or placeholder art.
- Copy and content: the selected headline is preserved. Supporting copy is slightly more explicit than the concept so the 2025/2026 comparison, sample boundary and non-causal conclusion stand alone without sacrificing the terminal tone.
- Icons and controls: the concept relies on telemetry glyphs rather than an icon family; the implementation follows that language consistently. Controls use semantic buttons, visible pressed states and square timing-terminal geometry.
- Responsiveness and accessibility: final mobile root width is exactly 390/390 with no sideways page travel. The sound target is 50×36 CSS pixels, controls retain scroll affordances, focus is visible, the first tab stop is the skip link, and reduced motion removes animated canvases while leaving every chapter visible.

## Full-view comparison evidence

`design-qa-comparison.png` was inspected as one native-resolution side-by-side input. Both frames share the selected condensed headline, red/cream/lime/asphalt palette, wireframe-car subject, telemetry perimeter and dense particle field. The implementation intentionally changes the source's single-board density into a full-screen starting grid so the rest of the evidence can unfold as separate track sectors.

## Focused comparison evidence

- `design-qa-focus-type.png` confirms the headline scale, line breaks, brand treatment, mono support copy and CTA hierarchy. The implementation's title is cleaner and more solid, classified as P3 above.
- `design-qa-focus-car.png` confirms subject correctness, high-resolution wireframe detail, black-background integration, ASCII/glyph density and the red/lime airflow language. The front-right crop differs from the source's centered three-quarter car but preserves the intended visual tension and gives the copy a clean reading lane.

## Comparison history

1. **P1 — hero headline invisible at scroll position 0.**
   - Earlier evidence: `C:\Users\alejo\Documents\Repos\F1\output\playwright\ultra-hero-v3.png` and browser-computed opacity `0` on all three headline spans.
   - Cause: the hero scrub captured GSAP intro `.from()` opacity values before the intro completed.
   - Fix: registered the scroll scrub before the intro timeline so it captures the authored opacity while preserving the entrance animation.
   - Post-fix evidence: `ultra-hero-v4.png`, then final `ultra-hero-v5.png`; all spans report opacity `1` at the start.

2. **P2 — mobile document expanded beyond the viewport.**
   - Earlier evidence: browser measurement `scrollWidth: 496`, `clientWidth: 390`; the dense scorecard was internally scrollable but transformed content still enlarged the root.
   - Fix: added root-level `overflow-x: clip` while retaining independent overflow rails on charts, circuit controls and tables.
   - Post-fix evidence: final browser measurement `390 / 390`, `maxScrollX: 0`; `ultra-mobile-hero-v2.png` and `ultra-fullpage-mobile-reduced-v2.png`.

3. **P2 — bright season accents lost contrast on paper data surfaces.**
   - Earlier evidence: `ultra-order-interactive.png` shows bright lime/red labels and marks against cream.
   - Fix: introduced paper-specific red/olive tokens, applied them to small copy and season labels, and made D3 pattern/dither colors surface-aware. Increased the mobile sound target to 50×36 and chart-mode targets to 38 px high during the same accessibility pass.
   - Post-fix evidence: `ultra-order-contrast-v2.png`; browser-computed colors are `rgb(200, 46, 34)` and `rgb(77, 106, 5)` on paper.

4. **Final comparison.**
   - `design-qa-comparison.png`, `design-qa-focus-type.png` and `design-qa-focus-car.png` contain no remaining actionable P0/P1/P2 visual differences.

## Implementation checklist

- [x] Match the selected Terminal Slipstream art direction.
- [x] Use a real high-resolution hero asset and original glyph/dither system.
- [x] Preserve exact data contracts and accessible tables.
- [x] Exercise core controls and keyboard entry in a real browser.
- [x] Verify mobile and reduced-motion behavior.
- [x] Resolve all P0/P1/P2 findings and recompare at the same desktop viewport/state.

## Follow-up polish

- Optional P3: experiment with a carefully authored texture mask on only the largest headline line if a future pass can preserve readability and reduced-motion behavior.

final result: passed
