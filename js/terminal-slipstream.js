import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
const paper = new THREE.Color("#f2eee4");
const red = new THREE.Color("#ff4a36");
const lime = new THREE.Color("#c7ff36");
const glyphs = " .:-=+*#%@012345";

const state = {
    renderer: null,
    scene: null,
    camera: null,
    field: null,
    material: null,
    frame: 0,
    running: false,
    visible: true,
    lastFrame: 0,
    scroll: 0,
    smoothScroll: 0,
    scrollVelocity: 0,
    lastScrollY: window.scrollY,
    pointer: new THREE.Vector2(10, 10),
    pointerTarget: new THREE.Vector2(10, 10),
    seasonMode: 0,
    ascii: null,
    noise: null,
    charts: [],
    audio: null,
    resizeTimer: 0
};

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}

function seeded(index) {
    const value = Math.sin(index * 127.1 + 311.7) * 43758.5453123;
    return value - Math.floor(value);
}

function glyphAtlas() {
    const cell = 48;
    const canvas = document.createElement("canvas");
    canvas.width = cell * glyphs.length;
    canvas.height = cell;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.font = `600 34px "IBM Plex Mono", monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    Array.from(glyphs).forEach((glyph, index) => {
        context.fillText(glyph, index * cell + cell / 2, cell / 2 + 1);
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function createField() {
    const mobile = window.innerWidth < 760;
    const count = reduceMotion ? 1800 : mobile ? 3600 : 7200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);
    const glyphIndex = new Float32Array(count);
    const seasons = new Float32Array(count);
    const density = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
        const a = seeded(index + 2);
        const b = seeded(index + 29);
        const c = seeded(index + 83);
        const d = seeded(index + 131);
        const season = index % 11 === 0 ? 0 : index % 2 === 0 ? -1 : 1;
        const stream = season === 0 ? 0 : season * 0.82;
        const tunnel = a * Math.PI * 2;
        const radius = 1.2 + Math.pow(b, 1.6) * 5.4;
        const x = -5.5 + a * 18.5 + Math.sin(tunnel * 1.7) * 0.8;
        const y = stream + Math.sin(a * 10.5 + b * 2.4) * (0.35 + b * 1.9);
        const z = Math.cos(tunnel) * radius * 0.42 + (c - 0.5) * 2.6;

        positions[index * 3] = x;
        positions[index * 3 + 1] = y;
        positions[index * 3 + 2] = z;

        const color = season < 0 ? red : season > 0 ? lime : paper;
        const brightness = season === 0 ? 0.62 : 0.78 + d * 0.22;
        colors[index * 3] = color.r * brightness;
        colors[index * 3 + 1] = color.g * brightness;
        colors[index * 3 + 2] = color.b * brightness;

        phases[index] = a * Math.PI * 2;
        sizes[index] = mobile ? 7 + d * 10 : 7 + d * 14;
        glyphIndex[index] = Math.floor(seeded(index + 199) * glyphs.length);
        seasons[index] = season;
        density[index] = 0.3 + seeded(index + 281) * 0.7;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("aGlyph", new THREE.BufferAttribute(glyphIndex, 1));
    geometry.setAttribute("aSeason", new THREE.BufferAttribute(seasons, 1));
    geometry.setAttribute("aDensity", new THREE.BufferAttribute(density, 1));

    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: true,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        uniforms: {
            uTime: { value: 0 },
            uScroll: { value: 0 },
            uVelocity: { value: 0 },
            uPointer: { value: state.pointer },
            uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, mobile ? 1.15 : 1.5) },
            uAtlas: { value: glyphAtlas() },
            uGlyphCount: { value: glyphs.length },
            uSeasonMode: { value: 0 }
        },
        vertexShader: `
            attribute float aPhase;
            attribute float aSize;
            attribute float aGlyph;
            attribute float aSeason;
            attribute float aDensity;
            varying vec3 vColor;
            varying float vGlyph;
            varying float vSeason;
            varying float vDensity;
            uniform float uTime;
            uniform float uScroll;
            uniform float uVelocity;
            uniform vec2 uPointer;
            uniform float uPixelRatio;

            void main() {
                vec3 p = position;
                float travel = uTime * (0.16 + aDensity * 0.18) + uScroll * 5.0;
                p.x += mod(travel + aPhase, 3.6) - 1.8;
                p.y += sin(p.x * 0.38 + aPhase + uTime * 0.7) * (0.12 + aDensity * 0.18);
                p.z += cos(p.x * 0.22 + aPhase - uTime * 0.38) * 0.18;
                p.x += sin(uScroll * 6.283 + aPhase) * 0.3;

                vec2 projected = p.xy / vec2(8.6, 4.8);
                float pointerDistance = length(projected - uPointer);
                float repel = smoothstep(0.42, 0.0, pointerDistance);
                vec2 direction = normalize(projected - uPointer + vec2(0.0001));
                p.xy += direction * repel * (0.35 + abs(uVelocity) * 0.8);

                vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                float perspective = clamp(10.0 / max(1.0, -mvPosition.z), 0.45, 1.65);
                gl_PointSize = aSize * perspective * uPixelRatio;
                vColor = color;
                vGlyph = aGlyph;
                vSeason = aSeason;
                vDensity = aDensity;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vGlyph;
            varying float vSeason;
            varying float vDensity;
            uniform sampler2D uAtlas;
            uniform float uGlyphCount;
            uniform float uSeasonMode;
            uniform float uTime;

            float bayer4(vec2 pixel) {
                vec2 p = mod(floor(pixel), 4.0);
                float index = p.x + p.y * 4.0;
                if (index < 0.5) return 0.0 / 16.0;
                if (index < 1.5) return 8.0 / 16.0;
                if (index < 2.5) return 2.0 / 16.0;
                if (index < 3.5) return 10.0 / 16.0;
                if (index < 4.5) return 12.0 / 16.0;
                if (index < 5.5) return 4.0 / 16.0;
                if (index < 6.5) return 14.0 / 16.0;
                if (index < 7.5) return 6.0 / 16.0;
                if (index < 8.5) return 3.0 / 16.0;
                if (index < 9.5) return 11.0 / 16.0;
                if (index < 10.5) return 1.0 / 16.0;
                if (index < 11.5) return 9.0 / 16.0;
                if (index < 12.5) return 15.0 / 16.0;
                if (index < 13.5) return 7.0 / 16.0;
                if (index < 14.5) return 13.0 / 16.0;
                return 5.0 / 16.0;
            }

            void main() {
                vec2 local = vec2((vGlyph + gl_PointCoord.x) / uGlyphCount, 1.0 - gl_PointCoord.y);
                float glyphAlpha = texture2D(uAtlas, local).a;
                float threshold = bayer4(gl_FragCoord.xy + floor(uTime * 5.0));
                if (glyphAlpha < 0.2 || vDensity + 0.25 < threshold) discard;
                float seasonAlpha = 1.0;
                if (uSeasonMode < -0.5 && vSeason > 0.5) seasonAlpha = 0.035;
                if (uSeasonMode > 0.5 && vSeason < -0.5) seasonAlpha = 0.035;
                float edge = smoothstep(0.0, 0.16, gl_PointCoord.x) * smoothstep(1.0, 0.84, gl_PointCoord.x);
                gl_FragColor = vec4(vColor, glyphAlpha * seasonAlpha * (0.28 + vDensity * 0.5) * edge);
            }
        `
    });

    state.material = material;
    state.field = new THREE.Points(geometry, material);
    state.field.position.set(1.5, 0.1, -1.5);
    state.field.rotation.z = -0.05;
    state.scene.add(state.field);
}

function resizeRenderer() {
    if (!state.renderer || !state.camera) return;
    const mobile = window.innerWidth < 760;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1.15 : 1.5);
    state.renderer.setPixelRatio(ratio);
    state.renderer.setSize(width, height, false);
    state.camera.aspect = width / Math.max(1, height);
    state.camera.updateProjectionMatrix();
    if (state.material) state.material.uniforms.uPixelRatio.value = ratio;
    resizeAscii();
    resizeNoise();
    prepareChartCanvases();
}

function initWebgl() {
    const canvas = document.getElementById("slipstream-webgl");
    if (!canvas) return false;
    state.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "high-performance"
    });
    state.renderer.setClearColor(0x080a08, 0);
    state.renderer.outputColorSpace = THREE.SRGBColorSpace;
    state.scene = new THREE.Scene();
    state.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    state.camera.position.set(0, 0, 13.5);
    createField();
    resizeRenderer();
    return true;
}

function initAsciiCar() {
    const canvas = document.getElementById("hero-ascii-car");
    const image = document.querySelector(".hero-car");
    if (!canvas || !image) return;
    state.ascii = {
        canvas,
        context: canvas.getContext("2d"),
        image,
        sample: document.createElement("canvas"),
        data: null,
        columns: window.innerWidth < 760 ? 94 : 178,
        rows: 0,
        cell: 0,
        ready: false,
        lastDraw: 0
    };
    const prepare = () => {
        const source = state.ascii;
        source.rows = Math.round(source.columns * 9 / 16);
        source.sample.width = source.columns;
        source.sample.height = source.rows;
        const sampleContext = source.sample.getContext("2d", { willReadFrequently: true });
        sampleContext.drawImage(image, 0, 0, source.columns, source.rows);
        source.data = sampleContext.getImageData(0, 0, source.columns, source.rows).data;
        source.ready = true;
        drawAsciiCar(performance.now(), true);
    };
    if (image.complete) prepare();
    else image.addEventListener("load", prepare, { once: true });
    resizeAscii();
}

function resizeAscii() {
    if (!state.ascii) return;
    const rect = state.ascii.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    state.ascii.canvas.width = Math.max(1, Math.round(rect.width * ratio));
    state.ascii.canvas.height = Math.max(1, Math.round(rect.height * ratio));
    state.ascii.context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawAsciiCar(time, force = false) {
    const source = state.ascii;
    if (!source || !source.ready || (!force && time - source.lastDraw < 42)) return;
    source.lastDraw = time;
    const rect = source.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (!width || !height) return;
    const context = source.context;
    context.clearRect(0, 0, width, height);
    const cellWidth = width / source.columns;
    const cellHeight = height / source.rows;
    const velocityJitter = reduceMotion ? 0 : Math.min(2.5, Math.abs(state.scrollVelocity) * 18);
    context.font = `500 ${Math.max(5, cellHeight * 0.88)}px "IBM Plex Mono", monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    for (let y = 0; y < source.rows; y += 1) {
        for (let x = 0; x < source.columns; x += 1) {
            const offset = (y * source.columns + x) * 4;
            const r = source.data[offset];
            const g = source.data[offset + 1];
            const b = source.data[offset + 2];
            const luminance = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
            if (luminance < 0.055) continue;
            const threshold = ((x & 3) * 4 + (y & 3)) / 20;
            if (luminance * 1.25 < threshold) continue;
            const glyphIndex = Math.min(glyphs.length - 1, Math.floor(luminance * glyphs.length));
            const seasonPulse = Math.sin(x * 0.11 + y * 0.08 + time * 0.0012);
            if (seasonPulse > 0.78) context.fillStyle = "rgba(199,255,54,.78)";
            else if (seasonPulse < -0.78) context.fillStyle = "rgba(255,74,54,.72)";
            else context.fillStyle = `rgba(242,238,228,${0.23 + luminance * 0.72})`;
            const jitter = seeded(x + y * source.columns) * velocityJitter;
            context.fillText(
                glyphs[glyphIndex],
                x * cellWidth + cellWidth * 0.5 + jitter,
                y * cellHeight + cellHeight * 0.5
            );
        }
    }
}

function initNoise() {
    const canvas = document.getElementById("dither-noise");
    if (!canvas) return;
    state.noise = { canvas, context: canvas.getContext("2d"), lastDraw: 0 };
    resizeNoise();
}

function resizeNoise() {
    if (!state.noise) return;
    const width = Math.max(1, Math.ceil(window.innerWidth / 4));
    const height = Math.max(1, Math.ceil(window.innerHeight / 4));
    state.noise.canvas.width = width;
    state.noise.canvas.height = height;
    state.noise.canvas.style.width = `${window.innerWidth}px`;
    state.noise.canvas.style.height = `${window.innerHeight}px`;
}

function drawNoise(time) {
    if (!state.noise || time - state.noise.lastDraw < 90) return;
    state.noise.lastDraw = time;
    const { canvas, context } = state.noise;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const phase = Math.floor(time / 90);
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < canvas.height; y += 4) {
        for (let x = 0; x < canvas.width; x += 4) {
            const threshold = bayer[(x / 4 + (y / 4) * 4 + phase) & 15] / 16;
            const edge = Math.abs(x / canvas.width - 0.5) * 2;
            if (seeded(x * 0.7 + y * 1.3 + phase) + edge * 0.18 < 0.92 + threshold * 0.08) continue;
            context.fillStyle = (x + y + phase) % 9 === 0 ? "#c7ff36" : "#f2eee4";
            context.fillRect(x, y, 1, 1);
        }
    }
}

function prepareChartCanvases() {
    state.charts = Array.from(document.querySelectorAll(".chart-atmosphere")).map((canvas, chartIndex) => {
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
        canvas.width = Math.max(1, Math.round(rect.width * ratio));
        canvas.height = Math.max(1, Math.round(rect.height * ratio));
        const context = canvas.getContext("2d");
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        return { canvas, context, chartIndex, width: rect.width, height: rect.height, visible: true };
    });
}

function drawChartAtmospheres(time) {
    state.charts.forEach((chart) => {
        const rect = chart.canvas.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight || !chart.width || !chart.height) return;
        const { context, width, height, chartIndex } = chart;
        context.clearRect(0, 0, width, height);
        const count = window.innerWidth < 760 ? 260 : 520;
        for (let index = 0; index < count; index += 1) {
            const t = seeded(index + chartIndex * 1000);
            const season = index % 2;
            const phase = time * 0.00016 + seeded(index + 410) * 8;
            const x = ((t + phase * (season ? 0.016 : -0.014)) % 1) * width;
            const center = height * (season ? 0.63 : 0.38);
            const y = center + Math.sin(t * 16 + phase) * height * 0.11 + (seeded(index + 89) - 0.5) * height * 0.17;
            const size = seeded(index + 22) > 0.9 ? 2 : 1;
            context.fillStyle = season ? "rgba(199,255,54,.42)" : "rgba(255,74,54,.38)";
            context.fillRect(Math.round(x), Math.round(y), size, size);
        }
    });
}

function pageProgress() {
    const maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return clamp(window.scrollY / maximum, 0, 1);
}

function updateScrollState() {
    const currentY = window.scrollY;
    const delta = currentY - state.lastScrollY;
    state.lastScrollY = currentY;
    state.scroll = pageProgress();
    state.scrollVelocity += (delta / Math.max(1, window.innerHeight) - state.scrollVelocity) * 0.2;

    const percent = Math.round(state.scroll * 100);
    document.documentElement.style.setProperty("--course-progress", state.scroll.toFixed(4));
    document.querySelectorAll("[data-lap-progress]").forEach((element) => {
        const value = `${String(percent).padStart(2, "0")}%`;
        const template = element.getAttribute("data-lap-progress-template");
        element.textContent = template ? template.replace("{progress}", value) : value;
        element.setAttribute("aria-valuenow", String(percent));
    });
    document.querySelectorAll("[data-progress-glyphs]").forEach((element) => {
        const cells = 31;
        const filled = Math.round(state.scroll * cells);
        element.textContent = `[${"|".repeat(filled)}${".".repeat(cells - filled)}]`;
    });
}

function updateField(time) {
    if (!state.renderer || !state.material || !state.field) return;
    state.smoothScroll += (state.scroll - state.smoothScroll) * 0.045;
    state.pointer.lerp(state.pointerTarget, 0.07);
    state.scrollVelocity *= 0.93;
    state.material.uniforms.uTime.value = time * 0.001;
    state.material.uniforms.uScroll.value = state.smoothScroll;
    state.material.uniforms.uVelocity.value = state.scrollVelocity;
    state.material.uniforms.uSeasonMode.value = state.seasonMode;

    const wave = Math.sin(state.smoothScroll * Math.PI * 8);
    state.field.rotation.z = -0.08 + wave * 0.045;
    state.field.rotation.y = state.smoothScroll * 0.75;
    state.field.position.x = 1.4 - state.smoothScroll * 2.2;
    state.camera.position.x = Math.sin(state.smoothScroll * Math.PI * 5) * 0.55;
    state.camera.position.y = Math.cos(state.smoothScroll * Math.PI * 4) * 0.22;
    state.camera.lookAt(0, 0, 0);
    state.renderer.render(state.scene, state.camera);
}

function tick(time) {
    if (!state.running) return;
    state.frame = requestAnimationFrame(tick);
    if (!state.visible || document.hidden) return;
    if (time - state.lastFrame < (coarsePointer ? 24 : 15)) return;
    state.lastFrame = time;
    updateScrollState();
    updateField(time);
    drawAsciiCar(time);
    drawNoise(time);
    drawChartAtmospheres(time);
    updateSound();
}

function setSeasonMode(value) {
    state.seasonMode = value === "2025" ? -1 : value === "2026" ? 1 : 0;
    document.documentElement.dataset.seasonView = value;
    document.querySelectorAll("[data-season-view]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.seasonView === value));
    });
}

function initSeasonControls() {
    document.querySelectorAll("[data-season-view]").forEach((button) => {
        button.addEventListener("click", () => setSeasonMode(button.dataset.seasonView || "all"));
    });
    setSeasonMode("all");
}

function createSoundscape() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    const context = new AudioContext();
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    master.gain.value = 0.0001;
    filter.type = "lowpass";
    filter.frequency.value = 240;
    filter.Q.value = 2.4;
    filter.connect(master);
    master.connect(context.destination);

    const low = context.createOscillator();
    const high = context.createOscillator();
    low.type = "sawtooth";
    high.type = "triangle";
    low.frequency.value = 42;
    high.frequency.value = 84;
    const lowGain = context.createGain();
    const highGain = context.createGain();
    lowGain.gain.value = 0.32;
    highGain.gain.value = 0.08;
    low.connect(lowGain).connect(filter);
    high.connect(highGain).connect(filter);
    low.start();
    high.start();
    return { context, master, filter, low, high, active: false };
}

async function toggleSound() {
    const button = document.querySelector(".sound-toggle");
    if (!state.audio) state.audio = createSoundscape();
    if (!state.audio) {
        if (button) button.hidden = true;
        return;
    }
    await state.audio.context.resume();
    state.audio.active = !state.audio.active;
    const now = state.audio.context.currentTime;
    state.audio.master.gain.cancelScheduledValues(now);
    state.audio.master.gain.exponentialRampToValueAtTime(state.audio.active ? 0.028 : 0.0001, now + 0.3);
    if (button) {
        button.textContent = state.audio.active ? "SND 1" : "SND 0";
        button.setAttribute("aria-pressed", String(state.audio.active));
        button.setAttribute("aria-label", state.audio.active ? "Turn ambient sound off" : "Turn ambient sound on");
    }
}

function updateSound() {
    if (!state.audio || !state.audio.active) return;
    const now = state.audio.context.currentTime;
    const velocity = clamp(Math.abs(state.scrollVelocity) * 18, 0, 1);
    state.audio.low.frequency.setTargetAtTime(42 + state.scroll * 24 + velocity * 38, now, 0.08);
    state.audio.high.frequency.setTargetAtTime(84 + state.scroll * 54 + velocity * 70, now, 0.08);
    state.audio.filter.frequency.setTargetAtTime(210 + state.scroll * 580 + velocity * 900, now, 0.1);
}

function initSoundControl() {
    const button = document.querySelector(".sound-toggle");
    if (!button) return;
    if (!(window.AudioContext || window.webkitAudioContext)) {
        button.hidden = true;
        return;
    }
    button.addEventListener("click", toggleSound);
}

function initPointer() {
    window.addEventListener("pointermove", (event) => {
        state.pointerTarget.set(
            event.clientX / Math.max(1, window.innerWidth) * 2 - 1,
            -(event.clientY / Math.max(1, window.innerHeight) * 2 - 1)
        );
    }, { passive: true });
    window.addEventListener("pointerleave", () => state.pointerTarget.set(10, 10), { passive: true });
}

function initVisibility() {
    const story = document.querySelector("main.story");
    if (story && "IntersectionObserver" in window) {
        const observer = new IntersectionObserver(([entry]) => {
            state.visible = entry.isIntersecting;
        }, { rootMargin: "120px" });
        observer.observe(story);
    }
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && state.audio && state.audio.active) {
            state.audio.master.gain.setTargetAtTime(0.0001, state.audio.context.currentTime, 0.08);
        }
    });
}

function init() {
    initAsciiCar();
    initNoise();
    prepareChartCanvases();
    initSeasonControls();
    initSoundControl();
    initPointer();
    initVisibility();
    updateScrollState();

    try {
        initWebgl();
        document.documentElement.classList.add("webgl-ready");
    } catch (error) {
        document.documentElement.classList.add("webgl-fallback");
        console.warn("Terminal Slipstream is using its static fallback.", error);
    }

    window.addEventListener("resize", () => {
        window.clearTimeout(state.resizeTimer);
        state.resizeTimer = window.setTimeout(resizeRenderer, 120);
    }, { passive: true });
    window.addEventListener("scroll", updateScrollState, { passive: true });

    state.running = !reduceMotion;
    if (reduceMotion) {
        updateField(0);
        drawNoise(0);
        drawChartAtmospheres(0);
    } else {
        state.frame = requestAnimationFrame(tick);
    }

    window.TerminalSlipstream = {
        setSeason: setSeasonMode,
        render: () => updateField(performance.now()),
        destroy() {
            state.running = false;
            cancelAnimationFrame(state.frame);
            if (state.renderer) state.renderer.dispose();
        }
    };
    window.dispatchEvent(new CustomEvent("terminal-slipstream-ready"));
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    init();
}
