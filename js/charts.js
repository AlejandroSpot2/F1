(function () {
    const DATA = window.ALPHA_RELEASE_DATA;
    const seasonColors = new Map([
        [2025, "#c4ad95"],
        [2026, "#8f4f18"]
    ]);
    const circuitColors = new Map([
        ["Australia", "#8f4f18"],
        ["China", "#2f6f63"],
        ["Japan", "#5a4a3b"],
        ["Miami", "#7569a7"],
        ["Canada", "#b35d2c"],
        ["Monaco", "#2f7d9a"],
        ["Barcelona", "#b0922e"]
    ]);
    const circuitFallbackColors = ["#8f4f18", "#2f6f63", "#5a4a3b", "#7569a7", "#b35d2c", "#2f7d9a", "#b0922e"];
    const driverLineColors = new Map([
        ["RUS", "#006f60"],
        ["ANT", "#008d7b"]
    ]);
    const timelineColors = new Map([
        ["Green", "#d9e4dc"],
        ["Yellow", "#d5b65d"],
        ["VSC", "#4f7d72"],
        ["Safety Car", "#cf7b2e"],
        ["Red Flag", "#9a3d30"]
    ]);
    const scorecardColors = new Map([
        ["2026 lower", "#9a3d30"],
        ["No change", "#f5efe9"],
        ["2026 higher", "#2f6f63"]
    ]);
    const lapRemainderFormat = d3.format("06.3f");
    const oneDecimalFormat = d3.format(",.1f");
    const twoDecimalFormat = d3.format(",.2f");
    const wholeNumberFormat = d3.format(",.0f");
    const signedOneDecimalFormat = d3.format("+,.1f");
    const signedTwoDecimalFormat = d3.format("+,.2f");
    const signedLapDeltaFormat = d3.format("+.3f");
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "chart-tooltip")
        .attr("role", "tooltip")
        .attr("aria-hidden", "true");

    function formatLap(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainder = seconds - minutes * 60;
        return `${minutes}:${lapRemainderFormat(remainder)}`;
    }

    function formatMetric(key, value) {
        if (key.includes("LapSec")) {
            return formatLap(value);
        }
        if (key === "medianSpeedTrap") {
            return `${oneDecimalFormat(value)} km/h`;
        }
        if (Number.isInteger(value)) {
            return wholeNumberFormat(value);
        }
        return twoDecimalFormat(value);
    }

    function formatDelta(key, value) {
        if (key.includes("LapSec")) {
            return `${signedLapDeltaFormat(value)} s`;
        }
        if (key === "medianSpeedTrap") {
            return `${signedOneDecimalFormat(value)} km/h`;
        }
        if (Number.isInteger(value)) {
            return d3.format("+,.0f")(value);
        }
        return signedTwoDecimalFormat(value);
    }

    function axisFormatForMetric(key) {
        if (key.includes("LapSec")) {
            return twoDecimalFormat;
        }
        if (key === "medianSpeedTrap") {
            return oneDecimalFormat;
        }
        return wholeNumberFormat;
    }

    function driverDisplayColor(driver) {
        return driverLineColors.get(driver.driver) || driver.color;
    }

    function orderedUnique(values) {
        const seen = new Set();
        return values.filter((value) => {
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    }

    function circuitsFromRaces(races) {
        return orderedUnique(races.map((race) => race.circuit));
    }

    function seasonsFromRaces(races) {
        return orderedUnique(races.map((race) => race.year)).sort();
    }

    function circuitColor(circuit, index = 0) {
        return circuitColors.get(circuit) || circuitFallbackColors[index % circuitFallbackColors.length];
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function tooltipMarkup(title, rows) {
        const details = rows
            .map(([label, value]) => `<span><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`)
            .join("");
        return `<strong>${escapeHtml(title)}</strong>${details}`;
    }

    function moveTooltip(event) {
        let anchorX = event.pageX;
        let anchorY = event.pageY;

        if ((!anchorX || !anchorY) && event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            anchorX = window.scrollX + rect.left + rect.width / 2;
            anchorY = window.scrollY + rect.top + rect.height / 2;
        }

        const offset = 14;
        const node = tooltip.node();
        const tooltipRect = node.getBoundingClientRect();
        const viewportRight = window.scrollX + document.documentElement.clientWidth - tooltipRect.width - 8;
        const viewportBottom = window.scrollY + document.documentElement.clientHeight - tooltipRect.height - 8;
        const left = Math.max(window.scrollX + 8, Math.min(anchorX + offset, viewportRight));
        const top = Math.max(window.scrollY + 8, Math.min(anchorY + offset, viewportBottom));

        tooltip
            .style("left", `${left}px`)
            .style("top", `${top}px`);
    }

    function showTooltip(event, html) {
        tooltip
            .html(html)
            .attr("aria-hidden", "false")
            .style("opacity", 1);
        moveTooltip(event);
    }

    function hideTooltip() {
        tooltip
            .attr("aria-hidden", "true")
            .style("opacity", 0);
    }

    function attachTooltip(selection, content) {
        selection
            .attr("tabindex", 0)
            .on("mouseenter focus", (event, d) => showTooltip(event, content(d)))
            .on("mousemove", moveTooltip)
            .on("mouseleave blur", hideTooltip);
    }

    function renderPaceComparison(races) {
        const metrics = [
            {
                key: "medianBestLapSec",
                title: "Median best green-flag lap",
                note: "Lower is faster.",
                formatter: formatLap
            },
            {
                key: "fastestLapSec",
                title: "Fastest green-flag lap",
                note: "Lower is faster.",
                formatter: formatLap
            },
            {
                key: "medianSpeedTrap",
                title: "Median clean-lap speed trap",
                note: "Higher suggests stronger straight-line speed.",
                formatter: (value) => `${oneDecimalFormat(value)} km/h`
            }
        ];

        const container = d3.select("#pace-comparison");

        metrics.forEach((metric) => {
            const wrapper = container.append("article").attr("class", "chart-item content-card");
            wrapper.append("h3").text(metric.title);

            const svg = wrapper.append("svg")
                .attr("viewBox", "0 0 330 280")
                .attr("aria-label", metric.title);

            const width = 330;
            const height = 280;
            const margin = { top: 18, right: 66, bottom: 42, left: 78 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            const root = svg.append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const circuits = circuitsFromRaces(races);
            const seasons = seasonsFromRaces(races);
            const y = d3.scaleBand().domain(circuits).range([0, innerHeight]).padding(0.26);
            const ySeason = d3.scaleBand().domain(seasons).range([0, y.bandwidth()]).padding(0.22);

            const values = races.map((race) => race.metrics[metric.key]);
            const minValue = d3.min(values);
            const maxValue = d3.max(values);
            const pad = (maxValue - minValue) * 0.2 || maxValue * 0.03;
            const x = d3.scaleLinear()
                .domain([minValue - pad, maxValue + pad])
                .range([0, innerWidth]);
            const xBase = x(minValue - pad);
            const axisFormatter = axisFormatForMetric(metric.key);

            root.append("g")
                .selectAll("line")
                .data(x.ticks(4))
                .enter()
                .append("line")
                .attr("x1", (d) => x(d))
                .attr("x2", (d) => x(d))
                .attr("y1", 0)
                .attr("y2", innerHeight)
                .attr("stroke", "var(--chart-grid)");

            const bars = root.selectAll("rect")
                .data(races)
                .enter()
                    .append("rect")
                    .attr("class", "chart-mark chart-bar")
                .attr("x", xBase)
                .attr("y", (d) => y(d.circuit) + ySeason(d.year))
                .attr("width", (d) => x(d.metrics[metric.key]) - xBase)
                .attr("height", ySeason.bandwidth())
                .attr("fill", (d) => seasonColors.get(d.year));

            attachTooltip(bars, (d) => tooltipMarkup(d.raceLabel, [
                [metric.title, metric.formatter(d.metrics[metric.key])],
                ["Circuit", d.circuit],
                ["Season", d.year],
                ["Note", metric.note]
            ]));

            root.selectAll(".bar-label")
                .data(races)
                .enter()
                .append("text")
                .attr("x", (d) => x(d.metrics[metric.key]) + 4)
                .attr("y", (d) => y(d.circuit) + ySeason(d.year) + ySeason.bandwidth() / 2)
                .attr("dy", "0.35em")
                .attr("text-anchor", "start")
                .attr("font-size", 10)
                .text((d) => metric.formatter(d.metrics[metric.key]));

            root.append("g")
                .attr("class", "axis")
                .attr("transform", `translate(0,${innerHeight})`)
                .call(d3.axisBottom(x).ticks(4).tickFormat(axisFormatter));

            root.append("g")
                .attr("class", "axis")
                .call(d3.axisLeft(y));

            const legend = wrapper.append("div").attr("class", "mini-legend");
            seasons.forEach((season) => {
                const item = legend.append("span");
                item.append("i").style("background", seasonColors.get(season));
                item.append("span").text(String(season));
            });
        });
    }

    function renderStepCharts(races) {
        const container = d3.select("#step-charts");
        const circuits = circuitsFromRaces(races);
        const seasons = seasonsFromRaces(races);
        const orderedRaces = seasons.flatMap((year) =>
            circuits
                .map((circuit) => races.find((race) => race.year === year && race.circuit === circuit))
                .filter(Boolean)
        );

        orderedRaces.forEach((race) => {
            const wrapper = container.append("article").attr("class", "chart-item content-card");
            wrapper.append("h3").text(race.raceLabel);

            const svg = wrapper.append("svg")
                .attr("viewBox", "0 0 340 250")
                .attr("aria-label", race.raceLabel);

            const width = 340;
            const height = 250;
            const margin = { top: 18, right: 44, bottom: 34, left: 44 };
            const innerWidth = width - margin.left - margin.right;
            const innerHeight = height - margin.top - margin.bottom;

            const root = svg.append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            const positionExtent = d3.max(race.topFinishers.flatMap((driver) => driver.positions.map((d) => d.position)));
            const x = d3.scaleLinear().domain([1, race.totalLaps]).range([0, innerWidth]);
            const y = d3.scaleLinear().domain([positionExtent, 1]).range([innerHeight, 0]);
            const line = d3.line()
                .curve(d3.curveStepAfter)
                .x((d) => x(d.lap))
                .y((d) => y(d.position));

            root.append("g")
                .selectAll("line")
                .data(y.ticks(5))
                .enter()
                .append("line")
                .attr("x1", 0)
                .attr("x2", innerWidth)
                .attr("y1", (d) => y(d))
                .attr("y2", (d) => y(d))
                .attr("stroke", "var(--chart-grid)");

            race.topFinishers.forEach((driver) => {
                const lineColor = driverDisplayColor(driver);
                    root.append("path")
                        .datum(driver.positions)
                        .attr("class", "chart-step-path")
                    .attr("fill", "none")
                    .attr("stroke", lineColor)
                    .attr("stroke-width", 2.4)
                    .attr("d", line);

                const finalPoint = driver.positions[driver.positions.length - 1];
                root.append("text")
                    .attr("x", x(finalPoint.lap) + 5)
                    .attr("y", y(finalPoint.position))
                    .attr("dy", "0.32em")
                    .attr("font-size", 10)
                    .attr("fill", lineColor)
                    .text(driver.driver);

                const points = root.selectAll(`.position-point-${race.raceKey}-${driver.driver}`)
                    .data(driver.positions)
                    .enter()
                    .append("circle")
                    .attr("class", "chart-mark position-point")
                    .attr("cx", (d) => x(d.lap))
                    .attr("cy", (d) => y(d.position))
                    .attr("r", 5)
                    .attr("fill", "transparent")
                    .attr("stroke", "transparent");

                attachTooltip(points, (d) => tooltipMarkup(`${race.raceLabel} - ${driver.driver}`, [
                    ["Lap", d.lap],
                    ["Position", d.position]
                ]));
            });

            root.append("g")
                .attr("class", "axis")
                .attr("transform", `translate(0,${innerHeight})`)
                .call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("d")));

            root.append("g")
                .attr("class", "axis")
                .call(d3.axisLeft(y).ticks(Math.min(5, positionExtent)).tickFormat(d3.format("d")));

            const legend = wrapper.append("div").attr("class", "mini-legend");
            race.topFinishers.forEach((driver) => {
                const item = legend.append("span");
                item.append("i").style("background", driverDisplayColor(driver));
                item.append("span").text(driver.driver);
            });
        });
    }

    function renderPositionSlope(races) {
        const circuits = circuitsFromRaces(races);
        const legend = d3.select("#position-proxy-legend");
        circuits.forEach((circuit, index) => {
            const item = legend.append("span");
            item.append("i").style("background", circuitColor(circuit, index));
            item.append("span").text(circuit);
        });

        const svg = d3.select("#position-proxy-chart");
        const width = 1080;
        const height = 420;
        const margin = { top: 28, right: 120, bottom: 52, left: 120 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const seasons = seasonsFromRaces(races);
        const byCircuit = circuits.map((circuit) => ({
            circuit,
            index: circuits.indexOf(circuit),
            values: seasons
                .map((year) => races.find((race) => race.circuit === circuit && race.year === year))
                .filter(Boolean)
        }));

        const x = d3.scalePoint()
            .domain(seasons)
            .range([0, innerWidth])
            .padding(0.16);
        const y = d3.scaleLinear()
            .domain([100, d3.max(races, (d) => d.metrics.positionChangeProxy)]).nice()
            .range([innerHeight, 0]);
        const line = d3.line()
            .x((d) => x(d.year))
            .y((d) => y(d.metrics.positionChangeProxy));

        root.append("g")
            .selectAll("line")
            .data(y.ticks(5))
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("x2", innerWidth)
            .attr("y1", (d) => y(d))
            .attr("y2", (d) => y(d))
            .attr("stroke", "var(--chart-grid)");

        root.selectAll(".position-slope")
            .data(byCircuit)
            .enter()
            .append("path")
            .attr("class", "position-slope")
            .attr("fill", "none")
            .attr("stroke", (d) => circuitColor(d.circuit, d.index))
            .attr("stroke-width", 2.6)
            .attr("d", (d) => line(d.values));

        const points = root.selectAll(".position-slope-point")
            .data(races)
            .enter()
            .append("circle")
            .attr("class", "chart-mark position-slope-point")
            .attr("cx", (d) => x(d.year))
            .attr("cy", (d) => y(d.metrics.positionChangeProxy))
            .attr("r", 5)
            .attr("fill", (d) => circuitColor(d.circuit, circuits.indexOf(d.circuit)))
            .attr("stroke", "var(--surface)")
            .attr("stroke-width", 1.5);

        attachTooltip(points, (d) => tooltipMarkup(d.raceLabel, [
            ["Position-change proxy", wholeNumberFormat(d.metrics.positionChangeProxy)],
            ["Circuit", d.circuit],
            ["Season", d.year]
        ]));

        root.selectAll(".slope-value-label")
            .data(races)
            .enter()
            .append("text")
            .attr("x", (d) => x(d.year) + (d.year === 2025 ? -12 : 12))
            .attr("y", (d) => y(d.metrics.positionChangeProxy))
            .attr("dy", "0.35em")
            .attr("text-anchor", (d) => d.year === 2025 ? "end" : "start")
            .attr("font-size", 11)
            .attr("fill", (d) => circuitColor(d.circuit, circuits.indexOf(d.circuit)))
            .text((d) => `${d.circuit} ${wholeNumberFormat(d.metrics.positionChangeProxy)}`);

        root.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));

        root.append("g")
            .attr("class", "axis")
            .call(d3.axisLeft(y).ticks(5).tickFormat(wholeNumberFormat));
    }

    function renderTimeline(races) {
        const legend = d3.select("#timeline-legend");
        timelineColors.forEach((color, label) => {
            const item = legend.append("span");
            item.append("i").style("background", color);
            item.append("span").text(label);
        });

        const svg = d3.select("#timeline-chart");
        const width = 1080;
        const height = 360;
        const margin = { top: 12, right: 20, bottom: 40, left: 150 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const rowHeight = innerHeight / races.length;
        const maxLap = d3.max(races, (d) => d.totalLaps);
        const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain([1, maxLap + 1]).range([0, innerWidth]);

        races.forEach((race, index) => {
            const yTop = index * rowHeight;
            root.append("text")
                .attr("x", -12)
                .attr("y", yTop + rowHeight / 2)
                .attr("text-anchor", "end")
                .attr("dy", "0.35em")
                .attr("font-size", 12)
                .text(race.raceLabel);

            root.selectAll(`.lap-${race.raceKey}`)
                .data(race.statusTimeline)
                .enter()
                .append("rect")
                .attr("class", "chart-mark")
                .attr("x", (d) => x(d.lap))
                .attr("y", yTop + 3)
                .attr("width", Math.max(1, x(2) - x(1) - 0.7))
                .attr("height", rowHeight - 6)
                .attr("fill", (d) => timelineColors.get(d.state) || "#d9e4dc")
                .call((selection) => attachTooltip(selection, (d) => tooltipMarkup(race.raceLabel, [
                    ["Lap", d.lap],
                    ["Status", d.state]
                ])));

            root.append("line")
                .attr("x1", 0)
                .attr("x2", innerWidth)
                .attr("y1", yTop + rowHeight)
                .attr("y2", yTop + rowHeight)
                .attr("stroke", "var(--chart-grid)");
        });

        root.append("g")
            .attr("class", "axis")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")));
    }

    function renderScorecard(scorecardRows) {
        const legend = d3.select("#scorecard-legend");
        scorecardColors.forEach((color, label) => {
            const item = legend.append("span");
            item.append("i").style("background", color);
            item.append("span").text(label);
        });

        const svg = d3.select("#scorecard-chart");
        const width = 1080;
        const height = 470;
        const margin = { top: 50, right: 20, bottom: 20, left: 250 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

        const circuits = orderedUnique(scorecardRows.map((row) => row.circuit));
        const metricRows = [
            "Median best lap (s)",
            "Fastest lap (s)",
            "Median speed trap (km/h)",
            "Position-change proxy",
            "Neutralized laps",
            "DNFs"
        ];

        const x = d3.scaleBand().domain(circuits).range([0, innerWidth]).padding(0.08);
        const y = d3.scaleBand().domain(metricRows).range([0, innerHeight]).padding(0.1);

        const rowScales = new Map();
        metricRows.forEach((metricLabel) => {
            const values = scorecardRows
                .filter((row) => row.metricLabel === metricLabel)
                .map((row) => Math.abs(row.delta));
            const maxAbs = d3.max(values) || 1;
            rowScales.set(
                metricLabel,
                d3.scaleLinear().domain([-maxAbs, 0, maxAbs]).range(["#9a3d30", "#f5efe9", "#2f6f63"])
            );
        });

        root.selectAll(".metric-label")
            .data(metricRows)
            .enter()
            .append("text")
            .attr("x", -16)
            .attr("y", (d) => y(d) + y.bandwidth() / 2)
            .attr("text-anchor", "end")
            .attr("dy", "0.35em")
            .attr("font-size", 12)
            .text((d) => d);

        root.selectAll(".circuit-label")
            .data(circuits)
            .enter()
            .append("text")
            .attr("x", (d) => x(d) + x.bandwidth() / 2)
            .attr("y", -16)
            .attr("text-anchor", "middle")
            .attr("font-size", 12)
            .attr("font-weight", 600)
            .text((d) => d);

        const cells = root.selectAll(".scorecard-cell")
            .data(scorecardRows)
            .enter()
            .append("g")
            .attr("class", "scorecard-cell chart-mark")
            .attr("transform", (d) => `translate(${x(d.circuit)},${y(d.metricLabel)})`);

        attachTooltip(cells, (d) => tooltipMarkup(`${d.circuit} - ${d.metricLabel}`, [
            ["2025", formatMetric(d.metricKey, d.season2025)],
            ["2026", formatMetric(d.metricKey, d.season2026)],
            ["Change", formatDelta(d.metricKey, d.delta)]
        ]));

        cells.append("rect")
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .attr("fill", (d) => rowScales.get(d.metricLabel)(d.delta))
            .attr("stroke", "var(--border)");

        cells.append("text")
            .attr("x", x.bandwidth() / 2)
            .attr("y", y.bandwidth() / 2 - 7)
            .attr("text-anchor", "middle")
            .attr("font-size", 12)
            .attr("font-weight", 600)
            .attr("fill", (d) => Math.abs(d.delta) > 0.55 * d3.max(scorecardRows.filter((row) => row.metricLabel === d.metricLabel), (row) => Math.abs(row.delta)) ? "#ffffff" : "#3d2a17")
            .text((d) => formatDelta(d.metricKey, d.delta));

        cells.append("text")
            .attr("x", x.bandwidth() / 2)
            .attr("y", y.bandwidth() / 2 + 11)
            .attr("text-anchor", "middle")
            .attr("font-size", 10)
            .attr("fill", (d) => Math.abs(d.delta) > 0.55 * d3.max(scorecardRows.filter((row) => row.metricLabel === d.metricLabel), (row) => Math.abs(row.delta)) ? "#f7f1ea" : "#6f5840")
            .text((d) => `${formatMetric(d.metricKey, d.season2025)} -> ${formatMetric(d.metricKey, d.season2026)}`);
    }

    function init() {
        if (!DATA) {
            document.body.innerHTML = "<p style='font-family:sans-serif;padding:2rem;'>Race data file not found. Run <code>python scripts/build_alpha_release_data.py</code> first.</p>";
            return false;
        }

        renderPaceComparison(DATA.races);
        renderStepCharts(DATA.races);
        renderPositionSlope(DATA.races);
        renderTimeline(DATA.races);
        renderScorecard(DATA.scorecard);
        return true;
    }

    window.F1Charts = { init };
})();
