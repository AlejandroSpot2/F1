# HANDOFF

## Current State

- The `F1` directory started empty and now has a working project site scaffold.
- `index.html` has been replaced with a single screenshot-ready D3 page that renders five visualization sections from FastF1 data.
- `scripts/build_alpha_release_data.py` rebuilds the dataset and writes both `assets/data/alpha-release.json` and `js/alpha-release-data.js`.
- The project writeup source lives in `docs/alpha-release-report.md`, and the print-friendly export page is `docs/alpha-release-report.html`.

## Files To Review First

- `README.md`
- `index.html`
- `scripts/build_alpha_release_data.py`
- `js/alpha-release-data.js`
- `docs/alpha-release-report.md`
- `docs/alpha-release-report.html`

## Immediate Next Tasks

1. Capture the five chart screenshots from `index.html` and place them into Notion/the report.
2. Push the separate repository to GitHub and publish GitHub Pages so the target URL is live.
3. Decide whether to keep the current chart styling or do one final polish pass.
4. Export the report to PDF when the copy and figures are final.

## Assumptions Made

- The intended deployment URL is `https://alejandrospot2.github.io/F1/`.
- The project is a static site and does not need app-style interaction at this stage.
- The current priority is final project completeness and screenshot readiness, with lightweight interaction through tooltips.

## Notes For The Next Agent

- Keep the UI plain and functional. This is a coursework project site, not a marketing page.
- Preserve the folder structure unless there is a clear reason to reorganize it.
- If data needs to be refreshed, rerun `python scripts/build_alpha_release_data.py` from the repo root.
- Browser verification succeeded once through the locally installed Playwright package in the older repo; the MCP browser launcher itself was unreliable on this machine.
