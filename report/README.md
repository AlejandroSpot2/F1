# IEEE LaTeX Report Draft

Main source: `report.tex`

Bibliography: `references.bib`

Figures: `figures/`

## Build Notes

The source is written for the IEEE conference template:

```latex
\documentclass[conference]{IEEEtran}
```

If local MiKTeX is fully initialized, build from this folder with:

```powershell
pdflatex -interaction=nonstopmode report.tex
bibtex report
pdflatex -interaction=nonstopmode report.tex
pdflatex -interaction=nonstopmode report.tex
```

If local MiKTeX is not initialized, upload `report.tex`, `references.bib`, and the `figures/` folder to Overleaf using the IEEE conference template setup. Set the main file to `report.tex`.

## Current Verification

- 14 bibliography entries are cited from the paper.
- Every citation key used in `report.tex` exists in `references.bib`.
- Every figure referenced by `report.tex` exists in `figures/`.
