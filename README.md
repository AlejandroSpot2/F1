# Regulation Delta: Terminal Slipstream

An immersive, scroll-driven comparison of matched 2025 and 2026 Formula racing weekends. The experience follows a 2025 ghost through pace, running-order movement and race-control disruption, then separates what changed from what the available sample can actually attribute to the 2026 regulations.

The visual system is intentionally closer to a live timing terminal crossed with a wind tunnel than a conventional dashboard: custom WebGL glyph particles, Bayer dither, a generated wireframe race-car asset, signal-gate transitions, pinned scroll scenes and exact interactive D3 evidence.

## Local preview

```powershell
cd C:\Users\alejo\Documents\Repos\F1
python -m http.server 4173
```

Open `http://localhost:4173/`.

This is a zero-build static site suitable for GitHub Pages. Browser dependencies are pinned to exact versions in `index.html`; see `THIRD_PARTY_NOTICES.md` for licenses.

## Experience controls

- Switch the global signal field between 2025, both seasons and 2026.
- Opt into the subtle ambient engine layer; sound is off by default.
- Change the pace measure between median driver-best lap, fastest green lap and speed-trap summary.
- Select a circuit and scrub the paired running order lap by lap.
- Focus, hover or tap chart marks to hold exact values.
- Toggle the marshal-light ribbon between all caution states and full neutralization.
- Expand the methodology and exact leader-lap race-control table.

## Data pipeline

The canonical generated outputs are:

- `assets/data/alpha-release.json`
- `js/alpha-release-data.js`

Rebuild both from FastF1 with:

```powershell
python scripts/build_alpha_release_data.py
```

The builder keeps timing laps separate from position samples, normalizes running-order movement per 100 consecutive driver-lap transitions, samples race-control status on the P1 car's canonical lap clock, distinguishes local-yellow caution from VSC/Safety Car/red-flag neutralization, and separates official non-classification states instead of calling all of them DNFs.

## Main files

- `index.html` — editorial structure, controls and accessible fallbacks
- `css/ghost-lap.css` — Terminal Slipstream design system and responsive states
- `js/charts-v2.js` — interactive D3 evidence and generated summaries
- `js/motion-v2.js` — chapter choreography, signal gates and navigation
- `js/terminal-slipstream.js` — original Three.js glyph field, dither canvases, season isolation and opt-in sound
- `assets/images/terminal-slipstream-car.png` — generated high-resolution hero asset
- `scripts/build_alpha_release_data.py` — FastF1 extraction and derived metrics

## Accessibility and performance

- Semantic buttons, labels, accessible chart descriptions and generated data tables preserve the underlying evidence.
- Keyboard focus is visible and the first tab stop is a skip link to the evidence.
- `prefers-reduced-motion` disables the animated canvases and keeps every chapter visible.
- WebGL particle counts and device-pixel ratio are capped on smaller devices; the generated car remains as the static fallback.
- Dense charts and scorecards scroll inside their own rails on mobile without expanding the page viewport.

## Interpretation limits

The analysis compares the same circuits across two seasons, but it does not control weather, tires, track evolution, strategy, incidents or field composition. It is a descriptive matched-race comparison—not a causal estimate of the 2026 regulations.

## Deployment

The historical GitHub Pages target is `https://alejandrospot2.github.io/F1/`. Verify the Pages source branch and the live URL after publishing.
