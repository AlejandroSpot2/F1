import fs from "node:fs/promises";
import path from "node:path";

const {
  Presentation,
  PresentationFile,
  row,
  column,
  grid,
  layers,
  panel,
  text,
  image,
  shape,
  rule,
  fill,
  hug,
  fixed,
  fr,
  auto,
} = await import(
  "file:///C:/Users/alejo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs"
);

const SLIDE_W = 1920;
const SLIDE_H = 1080;
const slideCount = 11;

const paths = {
  outputDeck: path.resolve("output/output.pptx"),
  renderDir: path.resolve("presentation/rendered"),
  pixelHero: "presentation/assets/pixel-f1-hero.png",
  finalHero: "presentation/assets/f1-final-hero.png",
  finalPace: "presentation/assets/f1-final-pace.png",
  finalPosition: "presentation/assets/f1-final-position.png",
  finalScorecard: "presentation/assets/f1-final-scorecard.png",
  arcadeExperiment: "presentation/assets/f1-arcade-experiment.png",
};

async function pngDataUrl(assetPath) {
  const bytes = await fs.readFile(assetPath);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

const assets = {
  pixelHero: await pngDataUrl(paths.pixelHero),
  finalHero: await pngDataUrl(paths.finalHero),
  finalPace: await pngDataUrl(paths.finalPace),
  finalPosition: await pngDataUrl(paths.finalPosition),
  finalScorecard: await pngDataUrl(paths.finalScorecard),
  arcadeExperiment: await pngDataUrl(paths.arcadeExperiment),
};

const C = {
  bg: "#070B18",
  bg2: "#0C1228",
  panel: "#121A35",
  panel2: "#1A2448",
  ink: "#FFF7D0",
  muted: "#B8C7D9",
  yellow: "#FFD54A",
  orange: "#FF8A2A",
  red: "#EF3F4D",
  green: "#38D37A",
  teal: "#1DD7C2",
  blue: "#4AA3FF",
  purple: "#B879FF",
  cream: "#FFEBC2",
  blackAlpha: "#02040CAA",
  whiteAlpha: "#FFFFFF18",
};

const titleStyle = { fontSize: 58, bold: true, color: C.ink };
const subtitleStyle = { fontSize: 27, color: C.muted };
const bodyStyle = { fontSize: 29, color: C.ink };
const smallStyle = { fontSize: 18, color: C.muted };
const labelStyle = { fontSize: 20, bold: true, color: C.yellow };

const presentation = Presentation.create({
  slideSize: { width: SLIDE_W, height: SLIDE_H },
});

function root(children) {
  return layers(
    { name: "slide-root", width: fill, height: fill },
    [
      shape({ name: "background", width: fill, height: fill, fill: C.bg }),
      grid(
        {
          name: "pixel-grid-background",
          width: fill,
          height: fill,
          columns: [fr(1), fr(1), fr(1), fr(1), fr(1), fr(1), fr(1), fr(1)],
          rows: [fr(1), fr(1), fr(1), fr(1), fr(1)],
          columnGap: 10,
          rowGap: 10,
          padding: 0,
        },
        Array.from({ length: 40 }, (_, i) =>
          shape({
            name: `bg-pixel-${i}`,
            width: fill,
            height: fill,
            fill: i % 7 === 0 ? "#15204A" : i % 11 === 0 ? "#111A38" : "#070B1800",
          }),
        ),
      ),
      ...children,
    ],
  );
}

function add(slideNode) {
  const slide = presentation.slides.add();
  slide.compose(slideNode, {
    frame: { left: 0, top: 0, width: SLIDE_W, height: SLIDE_H },
    baseUnit: 8,
  });
  return slide;
}

function strip(name, colors = [C.red, C.yellow, C.green, C.blue, C.purple]) {
  return row(
    { name, width: hug, height: fixed(24), gap: 0 },
    colors.flatMap((color, index) => [
      shape({ name: `${name}-pixel-${index}`, width: fixed(34), height: fixed(24), fill: color }),
      shape({ name: `${name}-gap-${index}`, width: fixed(8), height: fixed(24), fill: "#070B1800" }),
    ]),
  );
}

function lapBadge(current) {
  return panel(
    {
      name: `lap-${current}`,
      width: fixed(220),
      height: fixed(54),
      padding: { x: 18, y: 11 },
      fill: C.panel2,
    },
    row(
      { name: `lap-row-${current}`, width: fill, height: fill, gap: 10, align: "center" },
      [
        shape({ name: `lap-light-${current}`, width: fixed(18), height: fixed(18), fill: C.green }),
        text(`LAP ${String(current).padStart(2, "0")}/${slideCount}`, {
          name: `lap-text-${current}`,
          width: fill,
          height: hug,
          style: { fontSize: 20, bold: true, color: C.ink },
        }),
      ],
    ),
  );
}

function slideShell(number, title, subtitle, bodyChildren) {
  return root([
    column(
      {
        name: "content",
        width: fill,
        height: fill,
        padding: { x: 80, y: 56 },
        gap: 28,
      },
      [
        row(
          { name: "header", width: fill, height: hug, justify: "between", align: "center", gap: 24 },
          [
            column({ name: "title-block", width: fill, height: hug, gap: 10 }, [
              text(title, { name: "slide-title", width: fill, height: hug, style: titleStyle }),
              subtitle
                ? text(subtitle, {
                    name: "slide-subtitle",
                    width: fill,
                    height: hug,
                    style: subtitleStyle,
                  })
                : strip("title-strip"),
            ]),
            lapBadge(number),
          ],
        ),
        rule({ name: "header-rule", width: fill, stroke: C.yellow, weight: 4, opacity: 0.95 }),
        ...bodyChildren,
      ],
    ),
  ]);
}

function bullet(textValue, color = C.yellow, name = "bullet") {
  return row(
    { name, width: fill, height: hug, gap: 18, align: "center" },
    [
      shape({ name: `${name}-mark`, width: fixed(22), height: fixed(22), fill: color }),
      text(textValue, {
        name: `${name}-text`,
        width: fill,
        height: hug,
        style: bodyStyle,
      }),
    ],
  );
}

function bulletList(items, name = "bullets") {
  return column(
    { name, width: fill, height: hug, gap: 20 },
    items.map((item, i) =>
      bullet(typeof item === "string" ? item : item.text, typeof item === "string" ? C.yellow : item.color, `${name}-${i}`),
    ),
  );
}

function statTile(label, value, color, detail) {
  return panel(
    { name: `tile-${label}`, width: fill, height: fill, padding: { x: 26, y: 24 }, fill: C.panel },
    column({ name: `tile-stack-${label}`, width: fill, height: fill, gap: 14 }, [
      row({ name: `tile-label-row-${label}`, width: fill, height: hug, gap: 12, align: "center" }, [
        shape({ name: `tile-pixel-${label}`, width: fixed(20), height: fixed(20), fill: color }),
        text(label, { name: `tile-label-${label}`, width: fill, height: hug, style: labelStyle }),
      ]),
      text(value, { name: `tile-value-${label}`, width: fill, height: hug, style: { fontSize: 34, bold: true, color: C.ink } }),
      text(detail, { name: `tile-detail-${label}`, width: fill, height: hug, style: { fontSize: 22, color: C.muted } }),
    ]),
  );
}

function imagePanel(name, imageDataUrl, caption, height = 500) {
  return panel(
    { name, width: fill, height: fill, padding: 18, fill: C.panel },
    column({ name: `${name}-stack`, width: fill, height: fill, gap: 14 }, [
      image({
        name: `${name}-image`,
        dataUrl: imageDataUrl,
        width: fill,
        height: fixed(height),
        fit: "contain",
        alt: caption,
      }),
      text(caption, {
        name: `${name}-caption`,
        width: fill,
        height: hug,
        style: { fontSize: 20, color: C.muted },
      }),
    ]),
  );
}

function miniMeter(name, label, amount, color) {
  return column({ name, width: fill, height: hug, gap: 8 }, [
    row({ name: `${name}-label-row`, width: fill, height: hug, justify: "between" }, [
      text(label, { name: `${name}-label`, width: fill, height: hug, style: { fontSize: 22, bold: true, color: C.ink } }),
      text(`${amount}/10`, { name: `${name}-value`, width: hug, height: hug, style: { fontSize: 22, bold: true, color } }),
    ]),
    row(
      { name: `${name}-blocks`, width: fill, height: fixed(26), gap: 8 },
      Array.from({ length: 10 }, (_, i) =>
        shape({ name: `${name}-block-${i}`, width: fill, height: fill, fill: i < amount ? color : "#253050" }),
      ),
    ),
  ]);
}

add(
  layers(
    { name: "cover-root", width: fill, height: fill },
    [
      image({ name: "cover-art", dataUrl: assets.pixelHero, width: fill, height: fill, fit: "cover", alt: "Pixel art F1 racing background" }),
      shape({ name: "cover-overlay", width: fill, height: fill, fill: "#02040C66" }),
      grid(
        {
          name: "cover-layout",
          width: fill,
          height: fill,
          columns: [fr(1.05), fr(0.95)],
          rows: [fr(1), auto],
          padding: { x: 92, y: 72 },
          columnGap: 52,
          rowGap: 36,
        },
        [
          column({ name: "cover-left", width: fill, height: fill, gap: 26 }, [
            strip("cover-strip", [C.red, C.orange, C.yellow, C.green, C.blue]),
            text("FINAL PROJECT PRESENTATION", {
              name: "cover-kicker",
              width: fill,
              height: hug,
              style: { fontSize: 24, bold: true, color: C.yellow },
            }),
          ]),
          column({ name: "cover-title-stack", width: fill, height: fill, justify: "center", gap: 28 }, [
            text("FROM DRS TO", {
              name: "cover-title-1",
              width: fill,
              height: hug,
              style: { fontSize: 78, bold: true, color: C.ink },
            }),
            text("MARIO MUSHROOMS", {
              name: "cover-title-2",
              width: fill,
              height: hug,
              style: { fontSize: 86, bold: true, color: C.yellow },
            }),
            rule({ name: "cover-rule", width: fixed(640), stroke: C.red, weight: 8 }),
            text("A Formula 1 data visualization story about pace, passing pressure, and race disruption across 2025 and 2026.", {
              name: "cover-subtitle",
              width: fill,
              height: hug,
              style: { fontSize: 28, color: C.cream },
            }),
          ]),
          text("Alejandro Gonzalez", {
            name: "cover-name",
            width: fill,
            height: hug,
            columnSpan: 2,
            style: { fontSize: 24, bold: true, color: C.ink },
          }),
        ],
      ),
    ],
  ),
);

add(
  slideShell(2, "Project Goal", "What the site is trying to answer", [
    grid(
      { name: "goal-grid", width: fill, height: fill, columns: [fr(1.2), fr(0.8)], columnGap: 42 },
      [
        panel(
          { name: "goal-panel", width: fill, height: fill, padding: { x: 44, y: 38 }, fill: C.panel },
          column({ name: "goal-copy", width: fill, height: fill, gap: 26 }, [
            text("Compare Formula 1's opening 2025 and 2026 races to see whether the 2026 regulation era is already visible in the data.", {
              name: "goal-main",
              width: fill,
              height: hug,
              style: { fontSize: 44, bold: true, color: C.ink },
            }),
            bulletList(
              [
                { text: "Pace and top-speed patterns", color: C.blue },
                { text: "Lap-by-lap race movement", color: C.green },
                { text: "Incidents, DNFs, safety cars, and VSCs", color: C.red },
                { text: "Circuit differences across Australia, China, Japan, and Miami", color: C.yellow },
              ],
              "goal-bullets",
            ),
          ]),
        ),
        panel(
          { name: "drs-panel", width: fill, height: fill, padding: { x: 34, y: 34 }, fill: "#201638" },
          column({ name: "drs-stack", width: fill, height: fill, gap: 24 }, [
            text("DRS = an F1 speed-boost zone.", {
              name: "drs-definition",
              width: fill,
              height: hug,
              style: { fontSize: 34, bold: true, color: C.yellow },
            }),
            text("The mushroom metaphor helped frame technical race data as a set of power-ups, penalties, and level-by-level comparisons.", {
              name: "metaphor-copy",
              width: fill,
              height: hug,
              style: { fontSize: 28, color: C.cream },
            }),
            strip("drs-strip", [C.purple, C.blue, C.green, C.yellow, C.red]),
            text("Final scope update: Miami was added after the 2026 Miami GP.", {
              name: "scope-update",
              width: fill,
              height: hug,
              style: { fontSize: 24, bold: true, color: C.teal },
            }),
          ]),
        ),
      ],
    ),
  ]),
);

add(
  slideShell(3, "Project Objectives", "Pulled from the proposal, updated for the final site", [
    grid(
      {
        name: "objectives-grid",
        width: fill,
        height: fill,
        columns: [fr(1), fr(1)],
        rows: [fr(1), fr(1)],
        columnGap: 26,
        rowGap: 26,
      },
      [
        statTile("OBJ 1", "Measure pace and top-speed change", C.blue, "Compare same-circuit 2025 vs 2026 lap-time and speed-trap summaries."),
        statTile("OBJ 2", "Evaluate race dynamics", C.green, "Use lap-by-lap positions and position-change proxy as passing-pressure evidence."),
        statTile("OBJ 3", "Compare race disruption", C.red, "Track DNFs, incidents, safety cars, and virtual safety cars by race lap."),
        statTile("OBJ 4", "Show circuit variation", C.yellow, "Prevent one-race overgeneralization with a circuit-level scorecard."),
      ],
    ),
  ]),
);

add(
  slideShell(4, "Demo Link", "What to share on EdStem before presenting", [
    grid({ name: "demo-grid", width: fill, height: fill, columns: [fr(0.78), fr(1.22)], columnGap: 38 }, [
      panel(
        { name: "link-panel", width: fill, height: fill, padding: { x: 38, y: 38 }, fill: C.panel },
        column({ name: "link-stack", width: fill, height: fill, gap: 28 }, [
          text("Website", { name: "website-label", width: fill, height: hug, style: labelStyle }),
          text("https://alejandrospot2.github.io/F1/", {
            name: "website-url",
            width: fill,
            height: hug,
            style: { fontSize: 32, bold: true, color: C.yellow },
          }),
          rule({ name: "demo-rule", width: fill, stroke: C.blue, weight: 5 }),
          bulletList(
            [
              { text: "Post this link before the live walkthrough.", color: C.green },
              { text: "Use the live site for interaction, hover tooltips, and chart transitions.", color: C.blue },
              { text: "Slides explain why each chart exists.", color: C.orange },
            ],
            "demo-bullets",
          ),
        ]),
      ),
      imagePanel("demo-screenshot", assets.finalHero, "Final site hero and navigation.", 600),
    ]),
  ]),
);

const mappingRows = [
  ["Circuit comparison bars", "Objective 1", "Pace and speed deltas"],
  ["Lap-by-lap position charts", "Objective 2", "Race order changes over time"],
  ["Position-change slope graph", "Objective 2", "Movement proxy for overtaking intensity"],
  ["Incident timeline heatmap", "Objective 3", "DNFs, safety cars, VSCs, yellow flags"],
  ["Final circuit scorecard", "Objective 4", "Cross-circuit synthesis"],
];

add(
  slideShell(5, "Demo and Results", "How each visualization maps back to an objective", [
    grid({ name: "results-grid", width: fill, height: fill, columns: [fr(1.08), fr(0.92)], columnGap: 34 }, [
      column(
        { name: "mapping-table", width: fill, height: fill, gap: 12 },
        [
          row({ name: "mapping-header", width: fill, height: fixed(54), gap: 12 }, [
            text("VISUALIZATION", { name: "map-h1", width: fill, height: fill, style: labelStyle }),
            text("OBJECTIVE", { name: "map-h2", width: fixed(220), height: fill, style: labelStyle }),
            text("RESULT ROLE", { name: "map-h3", width: fill, height: fill, style: labelStyle }),
          ]),
          ...mappingRows.map((cells, index) =>
            panel(
              { name: `mapping-row-${index}`, width: fill, height: fixed(104), padding: { x: 18, y: 18 }, fill: index % 2 ? "#101A36" : C.panel },
              row({ name: `mapping-row-stack-${index}`, width: fill, height: fill, gap: 14, align: "center" }, [
                text(cells[0], { name: `map-viz-${index}`, width: fill, height: hug, style: { fontSize: 25, bold: true, color: C.ink } }),
                text(cells[1], { name: `map-obj-${index}`, width: fixed(220), height: hug, style: { fontSize: 25, bold: true, color: [C.blue, C.green, C.green, C.red, C.yellow][index] } }),
                text(cells[2], { name: `map-role-${index}`, width: fill, height: hug, style: { fontSize: 22, color: C.muted } }),
              ]),
            ),
          ),
        ],
      ),
      column({ name: "result-images", width: fill, height: fill, gap: 18 }, [
        imagePanel("pace-shot", assets.finalPace, "Horizontal comparison bars plus first position charts.", 300),
        imagePanel("scorecard-shot", assets.finalScorecard, "Final scorecard with color legend.", 300),
      ]),
    ]),
  ]),
);

add(
  slideShell(6, "Measuring Success", "The score was objective completion, not a single vanity metric", [
    grid(
      {
        name: "success-grid",
        width: fill,
        height: fill,
        columns: [fr(1), fr(1), fr(1), fr(1)],
        columnGap: 22,
      },
      [
        statTile("DATA", "8 race payloads", C.blue, "2025 and 2026 Australia, China, Japan, and Miami from FastF1-derived files."),
        statTile("CHARTS", "5 must-have views", C.green, "Every required visualization has a clear objective mapping."),
        statTile("READABILITY", "Lower F1 barrier", C.yellow, "Short chart descriptions, legends, tooltips, labels, and d3 number formatting."),
        statTile("STABILITY", "Verified demo path", C.red, "Browser checks and a public GitHub Pages target for the live walkthrough."),
      ],
    ),
  ]),
);

add(
  slideShell(7, "New Updates Since Beta", "Feedback incorporated into the final release", [
    grid({ name: "updates-grid", width: fill, height: fill, columns: [fr(1), fr(1)], columnGap: 38 }, [
      bulletList(
        [
          { text: "Added simple color legends and hover tooltips across the visualizations.", color: C.yellow },
          { text: "Changed the first comparison bars to horizontal bars for easier scanning.", color: C.green },
          { text: "Replaced the position-change bar chart with a slope graph.", color: C.blue },
          { text: "Fixed low-contrast Mercedes line colors.", color: C.purple },
        ],
        "updates-left",
      ),
      bulletList(
        [
          { text: "Fixed incident and neutralization status colors so everything is not a yellow flag.", color: C.red },
          { text: "Added the final chart color legend.", color: C.yellow },
          { text: "Used d3 formatting to reduce distracting decimals.", color: C.green },
          { text: "Added newcomer-friendly descriptions before each chart, plus 2025/2026 Miami data.", color: C.blue },
        ],
        "updates-right",
      ),
    ]),
  ]),
);

add(
  slideShell(8, "Approaches Tried", "What worked, and what created too much complexity", [
    grid({ name: "approaches-grid", width: fill, height: fill, columns: [fr(1), fr(1)], rows: [fr(1), auto], columnGap: 26, rowGap: 20 }, [
      imagePanel("arcade-shot", assets.arcadeExperiment, "Animation-heavy arcade/scrollytelling experiment.", 500),
      imagePanel("final-shot", assets.finalPosition, "Final guided D3 layout: less flashy, more dependable.", 500),
      panel(
        { name: "approach-note", width: fill, height: hug, columnSpan: 2, padding: { x: 28, y: 22 }, fill: "#241832" },
        text("The arcade branch had stronger motion and personality, but it added a new layer of frontend complexity. For a data visualization class, the final version keeps the style while protecting chart readability and demo stability.", {
          name: "approach-note-copy",
          width: fill,
          height: hug,
          style: { fontSize: 27, color: C.cream },
        }),
      ),
    ]),
  ]),
);

add(
  slideShell(9, "Discussion", "Is the approach promising?", [
    grid({ name: "discussion-grid", width: fill, height: fill, columns: [fr(1.05), fr(0.95)], columnGap: 40 }, [
      panel(
        { name: "promising-panel", width: fill, height: fill, padding: { x: 42, y: 38 }, fill: C.panel },
        column({ name: "promising-stack", width: fill, height: fill, gap: 24 }, [
          text("Yes. A guided comparison is promising because the question is not just 'who won?' but 'what changed?'", {
            name: "promising-claim",
            width: fill,
            height: hug,
            style: { fontSize: 42, bold: true, color: C.ink },
          }),
          bulletList(
            [
              { text: "Same circuits make the season comparison fairer.", color: C.green },
              { text: "Multiple chart types separate pace, movement, and disruption.", color: C.blue },
              { text: "The final scorecard prevents overclaiming from one race.", color: C.yellow },
            ],
            "discussion-bullets",
          ),
        ]),
      ),
      panel(
        { name: "variant-panel", width: fill, height: fill, padding: { x: 34, y: 34 }, fill: "#151932" },
        column({ name: "variant-stack", width: fill, height: fill, gap: 30 }, [
          text("Better variant later:", { name: "variant-title", width: fill, height: hug, style: { fontSize: 33, bold: true, color: C.yellow } }),
          text("A more scrollytelling-transition-focused version could work once the data pipeline and charts are fully stable.", {
            name: "variant-copy",
            width: fill,
            height: hug,
            style: { fontSize: 29, color: C.cream },
          }),
          miniMeter("clarity-meter", "Data clarity", 9, C.green),
          miniMeter("motion-meter", "Arcade motion", 5, C.orange),
          miniMeter("future-meter", "Future scrollytelling potential", 8, C.purple),
        ]),
      ),
    ]),
  ]),
);

add(
  slideShell(10, "Problems and Reflection", "What I would do differently starting again", [
    grid({ name: "reflection-grid", width: fill, height: fill, columns: [fr(1), fr(1)], columnGap: 36 }, [
      panel(
        { name: "problems-panel", width: fill, height: fill, padding: { x: 36, y: 34 }, fill: C.panel },
        column({ name: "problems-stack", width: fill, height: fill, gap: 24 }, [
          text("Problems I ran into", { name: "problems-title", width: fill, height: hug, style: { fontSize: 36, bold: true, color: C.red } }),
          bulletList(
            [
              { text: "FastF1 and race-control data needed extra validation.", color: C.red },
              { text: "Track-status colors initially collapsed too many incidents into yellow flags.", color: C.yellow },
              { text: "F1-specific terms made the site harder for non-fans.", color: C.blue },
              { text: "The animation-heavy version broke too much for the payoff.", color: C.purple },
            ],
            "problems-bullets",
          ),
        ]),
      ),
      panel(
        { name: "change-panel", width: fill, height: fill, padding: { x: 36, y: 34 }, fill: "#17233E" },
        column({ name: "change-stack", width: fill, height: fill, gap: 24 }, [
          text("Starting again, I would", { name: "change-title", width: fill, height: hug, style: { fontSize: 36, bold: true, color: C.green } }),
          bulletList(
            [
              { text: "Collect visual inspiration earlier to guide the layout.", color: C.green },
              { text: "Lock the visual language before polishing every chart.", color: C.yellow },
              { text: "Build validation checks for incidents, statuses, and missing race data sooner.", color: C.blue },
              { text: "Prototype motion separately before integrating it into the main site.", color: C.orange },
            ],
            "change-bullets",
          ),
        ]),
      ),
    ]),
  ]),
);

add(
  slideShell(11, "Future Work", "Features I would add with more time", [
    grid({ name: "future-grid", width: fill, height: fill, columns: [fr(1.08), fr(0.92)], columnGap: 36 }, [
      bulletList(
        [
          { text: "Scrollytelling transitions that move one chart through the race story.", color: C.purple },
          { text: "More F1 and retro-game visual references without hiding the data.", color: C.yellow },
          { text: "Lap replay controls for position changes and neutralization periods.", color: C.blue },
          { text: "Driver and team filters for deeper exploration.", color: C.green },
          { text: "More races, more seasons, and qualifying/sprint context.", color: C.orange },
          { text: "Mobile polish and accessibility checks for all tooltips and legends.", color: C.red },
        ],
        "future-list",
      ),
      panel(
        { name: "closing-panel", width: fill, height: fill, padding: { x: 36, y: 36 }, fill: "#201638" },
        column({ name: "closing-stack", width: fill, height: fill, gap: 28, justify: "center" }, [
          strip("closing-strip", [C.red, C.yellow, C.green, C.blue, C.purple]),
          text("Next version:", { name: "closing-label", width: fill, height: hug, style: labelStyle }),
          text("A race-story mode where the viewer scrolls from lights out to checkered flag.", {
            name: "closing-copy",
            width: fill,
            height: hug,
            style: { fontSize: 42, bold: true, color: C.ink },
          }),
          text("https://alejandrospot2.github.io/F1/", {
            name: "closing-url",
            width: fill,
            height: hug,
            style: { fontSize: 30, bold: true, color: C.yellow },
          }),
        ]),
      ),
    ]),
  ]),
);

await fs.mkdir(path.dirname(paths.outputDeck), { recursive: true });
await fs.mkdir(paths.renderDir, { recursive: true });

const deckBlob = await PresentationFile.exportPptx(presentation);
await deckBlob.save(paths.outputDeck);

for (const [index, slide] of presentation.slides.items.entries()) {
  const blob = await presentation.export({ slide, format: "png" });
  const buffer = Buffer.from(await blob.arrayBuffer());
  const filename = `slide-${String(index + 1).padStart(2, "0")}.png`;
  await fs.writeFile(path.join(paths.renderDir, filename), buffer);
}

console.log(`Wrote ${paths.outputDeck}`);
console.log(`Rendered ${presentation.slides.count} slides to ${paths.renderDir}`);
