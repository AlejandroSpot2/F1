# HANDOFF

## Current direction

The selected direction is **Terminal Slipstream**: a full-viewport, racetrack-like data narrative built from an original Three.js ASCII/glyph field, Bayer-dither layers, a generated wireframe race-car asset and red/lime timing-terminal graphics.

The core editorial claim remains deliberately narrow: in the nine matched circuits currently available, 2026 usually ran slower and the running order usually moved less. Caution-affected laps rose by one while full-neutralization laps fell by one. That is evidence of a different-looking sample, not proof that the regulations caused the changes or made racing better.

## Architecture

- The project remains zero-build and GitHub Pages compatible.
- D3 7.9.0 renders and updates the evidence views.
- GSAP 3.15.0 and ScrollTrigger choreograph the hero, chapters and pinned signal gates.
- `js/terminal-slipstream.js` imports Three.js 0.185.1 and owns the GPU glyph atlas, pointer response, scroll-velocity field, canvas dithering, global season isolator and opt-in WebAudio layer.
- `assets/images/terminal-slipstream-car.png` is the real high-resolution hero/fallback asset; the ASCII reconstruction is an enhancement, not a substitute.
- Dither Kit was used as inspiration only. No Dither Kit source is bundled because the project is framework-free and the package's distribution/license presentation was not a clean fit.

## Files to review first

- `index.html`
- `css/ghost-lap.css`
- `js/charts-v2.js`
- `js/motion-v2.js`
- `js/terminal-slipstream.js`
- `assets/images/terminal-slipstream-car.png`
- `scripts/build_alpha_release_data.py`
- `assets/data/alpha-release.json`
- `design-qa.md`

## Data rules preserved

- Timed-lap accuracy is used for pace only, not for running-order samples.
- Movement is normalized per 100 consecutive observed driver-lap transitions and is never labelled overtaking.
- Race-control status uses the P1 car's canonical lap clock, preventing lapped cars' asynchronous personal lap numbers from smearing incidents across adjacent race laps.
- Caution-affected laps and full-neutralization laps are separate measures.
- Non-numeric classifications are broken into unclassified, disqualified, DNS and DNQ categories rather than being labelled DNFs.
- Counts, captions, accessible tables and headline findings are generated from the loaded data bundle.

## Verification completed

- Desktop browser pass at 1440×1024.
- Mobile browser pass at 390×844 with zero root-level horizontal overflow.
- Reduced-motion pass with animated canvases disabled and all chapters visible.
- Pace tabs, season isolation, ambient-sound opt in/out, circuit selector, lap scrubber, race-control mode and method disclosures exercised.
- Keyboard skip link and visible focus state checked.
- Console checked after interaction, mobile and reduced-motion passes: zero errors and zero warnings.
- JavaScript syntax checks and `git diff --check` passed.

## Deployment note

The current asset cache key is `ultra-2`. If visual assets or runtime scripts change, increment it in `index.html` so GitHub Pages visitors do not retain stale CSS or JavaScript.
