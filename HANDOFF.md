# HANDOFF

## Current direction

The site has been reworked as **Regulation Delta: The Ghost Lap**: a continuous racetrack narrative rather than a gallery of chart cards and repeated interstitials.

The core editorial claim is intentionally narrow: the matched sample shows that 2026 looked different—especially in pace—but does not prove that the regulations caused every change or that racing improved.

## Files to review first

- `index.html`
- `css/ghost-lap.css`
- `js/charts-v2.js`
- `js/course.js`
- `js/motion-v2.js`
- `scripts/build_alpha_release_data.py`
- `assets/data/alpha-release.json`

## Data corrections now encoded

- Timed-lap accuracy is used for pace only, not for running-order samples.
- Movement is normalized per 100 consecutive observed driver-lap transitions and is never labelled overtaking.
- Race-control status uses the P1 car's canonical lap clock, preventing lapped cars' asynchronous personal lap numbers from smearing incidents across adjacent race laps.
- Caution-affected laps and full-neutralization laps are separate measures.
- Non-numeric classifications are broken into unclassified, disqualified, DNS and DNQ categories rather than being labelled DNFs.
- Counts and headline findings are generated from the data bundle instead of hard-coded.

## Verification expectations

- Serve the repository at `http://localhost:4173/`.
- Test the full scroll path, pace metric tabs, circuit selector, lap scrubber, driver highlighting, race-control toggle and scorecard.
- Check desktop, mobile and reduced-motion behavior.
- Confirm no console errors and inspect the generated accessible summaries and lap-by-lap race-control table.
- Rebuild data with `python scripts/build_alpha_release_data.py` when the event sample changes.
