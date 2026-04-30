# F1 Data Visualization Project

This repository is the working home for the F1 class project and its Alpha Release materials. It now includes a static D3 landing page built from FastF1 race data, local report files, and the supporting assets needed for screenshots and PDF export.

## Project Website

Target GitHub Pages URL: `https://alejandrospot2.github.io/F1/`

If the repository is published under a different account or branch configuration, update this link in both the site and the report before submission.

## What Is Included

- `index.html` is the screenshot-ready Alpha Release page with all five D3 sections.
- `css/site.css` contains the shared site styles.
- `js/alpha-release-data.js` is the browser-ready data bundle generated from FastF1.
- `docs/alpha-release-report.md` is the Alpha Release writeup source.
- `docs/alpha-release-report.html` is the print-friendly version to export as PDF.
- `HANDOFF.md` is the status note for another Codex session.
- `scripts/build_alpha_release_data.py` rebuilds the FastF1 dataset used by the site.
- `visualizations/d3/` still contains earlier starter pages, but the main deliverable charts now live on `index.html`.
- `visualizations/static/` is the drop zone for exported PNG, SVG, or PDF figures.
- `assets/data/` is the place to store cleaned datasets used by the charts.

## Local Preview

For a quick local preview, either open `index.html` directly in a browser or serve the folder with:

```powershell
cd C:\Users\alejo\Documents\Repos\F1
python scripts/build_alpha_release_data.py
python -m http.server 4173
```

Then open `http://localhost:4173/`.

## Alpha Release Checklist

- Capture screenshots from `index.html` and place the final exported images where you want them for the report.
- Push the separate project repository and verify the GitHub Pages deployment.
- Export the report to PDF and submit it as `Alpha Release`.
