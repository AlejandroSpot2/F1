# User Manual

Project: **From DRS to Mario Mushrooms**  
Author: Alejandro Gonzalez  
Final deliverable date: May 2026

## 1. Project Summary

This project is a static data visualization website comparing Formula 1 race data from the 2025 and 2026 seasons. It focuses on Australia, China, Japan, Miami, Canada, Monaco, Barcelona, and Austria and compares pace, straight-line speed, race-position movement, incidents, neutralization periods, and circuit-level metric changes.

The website is designed for viewers who may not already follow Formula 1. Each chart includes a short explanation, legends, formatted numbers, and hover tooltips.

Live project URL:

```text
https://alejandrospot2.github.io/F1/
```

## 2. Deliverable Folder Map

The final submission folder is organized as:

```text
final_deliverable/
  report/
    Final_Project_Report.pdf
    latex_source/
  slides/
    Final_Project_Slides.pptx
    rendered_slide_previews/
  demo_video/
    ADD_DEMO_VIDEO_HERE.txt
  code_and_data/
    project_site/
  user_manual/
    User_Manual.md
```

The video is not included yet. Add the recorded demo video into `final_deliverable/demo_video/` before zipping and submitting to Canvas.

## 3. How to Run the Website

### Recommended Local Run

1. Open a terminal.
2. Change into the project site folder:

```powershell
cd final_deliverable\code_and_data\project_site
```

3. Start a local web server:

```powershell
python -m http.server 4173
```

4. Open this URL in a browser:

```text
http://localhost:4173/index.html
```

Use `http://localhost` instead of opening the file directly. This is the most reliable way to load the site assets and mirrors how the project was tested.

### Direct Open Fallback

If Python is not available, open `index.html` directly in a browser. The static assets use relative paths, so the page should still load, but local server mode is preferred.

## 4. Dependencies and Versions

The website itself does not require a build step or npm install. It is plain HTML, CSS, JavaScript, D3, and static data.

Tested local tools:

| Dependency | Version / Source | Used For |
|---|---:|---|
| Python | 3.12.13 | Local server and data rebuild script |
| FastF1 | 3.8.1 | Downloading Formula 1 session data |
| pandas | 2.3.3 | Cleaning and transforming race data |
| D3.js | v7 CDN script | Rendering the charts |
| Scrollama | CDN script from unpkg | Scroll-triggered transition state |
| MiKTeX / pdfTeX | MiKTeX 24.1 | Compiling the LaTeX report |
| Node.js | v24.14.0 | Presentation/report utility scripts |

Python dependencies are listed in `requirements.txt`:

```powershell
pip install -r requirements.txt
```

The website currently loads D3 and Scrollama from CDNs, so internet access is recommended when running the page locally.

## 5. How to Rebuild the Data

The deliverable includes the cleaned dataset used by the website:

```text
assets/data/alpha-release.json
js/alpha-release-data.js
```

To regenerate the data from FastF1:

```powershell
cd final_deliverable\code_and_data\project_site
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python scripts\build_alpha_release_data.py
```

The script rebuilds:

```text
assets/data/alpha-release.json
js/alpha-release-data.js
```

FastF1 will create a local `.fastf1_cache/` folder when the script runs. That cache is not included in the deliverable folder to keep the submission smaller. The cleaned JSON data used by the charts is included.

## 6. Data Sources and Metrics

Data source:

```text
FastF1 Python API
```

Included races:

```text
2025 Australian Grand Prix
2025 Chinese Grand Prix
2025 Japanese Grand Prix
2025 Miami Grand Prix
2025 Canadian Grand Prix
2025 Monaco Grand Prix
2025 Spanish Grand Prix
2025 Austrian Grand Prix
2026 Australian Grand Prix
2026 Chinese Grand Prix
2026 Japanese Grand Prix
2026 Miami Grand Prix
2026 Canadian Grand Prix
2026 Monaco Grand Prix
2026 Barcelona-Catalunya Grand Prix
2026 Austrian Grand Prix
```

Derived metrics:

| Metric | Meaning |
|---|---|
| Median best lap | Median of drivers' best clean lap times in seconds |
| Fastest lap | Fastest clean lap in the race data |
| Median speed trap | Median straight-line speed-trap value |
| Position-change proxy | Sum of absolute lap-to-lap position changes across drivers |
| Neutralized laps | Laps marked as yellow, VSC, Safety Car, or red flag |
| DNFs | Drivers not classified as finishers |

The position-change proxy is not a pure overtake count. It also captures pit-stop reshuffling, retirements, Safety Car effects, and recovery drives.

## 7. Website Sections

The site contains these major sections:

1. **Hero / Overview**  
   Introduces the project and the race-comparison question.

2. **Circuit Comparison Bars**  
   Compares lap-time and speed-trap values across 2025 and 2026.

3. **Lap-by-Lap Position Step Charts**  
   Shows how leading drivers moved through each race. The top row is 2025 and the bottom row is 2026.

4. **Position-Change Proxy**  
   Uses a slope graph to compare running-order volatility by circuit.

5. **Incident and Neutralization Timeline**  
   Shows green-flag running, yellow flags, VSC, Safety Car, and red flag states by lap.

6. **Final Circuit Scorecard**  
   Summarizes 2026 minus 2025 metric deltas by circuit.

7. **Methodology / Footer**  
   Explains the data pipeline and libraries used.

## 8. Interactions

Supported interactions:

- Use the top navigation links to jump to major chart sections.
- Scroll through the page to view arcade-style transition sections.
- Hover over chart marks, bars, cells, and points to see tooltips.
- Use browser zoom if presenting on a projector.

There are no keyboard shortcuts or hidden controls.

Accessibility notes:

- The site uses text descriptions before each chart.
- Legends are included for chart colors.
- The CSS respects reduced-motion preferences for continuous animation.
- For best readability, use a modern desktop browser such as Chrome, Edge, or Firefox.

## 9. How to Rebuild the Report

The final report PDF is already included:

```text
final_deliverable/report/Final_Project_Report.pdf
```

The LaTeX source is also included in:

```text
final_deliverable/report/latex_source/
```

To rebuild the report from the LaTeX source:

```powershell
cd final_deliverable\report\latex_source
pdflatex -interaction=nonstopmode report.tex
bibtex report
pdflatex -interaction=nonstopmode report.tex
pdflatex -interaction=nonstopmode report.tex
```

The source uses the IEEE conference format via:

```latex
\documentclass[conference]{IEEEtran}
```

## 10. Known Limitations

- The project is a visualization comparison, not a causal proof that every difference was caused by 2026 regulations.
- The position-change proxy includes pit stops and race events, not only on-track overtakes.
- D3 and Scrollama are loaded from CDNs; local viewing works best with internet access.
- Rebuilding the data requires FastF1 API access and can take time on the first run because FastF1 builds a cache.

## 11. Troubleshooting

### The page is unstyled or charts do not render

Make sure you are running from:

```text
final_deliverable/code_and_data/project_site
```

Then open:

```text
http://localhost:4173/index.html
```

Also confirm that internet access is available for the D3 and Scrollama CDN scripts.

### Python command is not found

Install Python 3.12 or use another local static server. For example, VS Code's Live Server extension can serve the folder.

### FastF1 rebuild fails

Check internet access, then rerun:

```powershell
pip install -r requirements.txt
python scripts\build_alpha_release_data.py
```

FastF1 may take several minutes on the first run because it downloads and caches session data.

### Report does not compile locally

Use the included `Final_Project_Report.pdf` for submission. If rebuilding is required, install MiKTeX or use Overleaf and upload `report.tex`, `references.bib`, and the `figures/` folder.
