# Regulation Delta: The Ghost Lap

An interactive, scroll-driven comparison of matched Formula 1 Grands Prix from 2025 and 2026. The site follows a continuous course through pace, straight-line speed, running-order movement and race-control disruption before reaching a deliberately cautious verdict: the sample shows change, not isolated regulation causality.

## Local preview

```powershell
cd C:\Users\alejo\Documents\Repos\F1
python -m http.server 4173
```

Open `http://localhost:4173/`.

The site is intentionally zero-build and suitable for GitHub Pages. D3 renders the data views; GSAP and ScrollTrigger provide progressive motion; the document remains readable if motion is disabled.

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

- `index.html` — editorial structure and accessible controls
- `css/ghost-lap.css` — responsive visual system
- `js/charts-v2.js` — interactive D3 views and data summaries
- `js/course.js` — continuous scroll-linked course
- `js/motion-v2.js` — restrained chapter motion and navigation
- `scripts/build_alpha_release_data.py` — FastF1 extraction and derived metrics

## Interpretation limits

The analysis compares the same circuits across two seasons, but it does not control weather, tires, track evolution, strategy, incidents or field composition. It is a descriptive matched-race comparison—not a causal estimate of the 2026 regulations.

## Deployment

The repository is configured for a static deployment. The historical target URL is `https://alejandrospot2.github.io/F1/`; verify the published branch and URL before sharing.
