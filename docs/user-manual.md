# User Manual

Project: **Regulation Delta: The Ghost Lap**
Author: Alejandro Gonzalez
Current release: July 2026

## What this is

This zero-build data story compares matched Formula 1 Grands Prix from 2025 and 2026. Scrolling follows a continuous course through pace, running-order movement, race-control states, the complete scorecard and a final verdict.

The analysis is descriptive. Same-circuit pairing helps, but weather, tires, track evolution, strategy, incidents and field composition are not controlled, so the site does not claim that the regulations caused every difference.

## Run locally

From the repository root:

```powershell
python -m http.server 4173
```

Open `http://localhost:4173/` in a modern browser. Internet access is needed for the D3, GSAP and Google Fonts CDN files; the data and image assets are local.

The historical deployment target is `https://alejandrospot2.github.io/F1/`. Verify the published branch before sharing it.

## Main interactions

- Use the top navigation to jump between track sectors.
- Switch the pace board among median driver-best lap, fastest green lap and speed-trap summary.
- Choose a circuit in the running-order section.
- Scrub the race lap by lap.
- Hover, focus or tap a driver to spotlight them; click or press Enter to lock the highlight, and press Escape to clear it.
- Switch the marshal-light ribbon between all caution states and full neutralization only.
- Open the race-control table for a keyboard- and screen-reader-friendly lap-by-lap view.
- Scroll the exact scorecard horizontally on small screens.
- Reduced-motion preferences disable progressive car movement and non-essential animation.

Every SVG chart has a screen-reader summary or table. Controls are real buttons and the lap scrubber supplies an accessible value description.

## Data and corrected metrics

The canonical generated files are:

```text
assets/data/alpha-release.json
js/alpha-release-data.js
```

Rebuild both with:

```powershell
pip install -r requirements.txt
python scripts/build_alpha_release_data.py
```

FastF1 creates or refreshes `.fastf1_cache/` during the build.

| Metric | Definition |
|---|---|
| Median driver-best lap | Median of each driver's best accurate green-flag lap |
| Fastest green lap | Fastest accurate green-flag lap in the race sample |
| Speed-trap summary | Median of each driver's maximum clean-lap speed-trap reading |
| Movement / 100 driver-laps | Absolute position-slot changes across consecutive observed laps, normalized by observed transitions |
| Caution-affected laps | P1-clock race laps with local yellow, VSC, Safety Car or red flag |
| Full-neutralization laps | P1-clock race laps with VSC, Safety Car or red flag; local-yellow-only laps excluded |
| Not officially classified | Official nonnumeric classifications, with unclassified, DSQ, DNS and DNQ states retained separately |

Running-order movement is not an overtake count. Strategy, pit stops, retirements, recovery drives and race-control events all contribute.

## Site files

```text
index.html
css/ghost-lap.css
js/charts-v2.js
js/course.js
js/motion-v2.js
scripts/build_alpha_release_data.py
```

The older `site.css`, `charts.js`, transition scripts and WebGL background remain as historical work but are not loaded by the new page.

## Troubleshooting

If the page is unstyled, confirm the server is running from the repository root and that `css/ghost-lap.css` returns successfully. If charts are missing, check network access for D3 and confirm `js/alpha-release-data.js` loads before `js/charts-v2.js`.

If a FastF1 rebuild fails for a recent race, connect to the internet and retry so the session cache can be completed. Once cached, subsequent builds can reuse the local timing data.
