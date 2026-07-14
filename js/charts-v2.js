(function () {
    "use strict";

    const DATA = window.ALPHA_RELEASE_DATA;
    const SEASONS = [2025, 2026];
    const SEASON_COLORS = { 2025: "#ff4a36", 2026: "#c7ff36" };
    const PAPER_SEASON_COLORS = { 2025: "#c82e22", 2026: "#4d6a05" };
    const TRACK_COLORS = {
        Green: "#d8ded2",
        Yellow: "#f0c83b",
        VSC: "#f39a32",
        "Safety Car": "#ff4a36",
        "Red Flag": "#9d1f2c"
    };
    const PACE_METRICS = {
        medianBestLapSec: {
            label: "Median driver-best green lap",
            shortLabel: "Median lap",
            lowerIsFaster: true,
            format: formatLap,
            delta: (value) => `${signed(value, 3)} s`
        },
        fastestLapSec: {
            label: "Fastest accurate green lap",
            shortLabel: "Fastest lap",
            lowerIsFaster: true,
            format: formatLap,
            delta: (value) => `${signed(value, 3)} s`
        },
        medianSpeedTrap: {
            label: "Median of driver maximum speed-trap readings",
            shortLabel: "Speed trap",
            lowerIsFaster: false,
            format: (value) => `${number(value, 1)} km/h`,
            delta: (value) => `${signed(value, 1)} km/h`
        }
    };

    const state = {
        initialized: false,
        paceMetric: "medianBestLapSec",
        paceLockedCircuit: null,
        circuit: null,
        lap: null,
        lockedDriver: null,
        hoveredDriver: null,
        timelineMode: "all",
        tooltip: null
    };

    function number(value, digits) {
        return Number(value).toLocaleString("en-US", {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
        });
    }

    function signed(value, digits) {
        const numeric = Number(value) || 0;
        const prefix = numeric > 0 ? "+" : numeric < 0 ? "−" : "±";
        return `${prefix}${number(Math.abs(numeric), digits)}`;
    }

    function formatLap(seconds) {
        const numeric = Number(seconds) || 0;
        const minutes = Math.floor(numeric / 60);
        return `${minutes}:${(numeric - minutes * 60).toFixed(3).padStart(6, "0")}`;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function circuits() {
        const seen = new Set();
        return DATA.races
            .map((race) => race.circuit)
            .filter((circuit) => {
                if (seen.has(circuit)) {
                    return false;
                }
                seen.add(circuit);
                return SEASONS.every((year) => DATA.races.some((race) => race.circuit === circuit && race.year === year));
            });
    }

    function raceFor(circuit, year) {
        return DATA.races.find((race) => race.circuit === circuit && race.year === year);
    }

    function derivedSummary() {
        if (DATA.summary) {
            return DATA.summary;
        }
        const pairedCircuits = circuits();
        const deltaFor = (key) => pairedCircuits.map((circuit) => (
            raceFor(circuit, 2026).metrics[key] - raceFor(circuit, 2025).metrics[key]
        ));
        const pace = deltaFor("medianBestLapSec");
        const movementKey = DATA.races[0].metrics.positionChangeRate == null ? "positionChangeProxy" : "positionChangeRate";
        const movement = deltaFor(movementKey);
        const total = (year, key) => pairedCircuits.reduce((sum, circuit) => sum + (raceFor(circuit, year).metrics[key] || 0), 0);
        return {
            circuitCount: pairedCircuits.length,
            raceCount: pairedCircuits.length * 2,
            circuits: pairedCircuits,
            pace: {
                slowerCircuits: pace.filter((value) => value > 0).length,
                meanDeltaSec: d3.mean(pace) || 0
            },
            movement: {
                lowerCircuits: movement.filter((value) => value < 0).length,
                meanDeltaPer100: d3.mean(movement) || 0
            },
            raceControl: {
                cautionLaps2025: total(2025, "cautionLapCount"),
                cautionLaps2026: total(2026, "cautionLapCount"),
                neutralizedLaps2025: total(2025, "neutralizedLapCount"),
                neutralizedLaps2026: total(2026, "neutralizedLapCount")
            }
        };
    }

    function populateSummary() {
        const summary = derivedSummary();
        const values = {
            circuitCount: summary.circuitCount,
            raceCount: summary.raceCount,
            circuits: (summary.circuits || circuits()).join(", ").replace(/, ([^,]*)$/, " and $1"),
            paceSlowerCircuits: summary.pace && summary.pace.slowerCircuits,
            paceMeanDeltaSec: summary.pace && signed(summary.pace.meanDeltaSec, 3),
            movementLowerCircuits: summary.movement && summary.movement.lowerCircuits,
            movementMeanDeltaPer100: summary.movement && signed(summary.movement.meanDeltaPer100, 2),
            cautionLaps2025: summary.raceControl && summary.raceControl.cautionLaps2025,
            cautionLaps2026: summary.raceControl && summary.raceControl.cautionLaps2026,
            neutralizedLaps2025: summary.raceControl && summary.raceControl.neutralizedLaps2025,
            neutralizedLaps2026: summary.raceControl && summary.raceControl.neutralizedLaps2026,
            neutralizedDelta: summary.raceControl && signed(
                summary.raceControl.neutralizedLaps2026 - summary.raceControl.neutralizedLaps2025,
                0
            ),
            fastf1Version: DATA.fastf1Version || "3.8.1",
            latestCircuit: (summary.circuits || circuits()).slice(-1)[0],
            generatedDate: DATA.generatedAt
                ? new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(new Date(DATA.generatedAt))
                : "release build"
        };

        Object.entries(values).forEach(([key, value]) => {
            if (value == null) {
                return;
            }
            document.querySelectorAll(`[data-summary="${key}"]`).forEach((element) => {
                element.textContent = String(value);
            });
        });
    }

    function ensureTooltip() {
        if (state.tooltip && state.tooltip.isConnected) {
            return state.tooltip;
        }
        state.tooltip = document.createElement("div");
        state.tooltip.className = "chart-tooltip";
        state.tooltip.setAttribute("role", "tooltip");
        state.tooltip.setAttribute("aria-hidden", "true");
        document.body.appendChild(state.tooltip);
        return state.tooltip;
    }

    function tooltipPosition(event) {
        const tooltip = ensureTooltip();
        let x;
        let y;
        if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY) && event.clientX + event.clientY > 0) {
            x = event.clientX + 14;
            y = event.clientY + 14;
        } else if (event && event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            x = rect.left + rect.width / 2 + 12;
            y = rect.top + rect.height / 2 + 12;
        } else {
            x = 20;
            y = 20;
        }
        const rect = tooltip.getBoundingClientRect();
        tooltip.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
        tooltip.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
    }

    function showTooltip(event, title, rows) {
        const tooltip = ensureTooltip();
        tooltip.innerHTML = `<strong>${escapeHtml(title)}</strong>${rows.map(([label, value]) => (
            `<span><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`
        )).join("")}`;
        tooltip.setAttribute("aria-hidden", "false");
        tooltip.style.opacity = "1";
        tooltipPosition(event);
    }

    function hideTooltip() {
        if (!state.tooltip) {
            return;
        }
        state.tooltip.setAttribute("aria-hidden", "true");
        state.tooltip.style.opacity = "0";
    }

    function ensurePatterns(svg) {
        let defs = svg.select("defs[data-patterns]");
        if (!defs.empty()) {
            return defs.attr("data-pattern-prefix");
        }
        const prefix = `${svg.attr("id") || "chart"}-pattern`;
        const paper = svg.node() && svg.node().closest(".chapter-paper");
        const colors = paper ? PAPER_SEASON_COLORS : SEASON_COLORS;
        defs = svg.append("defs")
            .attr("data-patterns", "true")
            .attr("data-pattern-prefix", prefix);

        const dot = defs.append("pattern")
            .attr("id", `${prefix}-2025-dots`)
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", 8)
            .attr("height", 8);
        dot.append("rect").attr("width", 8).attr("height", 8).attr("fill", colors[2025]);
        dot.append("circle").attr("cx", 2).attr("cy", 2).attr("r", 1.25).attr("fill", "#5f160f");
        dot.append("circle").attr("cx", 6).attr("cy", 6).attr("r", 1.25).attr("fill", "#5f160f");

        const hatch = defs.append("pattern")
            .attr("id", `${prefix}-2026-hatch`)
            .attr("patternUnits", "userSpaceOnUse")
            .attr("width", 8)
            .attr("height", 8)
            .attr("patternTransform", "rotate(45)");
        hatch.append("rect").attr("width", 8).attr("height", 8).attr("fill", colors[2026]);
        hatch.append("line").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 8).attr("stroke", "#566d13").attr("stroke-width", 2);
        return prefix;
    }

    function seasonFill(year, prefix) {
        return year === 2025 ? `url(#${prefix}-2025-dots)` : `url(#${prefix}-2026-hatch)`;
    }

    function appendDitherBridge(rows, oldX, newX, rowY) {
        const rowNode = rows.node();
        const paper = rowNode && rowNode.ownerSVGElement && rowNode.ownerSVGElement.closest(".chapter-paper");
        const colors = paper ? PAPER_SEASON_COLORS : SEASON_COLORS;
        rows.each(function (datum, rowIndex) {
            const start = oldX(datum);
            const end = newX(datum);
            const center = rowY(datum);
            const count = 72;
            const points = d3.range(count).map((pointIndex) => {
                const t = pointIndex / Math.max(1, count - 1);
                const wave = Math.sin((pointIndex + 1) * (rowIndex + 2) * 0.77);
                const lift = Math.cos((pointIndex + 3) * (rowIndex + 1) * 0.41);
                return {
                    x: start + (end - start) * t + wave * 2.8,
                    y: center + lift * (3 + (pointIndex % 4)),
                    season: t < 0.5 ? 2025 : 2026,
                    size: pointIndex % 9 === 0 ? 2.2 : 1.25,
                    opacity: 0.24 + ((pointIndex * 7 + rowIndex * 3) % 10) / 22
                };
            });
            d3.select(this).append("g")
                .attr("class", "dither-bridge")
                .attr("aria-hidden", "true")
                .selectAll("rect")
                .data(points)
                .join("rect")
                .attr("class", (point) => `dither-point season-${point.season}`)
                .attr("x", (point) => point.x)
                .attr("y", (point) => point.y)
                .attr("width", (point) => point.size)
                .attr("height", (point) => point.size)
                .attr("fill", (point) => colors[point.season])
                .attr("opacity", (point) => point.opacity);
        });
    }

    function clearAndSize(selector, width, height) {
        const svg = d3.select(selector);
        svg.selectAll("*").remove();
        svg.attr("viewBox", `0 0 ${width} ${height}`);
        return svg;
    }

    function replaceAccessibleTable(svgNode, className, caption, headers, rows) {
        const container = svgNode.parentElement;
        if (!container) {
            return;
        }
        container.querySelectorAll(`.${className}`).forEach((node) => node.remove());
        const table = document.createElement("table");
        table.className = `visually-hidden ${className}`;
        const captionNode = document.createElement("caption");
        captionNode.textContent = caption;
        table.appendChild(captionNode);
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        headers.forEach((header) => {
            const th = document.createElement("th");
            th.scope = "col";
            th.textContent = header;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        const tbody = document.createElement("tbody");
        rows.forEach((row) => {
            const tr = document.createElement("tr");
            row.forEach((value, index) => {
                const cell = document.createElement(index === 0 ? "th" : "td");
                if (index === 0) {
                    cell.scope = "row";
                }
                cell.textContent = String(value);
                tr.appendChild(cell);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
    }

    function initPace() {
        document.querySelectorAll("#pace-metric-tabs [data-metric]").forEach((button) => {
            button.addEventListener("click", () => {
                state.paceMetric = button.dataset.metric;
                state.paceLockedCircuit = null;
                hideTooltip();
                document.querySelectorAll("#pace-metric-tabs [data-metric]").forEach((candidate) => {
                    candidate.setAttribute("aria-pressed", String(candidate === button));
                });
                renderPace();
            });
        });
        document.addEventListener("pointerdown", (event) => {
            const target = event.target instanceof Element ? event.target : null;
            if (!state.paceLockedCircuit || (target && target.closest("#pace-delta-chart .pace-row"))) {
                return;
            }
            state.paceLockedCircuit = null;
            d3.selectAll("#pace-delta-chart .pace-row")
                .classed("mark-locked", false)
                .attr("aria-pressed", "false");
            hideTooltip();
        });
        renderPace();
    }

    function renderPace() {
        const metricKey = PACE_METRICS[state.paceMetric] ? state.paceMetric : "medianBestLapSec";
        const metric = PACE_METRICS[metricKey];
        const paired = circuits().map((circuit) => ({
            circuit,
            oldRace: raceFor(circuit, 2025),
            newRace: raceFor(circuit, 2026)
        }));
        const width = 860;
        const height = Math.max(360, paired.length * 64 + 112);
        const margin = { top: 30, right: 116, bottom: 50, left: 116 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const svg = clearAndSize("#pace-delta-chart", width, height);
        const patternPrefix = ensurePatterns(svg);
        const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        const values = paired.flatMap((pair) => [
            pair.oldRace.metrics[metricKey],
            pair.newRace.metrics[metricKey]
        ]);
        const extent = d3.extent(values);
        const pad = Math.max((extent[1] - extent[0]) * 0.16, metricKey.includes("Lap") ? 0.15 : 0.8);
        const x = d3.scaleLinear().domain([extent[0] - pad, extent[1] + pad]).range([0, innerWidth]);
        const y = d3.scaleBand().domain(paired.map((pair) => pair.circuit)).range([0, innerHeight]).padding(0.44);

        root.append("g")
            .selectAll("line")
            .data(x.ticks(5))
            .join("line")
            .attr("class", "grid-line")
            .attr("x1", (value) => x(value))
            .attr("x2", (value) => x(value))
            .attr("y1", 0)
            .attr("y2", innerHeight);

        const tooltipRows = (pair) => [
            ["2025", metric.format(pair.oldRace.metrics[metricKey])],
            ["2026", metric.format(pair.newRace.metrics[metricKey])],
            ["Change", metric.delta(pair.newRace.metrics[metricKey] - pair.oldRace.metrics[metricKey])]
        ];
        const showPairTooltip = (event, pair) => showTooltip(event, pair.circuit, tooltipRows(pair));
        const updateLockedMarks = () => {
            root.selectAll("g.pace-row")
                .classed("mark-locked", (pair) => state.paceLockedCircuit === pair.circuit)
                .attr("aria-pressed", (pair) => String(state.paceLockedCircuit === pair.circuit));
        };
        const togglePair = (event, pair) => {
            state.paceLockedCircuit = state.paceLockedCircuit === pair.circuit ? null : pair.circuit;
            updateLockedMarks();
            if (state.paceLockedCircuit) {
                showPairTooltip(event, pair);
            } else {
                hideTooltip();
            }
        };

        const rows = root.selectAll("g.pace-row")
            .data(paired)
            .join("g")
            .attr("class", "pace-row interactive-mark")
            .attr("tabindex", 0)
            .attr("role", "button")
            .attr("aria-pressed", (pair) => String(state.paceLockedCircuit === pair.circuit))
            .attr("aria-label", (pair) => `${pair.circuit}: 2025 ${metric.format(pair.oldRace.metrics[metricKey])}, 2026 ${metric.format(pair.newRace.metrics[metricKey])}, change ${metric.delta(pair.newRace.metrics[metricKey] - pair.oldRace.metrics[metricKey])}. Press to pin details.`)
            .on("mouseenter focus", function (event, pair) {
                showPairTooltip(event, pair);
            })
            .on("mousemove", tooltipPosition)
            .on("mouseleave blur", function (event, pair) {
                if (state.paceLockedCircuit !== pair.circuit) {
                    hideTooltip();
                }
            })
            .on("click", togglePair)
            .on("keydown", function (event, pair) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    togglePair(event, pair);
                } else if (event.key === "Escape") {
                    state.paceLockedCircuit = null;
                    updateLockedMarks();
                    hideTooltip();
                }
            });

        updateLockedMarks();

        rows.append("line")
            .attr("x1", (pair) => x(pair.oldRace.metrics[metricKey]))
            .attr("x2", (pair) => x(pair.newRace.metrics[metricKey]))
            .attr("y1", (pair) => y(pair.circuit) + y.bandwidth() / 2)
            .attr("y2", (pair) => y(pair.circuit) + y.bandwidth() / 2)
            .attr("stroke", "currentColor")
            .attr("stroke-opacity", 0.34)
            .attr("stroke-width", 2);

        appendDitherBridge(
            rows,
            (pair) => x(pair.oldRace.metrics[metricKey]),
            (pair) => x(pair.newRace.metrics[metricKey]),
            (pair) => y(pair.circuit) + y.bandwidth() / 2
        );

        rows.append("circle")
            .attr("class", "season-mark season-2025")
            .attr("cx", (pair) => x(pair.oldRace.metrics[metricKey]))
            .attr("cy", (pair) => y(pair.circuit) + y.bandwidth() / 2)
            .attr("r", 8)
            .attr("fill", seasonFill(2025, patternPrefix))
            .attr("stroke", "#11120f")
            .attr("stroke-width", 1.5);

        rows.append("rect")
            .attr("class", "season-mark season-2026")
            .attr("x", (pair) => x(pair.newRace.metrics[metricKey]) - 8)
            .attr("y", (pair) => y(pair.circuit) + y.bandwidth() / 2 - 8)
            .attr("width", 16)
            .attr("height", 16)
            .attr("fill", seasonFill(2026, patternPrefix))
            .attr("stroke", "#11120f")
            .attr("stroke-width", 1.5);

        rows.append("text")
            .attr("class", "chart-annotation")
            .attr("x", innerWidth + 12)
            .attr("y", (pair) => y(pair.circuit) + y.bandwidth() / 2)
            .attr("dy", ".35em")
            .text((pair) => metric.delta(pair.newRace.metrics[metricKey] - pair.oldRace.metrics[metricKey]));

        root.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0).tickPadding(12));
        root.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat((value) => metricKey.includes("Lap") ? number(value, 1) : number(value, 0)));

        const note = document.getElementById("pace-chart-note");
        if (note) {
            note.textContent = metricKey.includes("Lap")
                ? "Lower is faster. The delta is 2026 minus 2025; positive values mean the 2026 time was slower."
                : "Higher means more straight-line speed. This is the median of each driver's maximum clean-lap speed-trap reading.";
        }

        replaceAccessibleTable(
            svg.node(),
            "pace-accessible-table",
            `${metric.label} by circuit`,
            ["Circuit", "2025", "2026", "Change"],
            paired.map((pair) => [
                pair.circuit,
                metric.format(pair.oldRace.metrics[metricKey]),
                metric.format(pair.newRace.metrics[metricKey]),
                metric.delta(pair.newRace.metrics[metricKey] - pair.oldRace.metrics[metricKey])
            ])
        );
    }

    function initPosition() {
        const selector = document.getElementById("circuit-selector");
        if (!selector) {
            return;
        }
        selector.replaceChildren();
        const allCircuits = circuits();
        state.circuit = state.circuit || allCircuits[0];
        allCircuits.forEach((circuit) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "circuit-button";
            button.textContent = circuit;
            button.dataset.circuit = circuit;
            button.setAttribute("aria-pressed", String(circuit === state.circuit));
            button.addEventListener("click", () => {
                state.circuit = circuit;
                state.lockedDriver = null;
                selector.querySelectorAll("button").forEach((candidate) => {
                    candidate.setAttribute("aria-pressed", String(candidate === button));
                });
                configureScrubber(true);
                renderPosition();
            });
            selector.appendChild(button);
        });

        const scrubber = document.getElementById("position-lap-scrubber");
        if (scrubber) {
            scrubber.addEventListener("input", () => {
                state.lap = Number(scrubber.value);
                renderPosition();
            });
        }
        configureScrubber(true);
        renderPosition();
    }

    function configureScrubber(useFullRace) {
        const scrubber = document.getElementById("position-lap-scrubber");
        if (!scrubber || !state.circuit) {
            return;
        }
        const maxLap = d3.max(SEASONS.map((year) => raceFor(state.circuit, year).totalLaps));
        scrubber.max = String(maxLap);
        if (useFullRace || state.lap == null) {
            state.lap = maxLap;
        } else {
            state.lap = Math.min(state.lap, maxLap);
        }
        scrubber.value = String(state.lap);
    }

    function renderPosition() {
        if (!state.circuit) {
            return;
        }
        configureScrubber(false);
        const output = document.getElementById("position-lap-output");
        const scrubber = document.getElementById("position-lap-scrubber");
        if (output && scrubber) {
            const full = Number(scrubber.value) === Number(scrubber.max);
            output.value = full ? "Full race" : `Lap ${scrubber.value}`;
            output.textContent = output.value;
            scrubber.setAttribute("aria-valuetext", output.value);
        }
        renderPositionSeason(2025, "#position-2025");
        renderPositionSeason(2026, "#position-2026");
        applyDriverHighlight();
    }

    function renderPositionSeason(year, selector) {
        const race = raceFor(state.circuit, year);
        const domainMax = Math.max(20, d3.max(SEASONS.flatMap((season) => {
            const pairedRace = raceFor(state.circuit, season);
            return pairedRace.topFinishers.flatMap((driver) => driver.positions.map((point) => point.position));
        })) || 20);
        const width = 440;
        const height = 340;
        const margin = { top: 16, right: 42, bottom: 42, left: 42 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const svg = clearAndSize(selector, width, height);
        const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        const x = d3.scaleLinear().domain([1, race.totalLaps]).range([0, innerWidth]);
        const y = d3.scaleLinear().domain([domainMax, 1]).range([innerHeight, 0]);
        const line = d3.line()
            .curve(d3.curveStepAfter)
            .x((point) => x(point.lap))
            .y((point) => y(point.position));

        root.append("g")
            .selectAll("line")
            .data([1, 5, 10, 15, 20, domainMax].filter((value, index, values) => values.indexOf(value) === index))
            .join("line")
            .attr("class", "grid-line")
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", (value) => y(value))
            .attr("y2", (value) => y(value));

        race.topFinishers.forEach((driver) => {
            const points = driver.positions.filter((point) => point.lap <= state.lap);
            if (!points.length) {
                return;
            }
            const color = driver.color || "#555";
            const group = root.append("g")
                .attr("class", "driver-series interactive-mark")
                .attr("data-driver", driver.driver)
                .attr("tabindex", 0)
                .attr("role", "button")
                .attr("aria-pressed", String(state.lockedDriver === driver.driver))
                .attr("aria-label", `${driver.driver}, ${race.raceLabel}, position ${points[points.length - 1].position} at lap ${points[points.length - 1].lap}. Press to pin this driver.`)
                .on("mouseenter focus", function (event) {
                    state.hoveredDriver = driver.driver;
                    applyDriverHighlight();
                    const final = points[points.length - 1];
                    showTooltip(event, `${race.raceLabel} · ${driver.driver}`, [
                        ["Shown lap", final.lap],
                        ["Position", `P${final.position}`],
                        ["Finish", `P${driver.finalPosition}`]
                    ]);
                })
                .on("mousemove", tooltipPosition)
                .on("mouseleave blur", function () {
                    state.hoveredDriver = null;
                    applyDriverHighlight();
                    hideTooltip();
                })
                .on("click", function () {
                    state.lockedDriver = state.lockedDriver === driver.driver ? null : driver.driver;
                    renderPosition();
                })
                .on("keydown", function (event) {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        state.lockedDriver = state.lockedDriver === driver.driver ? null : driver.driver;
                        renderPosition();
                    } else if (event.key === "Escape") {
                        state.lockedDriver = null;
                        renderPosition();
                    }
                });

            group.append("path")
                .datum(points)
                .attr("fill", "none")
                .attr("stroke", color)
                .attr("stroke-width", 2.5)
                .attr("d", line);
            const final = points[points.length - 1];
            group.append("circle")
                .attr("cx", x(final.lap))
                .attr("cy", y(final.position))
                .attr("r", 4.5)
                .attr("fill", color)
                .attr("stroke", "#f2eee4")
                .attr("stroke-width", 1.2);
            group.append("text")
                .attr("class", "chart-annotation")
                .attr("x", Math.min(innerWidth + 5, x(final.lap) + 7))
                .attr("y", y(final.position))
                .attr("dy", ".35em")
                .attr("fill", color)
                .text(driver.driver);
        });

        root.append("g").attr("class", "axis").call(d3.axisLeft(y)
            .tickValues([1, 5, 10, 15, 20, domainMax].filter((value, index, values) => values.indexOf(value) === index))
            .tickFormat((value) => `P${value}`));
        root.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));

        const panel = svg.node().closest(".position-panel");
        if (panel) {
            let legend = panel.querySelector(".driver-legend");
            if (!legend) {
                legend = document.createElement("div");
                legend.className = "driver-legend";
                legend.setAttribute("aria-label", `${year} driver highlight`);
                panel.appendChild(legend);
            }
            legend.replaceChildren();
            race.topFinishers.forEach((driver) => {
                const button = document.createElement("button");
                button.type = "button";
                button.textContent = driver.driver;
                button.dataset.driver = driver.driver;
                button.setAttribute("aria-pressed", String(state.lockedDriver === driver.driver));
                button.style.borderLeft = `4px solid ${driver.color || "#555"}`;
                button.addEventListener("mouseenter", () => {
                    state.hoveredDriver = driver.driver;
                    applyDriverHighlight();
                });
                button.addEventListener("mouseleave", () => {
                    state.hoveredDriver = null;
                    applyDriverHighlight();
                });
                button.addEventListener("click", () => {
                    state.lockedDriver = state.lockedDriver === driver.driver ? null : driver.driver;
                    renderPosition();
                });
                legend.appendChild(button);
            });
        }

        replaceAccessibleTable(
            svg.node(),
            `position-accessible-${year}`,
            `${race.raceLabel} top-five running order at the selected lap`,
            ["Driver", "Grid", "Selected lap position", "Finish"],
            race.topFinishers.map((driver) => {
                const visible = driver.positions.filter((point) => point.lap <= state.lap);
                const last = visible[visible.length - 1];
                return [driver.driver, driver.gridPosition, last ? last.position : "No sample", driver.finalPosition];
            })
        );
    }

    function applyDriverHighlight() {
        const active = state.lockedDriver || state.hoveredDriver;
        document.querySelectorAll(".driver-series").forEach((series) => {
            series.classList.toggle("series-muted", Boolean(active && series.dataset.driver !== active));
            series.setAttribute("aria-pressed", String(state.lockedDriver === series.dataset.driver));
        });
        document.querySelectorAll(".driver-legend button").forEach((button) => {
            button.setAttribute("aria-pressed", String(state.lockedDriver === button.dataset.driver));
        });
    }

    function renderMovement() {
        const key = DATA.races.some((race) => race.metrics.positionChangeRate != null)
            ? "positionChangeRate"
            : "positionChangeProxy";
        const paired = circuits().map((circuit) => ({
            circuit,
            oldValue: raceFor(circuit, 2025).metrics[key],
            newValue: raceFor(circuit, 2026).metrics[key]
        }));
        const width = 860;
        const height = Math.max(360, paired.length * 62 + 100);
        const margin = { top: 24, right: 100, bottom: 46, left: 112 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const svg = clearAndSize("#movement-chart", width, height);
        const patternPrefix = ensurePatterns(svg);
        const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        const max = d3.max(paired.flatMap((pair) => [pair.oldValue, pair.newValue])) || 1;
        const x = d3.scaleLinear().domain([0, max * 1.12]).nice().range([0, innerWidth]);
        const y = d3.scaleBand().domain(paired.map((pair) => pair.circuit)).range([0, innerHeight]).padding(0.44);

        root.append("g").selectAll("line").data(x.ticks(5)).join("line")
            .attr("class", "grid-line")
            .attr("x1", (value) => x(value)).attr("x2", (value) => x(value))
            .attr("y1", 0).attr("y2", innerHeight);

        const rows = root.selectAll("g.movement-row").data(paired).join("g")
            .attr("class", "movement-row interactive-mark")
            .attr("tabindex", 0)
            .attr("role", "img")
            .attr("aria-label", (pair) => `${pair.circuit}: 2025 ${number(pair.oldValue, 2)}, 2026 ${number(pair.newValue, 2)}, change ${signed(pair.newValue - pair.oldValue, 2)}`)
            .on("mouseenter focus", function (event, pair) {
                showTooltip(event, pair.circuit, [
                    ["2025", number(pair.oldValue, 2)],
                    ["2026", number(pair.newValue, 2)],
                    ["Change", signed(pair.newValue - pair.oldValue, 2)]
                ]);
            })
            .on("mousemove", tooltipPosition)
            .on("mouseleave blur", hideTooltip);

        rows.append("line")
            .attr("x1", (pair) => x(pair.oldValue)).attr("x2", (pair) => x(pair.newValue))
            .attr("y1", (pair) => y(pair.circuit) + y.bandwidth() / 2)
            .attr("y2", (pair) => y(pair.circuit) + y.bandwidth() / 2)
            .attr("stroke", "currentColor").attr("stroke-opacity", 0.34).attr("stroke-width", 2);
        appendDitherBridge(
            rows,
            (pair) => x(pair.oldValue),
            (pair) => x(pair.newValue),
            (pair) => y(pair.circuit) + y.bandwidth() / 2
        );
        rows.append("circle")
            .attr("class", "season-mark season-2025")
            .attr("cx", (pair) => x(pair.oldValue)).attr("cy", (pair) => y(pair.circuit) + y.bandwidth() / 2)
            .attr("r", 8).attr("fill", seasonFill(2025, patternPrefix)).attr("stroke", "#11120f");
        rows.append("rect")
            .attr("class", "season-mark season-2026")
            .attr("x", (pair) => x(pair.newValue) - 8).attr("y", (pair) => y(pair.circuit) + y.bandwidth() / 2 - 8)
            .attr("width", 16).attr("height", 16).attr("fill", seasonFill(2026, patternPrefix)).attr("stroke", "#11120f");
        rows.append("text")
            .attr("class", "chart-annotation")
            .attr("x", innerWidth + 10).attr("y", (pair) => y(pair.circuit) + y.bandwidth() / 2).attr("dy", ".35em")
            .text((pair) => signed(pair.newValue - pair.oldValue, 2));
        root.append("g").attr("class", "axis").call(d3.axisLeft(y).tickSize(0).tickPadding(12));
        root.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(5));

        replaceAccessibleTable(
            svg.node(),
            "movement-accessible-table",
            key === "positionChangeRate" ? "Position movement per 100 consecutive driver-lap transitions" : "Raw position movement proxy",
            ["Circuit", "2025", "2026", "Change"],
            paired.map((pair) => [pair.circuit, number(pair.oldValue, 2), number(pair.newValue, 2), signed(pair.newValue - pair.oldValue, 2)])
        );
    }

    function renderTimelineLapTable(races) {
        const container = document.getElementById("timeline-lap-table");
        if (!container) {
            return;
        }

        const table = document.createElement("table");
        table.className = "lap-data-table";
        const caption = table.createCaption();
        caption.textContent = "Track status on the canonical leader-lap clock";

        const thead = table.createTHead();
        const header = thead.insertRow();
        ["Race", "Lap", "Track state"].forEach((label) => {
            const cell = document.createElement("th");
            cell.scope = "col";
            cell.textContent = label;
            header.appendChild(cell);
        });

        const tbody = table.createTBody();
        races.forEach((race) => {
            race.statusTimeline.forEach((lap) => {
                const row = tbody.insertRow();
                const raceCell = document.createElement("th");
                raceCell.scope = "row";
                raceCell.textContent = race.raceLabel;
                row.appendChild(raceCell);
                const lapCell = row.insertCell();
                lapCell.textContent = String(lap.lap);
                const stateCell = row.insertCell();
                stateCell.textContent = lap.state;
                stateCell.dataset.state = lap.state;
            });
        });

        container.replaceChildren(table);
    }

    function initTimeline() {
        document.querySelectorAll("#timeline-mode [data-timeline-mode]").forEach((button) => {
            button.addEventListener("click", () => {
                state.timelineMode = button.dataset.timelineMode;
                document.querySelectorAll("#timeline-mode [data-timeline-mode]").forEach((candidate) => {
                    candidate.setAttribute("aria-pressed", String(candidate === button));
                });
                renderTimeline();
            });
        });
        renderTimeline();
    }

    function renderTimeline() {
        const races = SEASONS.flatMap((year) => circuits().map((circuit) => raceFor(circuit, year))).filter(Boolean);
        const width = 1040;
        const height = Math.max(460, races.length * 36 + 132);
        const margin = { top: 72, right: 24, bottom: 44, left: 148 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const svg = clearAndSize("#timeline-chart", width, height);
        const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
        const maxLap = d3.max(races, (race) => race.totalLaps);
        const x = d3.scaleLinear().domain([1, maxLap + 1]).range([0, innerWidth]);
        const y = d3.scaleBand().domain(races.map((race) => race.raceKey)).range([0, innerHeight]).padding(0.16);
        const neutralized = new Set(["VSC", "Safety Car", "Red Flag"]);

        const legend = svg.append("g").attr("transform", `translate(${margin.left},24)`);
        let legendX = 0;
        Object.entries(TRACK_COLORS).forEach(([label, color]) => {
            const item = legend.append("g").attr("transform", `translate(${legendX},0)`);
            item.append("rect").attr("width", 16).attr("height", 10).attr("y", -8).attr("fill", color).attr("stroke", "#11120f").attr("stroke-width", 0.5);
            item.append("text").attr("class", "chart-label").attr("x", 22).text(label);
            legendX += label.length * 6.2 + 48;
        });

        root.selectAll("line.timeline-grid").data(x.ticks(7)).join("line")
            .attr("class", "grid-line")
            .attr("x1", (value) => x(value)).attr("x2", (value) => x(value))
            .attr("y1", 0).attr("y2", innerHeight);

        const row = root.selectAll("g.timeline-row").data(races).join("g")
            .attr("class", "timeline-row interactive-mark")
            .attr("transform", (race) => `translate(0,${y(race.raceKey)})`)
            .attr("tabindex", 0)
            .attr("role", "img")
            .attr("aria-label", (race) => `${race.raceLabel}: ${race.metrics.cautionLapCount || race.statusTimeline.filter((lap) => lap.state !== "Green").length} caution-affected laps and ${race.metrics.neutralizedLapCount} fully neutralized laps`)
            .on("mouseenter focus", function (event, race) {
                showTooltip(event, race.raceLabel, [
                    ["Caution laps", race.metrics.cautionLapCount || race.statusTimeline.filter((lap) => lap.state !== "Green").length],
                    ["Full neutralization", race.metrics.neutralizedLapCount]
                ]);
            })
            .on("mousemove", function (event, race) {
                const rect = this.getBoundingClientRect();
                const local = ((event.clientX - rect.left) / rect.width) * race.totalLaps;
                const lapNumber = Math.max(1, Math.min(race.totalLaps, Math.floor(local) + 1));
                const lap = race.statusTimeline.find((item) => item.lap === lapNumber);
                showTooltip(event, race.raceLabel, [
                    ["Lap", lapNumber],
                    ["Track state", lap ? lap.state : "No sample"]
                ]);
            })
            .on("mouseleave blur", hideTooltip);

        row.selectAll("rect.lap")
            .data((race) => race.statusTimeline.map((lap) => ({ race, lap })))
            .join("rect")
            .attr("class", "lap")
            .attr("x", (item) => x(item.lap.lap))
            .attr("y", 0)
            .attr("width", (item) => Math.max(1.25, x(item.lap.lap + 1) - x(item.lap.lap) + 0.3))
            .attr("height", y.bandwidth())
            .attr("fill", (item) => TRACK_COLORS[item.lap.state] || TRACK_COLORS.Green)
            .attr("opacity", (item) => state.timelineMode === "neutralized" && !neutralized.has(item.lap.state) ? 0.1 : 1);

        root.append("g").attr("class", "axis").call(d3.axisLeft(y).tickFormat((key) => races.find((race) => race.raceKey === key).raceLabel).tickSize(0).tickPadding(10));
        root.append("g").attr("class", "axis").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).ticks(7).tickFormat(d3.format("d")));

        const summary = derivedSummary();
        const note = document.getElementById("timeline-summary");
        if (note) {
            note.textContent = state.timelineMode === "neutralized"
                ? `Full neutralization only: ${summary.raceControl.neutralizedLaps2025} laps in 2025 and ${summary.raceControl.neutralizedLaps2026} in 2026. Local-yellow-only laps are faded.`
                : `All caution states: ${summary.raceControl.cautionLaps2025} affected laps in 2025 and ${summary.raceControl.cautionLaps2026} in 2026. Local yellow does not mean the whole field was neutralized.`;
        }

        replaceAccessibleTable(
            svg.node(),
            "timeline-accessible-table",
            "Race-control lap totals by race",
            ["Race", "Caution affected", "Full neutralization", "Total laps"],
            races.map((race) => [
                race.raceLabel,
                race.metrics.cautionLapCount || race.statusTimeline.filter((lap) => lap.state !== "Green").length,
                race.metrics.neutralizedLapCount,
                race.totalLaps
            ])
        );
        renderTimelineLapTable(races);
    }

    function metricValue(key, value) {
        if (key === "medianBestLapSec" || key === "fastestLapSec") {
            return formatLap(value);
        }
        if (key === "medianSpeedTrap") {
            return `${number(value, 1)} km/h`;
        }
        if (key === "positionChangeRate") {
            return number(value, 2);
        }
        return number(value, Number.isInteger(Number(value)) ? 0 : 1);
    }

    function metricDelta(key, value) {
        if (key === "medianBestLapSec" || key === "fastestLapSec") {
            return `${signed(value, 3)}s`;
        }
        if (key === "medianSpeedTrap") {
            return `${signed(value, 1)} km/h`;
        }
        if (key === "positionChangeRate") {
            return signed(value, 2);
        }
        return signed(value, Number.isInteger(Number(value)) ? 0 : 1);
    }

    function renderScorecard() {
        const host = document.getElementById("scorecard-table");
        if (!host || !DATA.scorecard) {
            return;
        }
        const metricOrder = [];
        const metricLabels = new Map();
        DATA.scorecard.forEach((row) => {
            if (!metricOrder.includes(row.metricKey)) {
                metricOrder.push(row.metricKey);
                metricLabels.set(row.metricKey, row.metricLabel);
            }
        });
        const byCircuit = new Map(circuits().map((circuit) => [circuit, new Map()]));
        DATA.scorecard.forEach((row) => {
            if (byCircuit.has(row.circuit)) {
                byCircuit.get(row.circuit).set(row.metricKey, row);
            }
        });

        const table = document.createElement("table");
        table.className = "scorecard";
        const caption = document.createElement("caption");
        caption.className = "visually-hidden";
        caption.textContent = "Exact 2025 to 2026 changes for each circuit and metric";
        table.appendChild(caption);
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        ["Circuit", ...metricOrder.map((key) => metricLabels.get(key))].forEach((label) => {
            const th = document.createElement("th");
            th.scope = "col";
            th.textContent = label;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        const tbody = document.createElement("tbody");
        byCircuit.forEach((metrics, circuit) => {
            const tr = document.createElement("tr");
            const circuitCell = document.createElement("th");
            circuitCell.scope = "row";
            circuitCell.textContent = circuit;
            tr.appendChild(circuitCell);
            metricOrder.forEach((key) => {
                const row = metrics.get(key);
                const td = document.createElement("td");
                if (!row) {
                    td.textContent = "—";
                } else {
                    td.className = row.delta > 0 ? "delta-up" : row.delta < 0 ? "delta-down" : "delta-flat";
                    td.title = `${metricLabels.get(key)}: ${metricValue(key, row.season2025)} in 2025 to ${metricValue(key, row.season2026)} in 2026`;
                    const values = document.createElement("span");
                    values.textContent = `${metricValue(key, row.season2025)} → ${metricValue(key, row.season2026)}`;
                    const change = document.createElement("strong");
                    change.style.display = "block";
                    change.style.marginTop = "4px";
                    change.textContent = metricDelta(key, row.delta);
                    td.append(values, change);
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        host.replaceChildren(table);
    }

    function init() {
        if (state.initialized) {
            return true;
        }
        if (!DATA || !Array.isArray(DATA.races) || !DATA.races.length || typeof window.d3 === "undefined") {
            return false;
        }
        state.initialized = true;
        ensureTooltip();
        populateSummary();
        initPace();
        initPosition();
        renderMovement();
        initTimeline();
        renderScorecard();
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                state.lockedDriver = null;
                hideTooltip();
                applyDriverHighlight();
            }
        });
        if (window.F1Course && typeof window.F1Course.rebuild === "function") {
            window.requestAnimationFrame(() => window.F1Course.rebuild());
        }
        return true;
    }

    window.F1Charts = { init, renderPace, renderPosition, renderTimeline };
}());
