# GitHub Pages Deployment Design

## Goal

Publish the current static F1 project site to GitHub Pages at `https://alejandrospot2.github.io/F1/`.

## Approach

Create a new public GitHub repository named `alejandrospot2/F1`, push the local static site, and serve the repository root from the `main` branch using GitHub Pages. This matches the existing `README.md` and `index.html` links and requires no build pipeline because the project already has `index.html` at the root with relative asset paths.

## Alternatives Considered

- Use a `gh-pages` branch: useful for generated builds, but unnecessary for this static root site.
- Use GitHub Actions: useful when a build step exists, but this repository has no package manager or framework build.
- Serve from `main` branch root: simplest option and the recommended deployment path for this project.

## Verification

After deployment, confirm that GitHub Pages reports `https://alejandrospot2.github.io/F1/` and that the live page loads styles, D3, and the generated data bundle.
