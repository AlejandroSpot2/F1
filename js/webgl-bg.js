import * as THREE from "three";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 768px)").matches;
const isLiteMode = prefersReducedMotion;

const canvas = document.getElementById("webgl-bg");
if (!canvas) {
    // no-op
} else {
    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: isMobile ? "low-power" : "default"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uScroll: { value: 0 },
        uVelocity: { value: 0 },
        uAccent: { value: new THREE.Color("#dc0000") },
        uLite: { value: isLiteMode ? 1 : 0 }
    };

    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `;

    const fragmentShader = `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        uniform float uScroll;
        uniform float uVelocity;
        uniform vec3 uAccent;
        uniform float uLite;
        varying vec2 vUv;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            float a = hash(i);
            float b = hash(i + vec2(1.0, 0.0));
            float c = hash(i + vec2(0.0, 1.0));
            float d = hash(i + vec2(1.0, 1.0));
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
            vec2 uv = vUv;
            vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
            vec2 p = (uv - 0.5) * aspect;

            vec2 mouse = (uMouse - 0.5) * aspect * 0.35;
            p += mouse * 0.08;

            float scrollShift = uScroll * 0.4;
            float velBoost = uVelocity * 1.8;
            float t = uTime * (0.15 + uLite * 0.05) + scrollShift;

            float carbon = 0.0;
            for (int i = 0; i < 4; i++) {
                float fi = float(i);
                vec2 q = p * (3.0 + fi * 1.8) + vec2(t * (0.6 + fi * 0.15 + velBoost), -t * 0.4);
                carbon += noise(q) * pow(0.55, fi);
            }

            float streaks = 0.0;
            for (int j = 0; j < 6; j++) {
                float fj = float(j);
                float lane = sin((p.y + fj * 0.18 + t * (1.4 + velBoost * 2.0)) * 28.0 + p.x * 6.0);
                float speed = smoothstep(0.82, 1.0, lane);
                float weight = 1.0 - step(2.5, fj) * uLite;
                streaks += speed * (0.04 + 0.02 * sin(t + fj)) * weight;
            }

            vec3 base = vec3(0.04, 0.04, 0.05);
            vec3 fiber = mix(base, uAccent * 0.15, carbon * 0.35);
            vec3 color = fiber + vec3(streaks * (0.55 + velBoost * 0.4)) * uAccent;

            float aberration = uVelocity * 0.004;
            color.r += aberration * sin(p.x * 40.0 + t);
            color.b -= aberration * cos(p.y * 30.0 + t);

            float vignette = 1.0 - dot(p * 0.85, p * 0.85);
            color *= clamp(vignette, 0.35, 1.0);
            color *= 0.55 + velBoost * 0.15;

            gl_FragColor = vec4(color, 0.72);
        }
    `;

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    const targetMouse = new THREE.Vector2(0.5, 0.5);
    const currentMouse = new THREE.Vector2(0.5, 0.5);

    window.addEventListener("pointermove", (event) => {
        targetMouse.x = event.clientX / window.innerWidth;
        targetMouse.y = 1 - event.clientY / window.innerHeight;
    }, { passive: true });

    let lastScrollY = window.scrollY;
    window.addEventListener("scroll", () => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        uniforms.uScroll.value = maxScroll > 0 ? window.scrollY / maxScroll : 0;
        const vel = Math.abs(window.scrollY - lastScrollY);
        lastScrollY = window.scrollY;
        uniforms.uVelocity.value = Math.min(vel / 30, 1);
    }, { passive: true });

    function syncAccent() {
        const accent = getComputedStyle(document.documentElement).getPropertyValue("--theme-accent").trim();
        if (accent) {
            uniforms.uAccent.value.set(accent);
        }
        const cssVel = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scroll-velocity")) || 0;
        uniforms.uVelocity.value = Math.max(uniforms.uVelocity.value, cssVel);
    }

    const accentObserver = new MutationObserver(syncAccent);
    accentObserver.observe(document.body, { attributes: true, attributeFilter: ["data-active-theme"] });
    syncAccent();

    function resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height, false);
        uniforms.uResolution.value.set(width, height);
    }

    window.addEventListener("resize", resize, { passive: true });

    let visible = true;
    document.addEventListener("visibilitychange", () => {
        visible = !document.hidden;
    });

    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        if (!visible) {
            return;
        }

        currentMouse.lerp(targetMouse, 0.06);
        uniforms.uMouse.value.copy(currentMouse);
        uniforms.uTime.value = clock.getElapsedTime();
        uniforms.uVelocity.value *= 0.92;
        syncAccent();
        renderer.render(scene, camera);
    }

    resize();
    animate();
}
