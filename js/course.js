(function () {
    "use strict";

    const SELECTORS = {
        story: "main.story",
        svg: "svg#story-course",
        base: "path#course-base",
        curb: "path#course-curb",
        progress: "path#course-progress",
        car: "image#course-car",
        anchor: "[data-track-anchor]",
        readout: "[data-lap-progress]"
    };

    const state = {
        initialized: false,
        generation: 0,
        frame: 0,
        needsBuild: false,
        reducedMotion: false,
        story: null,
        svg: null,
        base: null,
        curb: null,
        progress: null,
        car: null,
        anchors: [],
        readouts: [],
        pathLength: 0,
        storyTop: 0,
        storyHeight: 0,
        scrollStart: 0,
        scrollEnd: 1,
        carCenterX: 0,
        carCenterY: 0,
        lastPercent: -1,
        lastObservedWidth: 0,
        lastObservedHeight: 0,
        mediaQuery: null,
        resizeObserver: null,
        original: null,
        handlers: null
    };

    function clamp(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    function finiteNumber(value, fallback) {
        const number = Number.parseFloat(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function pageScrollY() {
        return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    }

    function scheduleFrame(rebuild) {
        if (!state.initialized) {
            return;
        }

        state.needsBuild = state.needsBuild || Boolean(rebuild);
        if (state.frame) {
            return;
        }

        state.frame = window.requestAnimationFrame(function () {
            state.frame = 0;

            if (!state.initialized) {
                return;
            }

            if (state.needsBuild) {
                state.needsBuild = false;
                buildCourse();
            }

            updateCourse();
        });
    }

    function anchorX(anchor, index, width, leftX, rightX) {
        const raw = (anchor.getAttribute("data-track-anchor") || "").trim().toLowerCase();

        if (raw === "left" || raw === "start") {
            return leftX;
        }
        if (raw === "right" || raw === "end") {
            return rightX;
        }
        if (raw === "center" || raw === "middle") {
            return width / 2;
        }

        if (raw.endsWith("%")) {
            return clamp(width * finiteNumber(raw, 50) / 100, leftX, rightX);
        }

        if (raw !== "") {
            const numeric = Number.parseFloat(raw);
            if (Number.isFinite(numeric)) {
                if (numeric >= 0 && numeric <= 1) {
                    return clamp(width * numeric, leftX, rightX);
                }
                if (numeric > 1 && numeric <= 100) {
                    return clamp(width * numeric / 100, leftX, rightX);
                }
                return clamp(numeric, leftX, rightX);
            }
        }

        return index % 2 === 0 ? leftX : rightX;
    }

    function anchorY(anchor, storyRect, storyHeight) {
        const rect = anchor.getBoundingClientRect();
        const alignment = (anchor.getAttribute("data-track-y") || "center").trim().toLowerCase();
        let y = rect.top - storyRect.top + rect.height / 2;

        if (alignment === "top" || alignment === "start") {
            y = rect.top - storyRect.top;
        } else if (alignment === "bottom" || alignment === "end") {
            y = rect.bottom - storyRect.top;
        } else if (alignment.endsWith("%")) {
            y = rect.top - storyRect.top + rect.height * finiteNumber(alignment, 50) / 100;
        }

        return clamp(y, 0, storyHeight);
    }

    function makePath(points) {
        if (!points.length) {
            return "";
        }

        const number = function (value) {
            return Math.round(value * 100) / 100;
        };
        let path = "M " + number(points[0].x) + " " + number(points[0].y);

        if (points.length === 1) {
            return path;
        }

        if (points.length === 2) {
            const first = points[0];
            const second = points[1];
            const offset = (second.y - first.y) * 0.5;
            return path
                + " C " + number(first.x) + " " + number(first.y + offset)
                + ", " + number(second.x) + " " + number(second.y - offset)
                + ", " + number(second.x) + " " + number(second.y);
        }

        // Catmull-Rom to cubic Bezier conversion. Clamping the control point Y
        // values keeps the course moving forward even when chapters vary wildly
        // in height.
        for (let index = 0; index < points.length - 1; index += 1) {
            const previous = points[index - 1] || points[index];
            const current = points[index];
            const next = points[index + 1];
            const following = points[index + 2] || next;
            const minimumY = Math.min(current.y, next.y);
            const maximumY = Math.max(current.y, next.y);
            const factor = 1 / 6;
            const controlOne = {
                x: current.x + (next.x - previous.x) * factor,
                y: clamp(current.y + (next.y - previous.y) * factor, minimumY, maximumY)
            };
            const controlTwo = {
                x: next.x - (following.x - current.x) * factor,
                y: clamp(next.y - (following.y - current.y) * factor, minimumY, maximumY)
            };

            path += " C " + number(controlOne.x) + " " + number(controlOne.y)
                + ", " + number(controlTwo.x) + " " + number(controlTwo.y)
                + ", " + number(next.x) + " " + number(next.y);
        }

        return path;
    }

    function measureCar() {
        let box = null;

        try {
            box = state.car.getBBox();
        } catch (error) {
            box = null;
        }

        const x = box && Number.isFinite(box.x)
            ? box.x
            : finiteNumber(state.car.getAttribute("x"), 0);
        const y = box && Number.isFinite(box.y)
            ? box.y
            : finiteNumber(state.car.getAttribute("y"), 0);
        const width = box && box.width > 0
            ? box.width
            : finiteNumber(state.car.getAttribute("width"), 48);
        const height = box && box.height > 0
            ? box.height
            : finiteNumber(state.car.getAttribute("height"), 20);

        state.carCenterX = x + width / 2;
        state.carCenterY = y + height / 2;
    }

    function setReducedMotionVisuals() {
        if (state.reducedMotion) {
            state.progress.style.strokeDasharray = "none";
            state.progress.style.strokeDashoffset = "0";
            state.car.style.display = "none";
            return;
        }

        state.progress.style.strokeDasharray = state.pathLength + " " + state.pathLength;
        state.car.style.display = state.original.carDisplay;
    }

    function buildCourse() {
        if (!state.story || !state.story.isConnected) {
            return;
        }

        const storyRect = state.story.getBoundingClientRect();
        const width = Math.max(1, state.story.clientWidth, storyRect.width);
        const storyHeight = Math.max(1, state.story.scrollHeight, storyRect.height);
        const compactCourse = width < 720;
        const edge = clamp(width * 0.075, 56, 128);
        // Mobile uses a narrow pit-wall rail while retaining a full-width SVG
        // viewport. Shrinking the SVG itself would uniformly scale thousands of
        // vertical pixels and visually collapse the course.
        const leftX = compactCourse ? clamp(width * 0.07, 22, 30) : edge;
        const rightX = compactCourse
            ? Math.min(width - 18, leftX + 30)
            : Math.max(leftX, width - edge);

        state.storyHeight = storyHeight;
        state.storyTop = storyRect.top + pageScrollY();
        state.scrollStart = state.storyTop;
        state.scrollEnd = Math.max(state.scrollStart + 1, state.storyTop + storyHeight - window.innerHeight);

        state.svg.setAttribute("viewBox", "0 0 " + width + " " + storyHeight);
        state.svg.setAttribute("width", String(width));
        state.svg.setAttribute("height", String(storyHeight));
        state.svg.style.height = storyHeight + "px";

        const points = state.anchors
            .filter(function (anchor) {
                return anchor.isConnected && anchor.getClientRects().length > 0;
            })
            .map(function (anchor, index) {
                return {
                    x: anchorX(anchor, index, width, leftX, rightX),
                    y: anchorY(anchor, storyRect, storyHeight)
                };
            })
            .sort(function (first, second) {
                return first.y - second.y;
            });

        const pathData = makePath(points);
        state.base.setAttribute("d", pathData);
        state.curb.setAttribute("d", pathData);
        state.progress.setAttribute("d", pathData);

        try {
            state.pathLength = pathData ? state.progress.getTotalLength() : 0;
        } catch (error) {
            state.pathLength = 0;
        }

        measureCar();
        setReducedMotionVisuals();
        state.lastObservedWidth = width;
        state.lastObservedHeight = storyHeight;
        state.lastPercent = -1;
    }

    function updateReadouts(progress) {
        const percent = Math.round(progress * 100);
        if (percent === state.lastPercent) {
            return;
        }

        state.lastPercent = percent;
        state.readouts.forEach(function (readout) {
            const template = readout.getAttribute("data-lap-progress-template");
            const value = String(percent).padStart(2, "0") + "%";
            readout.textContent = template ? template.replace(/\{(?:progress|percent)\}/gi, value) : value;
            readout.setAttribute("aria-valuenow", String(percent));
        });
    }

    function updateCourse() {
        if (!state.pathLength) {
            updateReadouts(0);
            return;
        }

        const progress = clamp((pageScrollY() - state.scrollStart) / (state.scrollEnd - state.scrollStart), 0, 1);
        state.story.style.setProperty("--course-progress", String(progress));
        state.svg.style.setProperty("--course-progress", String(progress));
        updateReadouts(progress);

        if (state.reducedMotion) {
            return;
        }

        const travelled = state.pathLength * progress;
        state.progress.style.strokeDashoffset = String(state.pathLength - travelled);

        let point;
        let before;
        let after;
        try {
            point = state.progress.getPointAtLength(travelled);
            const sample = clamp(state.pathLength * 0.0025, 2, 12);
            before = state.progress.getPointAtLength(Math.max(0, travelled - sample));
            after = state.progress.getPointAtLength(Math.min(state.pathLength, travelled + sample));
        } catch (error) {
            return;
        }

        const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
        const headingOffset = finiteNumber(state.car.getAttribute("data-heading-offset"), 0);
        state.car.setAttribute(
            "transform",
            "translate(" + point.x + " " + point.y + ") "
                + "rotate(" + (angle + headingOffset) + ") "
                + "translate(" + (-state.carCenterX) + " " + (-state.carCenterY) + ")"
        );
    }

    function captureOriginalValues() {
        return {
            svgViewBox: state.svg.getAttribute("viewBox"),
            svgWidth: state.svg.getAttribute("width"),
            svgHeight: state.svg.getAttribute("height"),
            svgStyleHeight: state.svg.style.height,
            basePath: state.base.getAttribute("d"),
            curbPath: state.curb.getAttribute("d"),
            progressPath: state.progress.getAttribute("d"),
            progressDasharray: state.progress.style.strokeDasharray,
            progressDashoffset: state.progress.style.strokeDashoffset,
            carTransform: state.car.getAttribute("transform"),
            carDisplay: state.car.style.display
        };
    }

    function restoreAttribute(element, name, value) {
        if (value === null) {
            element.removeAttribute(name);
        } else {
            element.setAttribute(name, value);
        }
    }

    function init() {
        const story = document.querySelector(SELECTORS.story);
        const svg = story && story.querySelector(SELECTORS.svg);
        const base = svg && svg.querySelector(SELECTORS.base);
        const curb = svg && svg.querySelector(SELECTORS.curb);
        const progress = svg && svg.querySelector(SELECTORS.progress);
        const car = svg && svg.querySelector(SELECTORS.car);

        if (!story || !svg || !base || !curb || !progress || !car) {
            return false;
        }

        if (state.initialized) {
            if (state.story === story && state.svg === svg) {
                state.anchors = Array.from(story.querySelectorAll(SELECTORS.anchor));
                state.readouts = Array.from(document.querySelectorAll(SELECTORS.readout));
                scheduleFrame(true);
                return true;
            }
            destroy();
        }

        state.story = story;
        state.svg = svg;
        state.base = base;
        state.curb = curb;
        state.progress = progress;
        state.car = car;
        state.anchors = Array.from(story.querySelectorAll(SELECTORS.anchor));
        state.readouts = Array.from(document.querySelectorAll(SELECTORS.readout));
        state.mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        state.reducedMotion = state.mediaQuery.matches;
        state.original = captureOriginalValues();
        state.initialized = true;
        state.generation += 1;

        state.handlers = {
            scroll: function () {
                scheduleFrame(false);
            },
            resize: function () {
                scheduleFrame(true);
            },
            imageLoad: function () {
                scheduleFrame(true);
            },
            motionChange: function (event) {
                state.reducedMotion = event.matches;
                scheduleFrame(true);
            },
            fontsDone: function () {
                scheduleFrame(true);
            }
        };

        window.addEventListener("scroll", state.handlers.scroll, { passive: true });
        window.addEventListener("resize", state.handlers.resize, { passive: true });
        window.addEventListener("orientationchange", state.handlers.resize, { passive: true });
        window.addEventListener("pageshow", state.handlers.resize, { passive: true });
        car.addEventListener("load", state.handlers.imageLoad);

        if (typeof state.mediaQuery.addEventListener === "function") {
            state.mediaQuery.addEventListener("change", state.handlers.motionChange);
        } else if (typeof state.mediaQuery.addListener === "function") {
            state.mediaQuery.addListener(state.handlers.motionChange);
        }

        if (document.fonts) {
            const generation = state.generation;
            document.fonts.ready.then(function () {
                if (state.initialized && state.generation === generation) {
                    scheduleFrame(true);
                }
            });
            if (typeof document.fonts.addEventListener === "function") {
                document.fonts.addEventListener("loadingdone", state.handlers.fontsDone);
            }
        }

        if (typeof window.ResizeObserver === "function") {
            state.resizeObserver = new ResizeObserver(function () {
                if (!state.initialized) {
                    return;
                }
                const rect = state.story.getBoundingClientRect();
                const width = Math.max(1, state.story.clientWidth, rect.width);
                const height = Math.max(1, state.story.scrollHeight, rect.height);
                if (Math.abs(width - state.lastObservedWidth) > 0.5
                    || Math.abs(height - state.lastObservedHeight) > 0.5) {
                    scheduleFrame(true);
                }
            });
            state.resizeObserver.observe(story);
        }

        state.svg.setAttribute("aria-hidden", "true");
        buildCourse();
        updateCourse();
        return true;
    }

    function rebuild() {
        if (!state.initialized) {
            return init();
        }

        state.anchors = Array.from(state.story.querySelectorAll(SELECTORS.anchor));
        state.readouts = Array.from(document.querySelectorAll(SELECTORS.readout));
        scheduleFrame(true);
        return true;
    }

    function destroy() {
        if (!state.initialized) {
            return;
        }

        state.initialized = false;
        state.generation += 1;
        if (state.frame) {
            window.cancelAnimationFrame(state.frame);
            state.frame = 0;
        }

        window.removeEventListener("scroll", state.handlers.scroll);
        window.removeEventListener("resize", state.handlers.resize);
        window.removeEventListener("orientationchange", state.handlers.resize);
        window.removeEventListener("pageshow", state.handlers.resize);
        state.car.removeEventListener("load", state.handlers.imageLoad);

        if (state.mediaQuery) {
            if (typeof state.mediaQuery.removeEventListener === "function") {
                state.mediaQuery.removeEventListener("change", state.handlers.motionChange);
            } else if (typeof state.mediaQuery.removeListener === "function") {
                state.mediaQuery.removeListener(state.handlers.motionChange);
            }
        }

        if (document.fonts && typeof document.fonts.removeEventListener === "function") {
            document.fonts.removeEventListener("loadingdone", state.handlers.fontsDone);
        }
        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
            state.resizeObserver = null;
        }

        restoreAttribute(state.svg, "viewBox", state.original.svgViewBox);
        restoreAttribute(state.svg, "width", state.original.svgWidth);
        restoreAttribute(state.svg, "height", state.original.svgHeight);
        state.svg.style.height = state.original.svgStyleHeight;
        restoreAttribute(state.base, "d", state.original.basePath);
        restoreAttribute(state.curb, "d", state.original.curbPath);
        restoreAttribute(state.progress, "d", state.original.progressPath);
        state.progress.style.strokeDasharray = state.original.progressDasharray;
        state.progress.style.strokeDashoffset = state.original.progressDashoffset;
        restoreAttribute(state.car, "transform", state.original.carTransform);
        state.car.style.display = state.original.carDisplay;
        state.story.style.removeProperty("--course-progress");
        state.svg.style.removeProperty("--course-progress");
    }

    window.F1Course = Object.assign(window.F1Course || {}, {
        init: init,
        rebuild: rebuild,
        destroy: destroy
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
}());
