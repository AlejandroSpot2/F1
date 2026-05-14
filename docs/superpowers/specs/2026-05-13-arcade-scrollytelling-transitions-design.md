# Arcade Scrollytelling Transitions Design

## Goal

Add fullscreen arcade-style transition moments to the existing F1 visualization site without rebuilding the D3 charts or turning the project into a complex animation system.

## Approved Direction

Use the "Arcade Transitions" direction: short fullscreen chapter breaks between chart sections, with an F1/kart-inspired visual motif moving across the screen as the reader scrolls. The transition should feel like a race game interstitial, not a side-by-side sticky chart article.

## Scope

- Keep the existing hero, data, chart renderers, legends, and tooltips.
- Add lightweight fullscreen transition sections between the major chart chapters.
- Use generated raster artwork as a decorative asset in those transition scenes.
- Use CSS scroll-linked behavior and class-based animation first; avoid PixiJS unless later animation needs justify it.
- Add a methodology section near the end explaining FastF1, the derived metrics, D3.js, and the site structure.
- Add a dark, high-contrast footer with an F1-car silhouette/outline mood.

## Interaction Model

The page remains a normal scrolling document. Each transition section fills most or all of the viewport, then the next chart section appears below it. The transition sections should work even if JavaScript animation setup fails, because the chart content remains directly in the document.

## Implementation Notes

- Use CSS for the visual motion: animated road lines, a moving generated sprite, and small pixel-style accents.
- Add Scrollama only if the implementation needs step enter/progress hooks; otherwise keep the first pass simpler with CSS `position: sticky`, scroll-driven layout, and viewport-relative sections.
- Respect reduced-motion preferences by disabling continuous sprite movement and keeping static transition art.
- Keep the existing light parchment chart theme for chart readability, then use darker arcade sections as punctuation between chart chapters.

## Verification

- Verify the page loads at `http://localhost:4173/index.html`.
- Check that every chart still renders.
- Check that transition sections appear between chart chapters.
- Check that methodology and footer appear at the end.
- Check browser console for errors.
