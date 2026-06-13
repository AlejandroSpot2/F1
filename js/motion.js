(function () {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    const CHAPTER_THEMES = [
        { id: "hero", bg: "#0a0a0b", accent: "#ff2800", glow: "rgba(220, 0, 0, 0.35)" },
        { id: "overview", bg: "#140808", accent: "#dc0000", glow: "rgba(255, 40, 0, 0.28)" },
        { id: "pace", bg: "#141008", accent: "#ff8000", glow: "rgba(255, 128, 0, 0.3)" },
        { id: "position", bg: "#080c18", accent: "#3671c6", glow: "rgba(30, 65, 255, 0.28)" },
        { id: "chaos", bg: "#081614", accent: "#00d2be", glow: "rgba(0, 210, 190, 0.25)" },
        { id: "disruption", bg: "#141208", accent: "#f9d633", glow: "rgba(213, 182, 93, 0.28)" },
        { id: "scorecard", bg: "#081410", accent: "#006f62", glow: "rgba(0, 155, 119, 0.25)" },
        { id: "method", bg: "#080e14", accent: "#0090ff", glow: "rgba(0, 90, 255, 0.25)" }
    ];

    let lenis = null;

    function smoothstep(start, end, value) {
        const amount = Math.max(0, Math.min(1, (value - start) / (end - start)));
        return amount * amount * (3 - 2 * amount);
    }

    function setTransitionProgress(element, progress) {
        const clamped = Math.max(0, Math.min(1, progress));
        const eased = smoothstep(0.04, 0.96, clamped);
        const textIn = smoothstep(0.04, 0.18, clamped);
        const textOut = smoothstep(0.64, 0.82, clamped);
        const copyOpacity = textIn * (1 - textOut);
        const wipe = smoothstep(0.72, 0.96, clamped);
        const speed = smoothstep(0.12, 0.42, clamped) * (1 - smoothstep(0.74, 0.96, clamped));
        const start = -32;
        const end = 126;
        const hop = Math.sin(clamped * Math.PI * 5) * 5 * speed;
        const tilt = Math.sin(clamped * Math.PI * 3) * 1.5 * speed;
        element.style.setProperty("--scroll-progress", clamped.toFixed(3));
        element.style.setProperty("--drive-x", `${start + (end - start) * eased}vw`);
        element.style.setProperty("--road-x", `${Math.round(-980 * clamped)}px`);
        element.style.setProperty("--copy-opacity", copyOpacity.toFixed(3));
        element.style.setProperty("--copy-y", `${Math.round(34 - 92 * clamped)}px`);
        element.style.setProperty("--copy-scale", (0.98 + 0.04 * textIn).toFixed(3));
        element.style.setProperty("--wipe-opacity", (0.38 * wipe).toFixed(3));
        element.style.setProperty("--wipe-y", `${Math.round(104 - 114 * wipe)}%`);
        element.style.setProperty("--speed-opacity", (0.78 * speed).toFixed(3));
        element.style.setProperty("--jump-y", `${hop.toFixed(2)}px`);
        element.style.setProperty("--tilt", `${tilt.toFixed(2)}deg`);
    }

    function splitWords(selector) {
        document.querySelectorAll(selector).forEach((el) => {
            if (el.dataset.split) {
                return;
            }
            const text = el.textContent.trim();
            el.dataset.split = "true";
            el.innerHTML = text
                .split(/\s+/)
                .map((word) => `<span class="word"><span class="word-inner">${word}</span></span>`)
                .join(" ");
        });
    }

    function initLenis() {
        if (prefersReducedMotion || typeof Lenis === "undefined") {
            return null;
        }

        lenis = new Lenis({
            duration: 1.15,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            touchMultiplier: 1.4
        });

        lenis.on("scroll", ScrollTrigger.update);

        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);

        return lenis;
    }

    function initNav() {
        const nav = document.querySelector(".site-nav-fixed");
        const links = document.querySelectorAll(".site-nav-fixed a[href^='#']");
        const progressBar = document.querySelector(".scroll-progress-bar");

        links.forEach((link) => {
            link.addEventListener("click", (event) => {
                const target = document.querySelector(link.getAttribute("href"));
                if (!target) {
                    return;
                }
                event.preventDefault();
                const offset = nav ? nav.offsetHeight + 12 : 0;
                if (lenis) {
                    lenis.scrollTo(target, { offset: -offset, duration: 1.4 });
                } else {
                    target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
                }
            });
        });

        ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: (self) => {
                if (progressBar) {
                    progressBar.style.transform = `scaleX(${self.progress})`;
                }
                if (nav) {
                    nav.classList.toggle("is-scrolled", self.progress > 0.02);
                }
            }
        });

        const sections = document.querySelectorAll("[data-chapter]");
        sections.forEach((section) => {
            ScrollTrigger.create({
                trigger: section,
                start: "top 55%",
                end: "bottom 45%",
                onEnter: () => highlightNav(section.id),
                onEnterBack: () => highlightNav(section.id)
            });
        });

        function highlightNav(id) {
            links.forEach((link) => {
                link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
            });
        }
    }

    function initMagneticButtons() {
        if (prefersReducedMotion || isMobile) {
            return;
        }

        document.querySelectorAll(".magnetic").forEach((button) => {
            const strength = 0.32;
            button.addEventListener("mousemove", (event) => {
                const rect = button.getBoundingClientRect();
                const x = event.clientX - rect.left - rect.width / 2;
                const y = event.clientY - rect.top - rect.height / 2;
                gsap.to(button, {
                    x: x * strength,
                    y: y * strength,
                    duration: 0.35,
                    ease: "power2.out"
                });
            });
            button.addEventListener("mouseleave", () => {
                gsap.to(button, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.45)" });
            });
        });
    }

    function initChapterColors() {
        const atmosphere = document.querySelector(".color-atmosphere");
        if (!atmosphere) {
            return;
        }

        const chapters = document.querySelectorAll("[data-theme]");
        chapters.forEach((chapter) => {
            const themeId = chapter.dataset.theme;
            const theme = CHAPTER_THEMES.find((item) => item.id === themeId);
            if (!theme) {
                return;
            }

            ScrollTrigger.create({
                trigger: chapter,
                start: "top 70%",
                end: "bottom 30%",
                onEnter: () => applyTheme(theme),
                onEnterBack: () => applyTheme(theme)
            });
        });

        function applyTheme(theme) {
            document.body.dataset.activeTheme = theme.id;
            document.documentElement.style.setProperty("--theme-accent", theme.accent);
            gsap.to(atmosphere, {
                "--theme-bg": theme.bg,
                "--theme-accent": theme.accent,
                "--theme-glow": theme.glow,
                duration: prefersReducedMotion ? 0 : 0.9,
                ease: "power2.inOut"
            });
        }

        const first = CHAPTER_THEMES[0];
        atmosphere.style.setProperty("--theme-bg", first.bg);
        atmosphere.style.setProperty("--theme-accent", first.accent);
        atmosphere.style.setProperty("--theme-glow", first.glow);
    }

    function initHero() {
        const hero = document.querySelector(".chapter-hero");
        if (!hero || prefersReducedMotion) {
            return;
        }

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".hero-bg-layer", { scale: 1.12, duration: 2.2 })
            .from(".hero-ascii-wrap", { x: -40, opacity: 0, duration: 1.1 }, "-=1.6")
            .from(".hero-copy .word-inner", { y: "110%", duration: 0.9, stagger: 0.04 }, "-=1")
            .from(".hero-lede", { y: 24, opacity: 0, duration: 0.8 }, "-=0.5")
            .from(".scroll-cue", { y: 16, opacity: 0, duration: 0.6 }, "-=0.3");

        gsap.to(".hero-bg-layer", {
            yPercent: 12,
            ease: "none",
            scrollTrigger: {
                trigger: hero,
                start: "top top",
                end: "bottom top",
                scrub: true
            }
        });

        gsap.to(".hero-ascii-wrap", {
            yPercent: -8,
            ease: "none",
            scrollTrigger: {
                trigger: hero,
                start: "top top",
                end: "bottom top",
                scrub: true
            }
        });
    }

    function initChapterReveals() {
        document.querySelectorAll(".chapter-content").forEach((section) => {
            const words = section.querySelectorAll(".chapter-title .word-inner");
            const body = section.querySelectorAll(".chapter-lede, .section-copy p");
            const cards = section.querySelectorAll(".content-card, .chart-item, .method-card");

            if (prefersReducedMotion) {
                gsap.set([...words, ...body, ...cards], { clearProps: "all", opacity: 1, y: 0 });
                return;
            }

            if (words.length) {
                gsap.from(words, {
                    yPercent: 110,
                    duration: 0.85,
                    stagger: 0.035,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: section,
                        start: "top 78%",
                        toggleActions: "play none none reverse"
                    }
                });
            }

            if (body.length) {
                gsap.from(body, {
                    y: 28,
                    opacity: 0,
                    duration: 0.75,
                    stagger: 0.08,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: section,
                        start: "top 72%",
                        toggleActions: "play none none reverse"
                    }
                });
            }

            if (cards.length) {
                gsap.from(cards, {
                    y: 48,
                    opacity: 0,
                    duration: 0.7,
                    stagger: 0.06,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: section,
                        start: "top 68%",
                        toggleActions: "play none none reverse"
                    }
                });
            }
        });
    }

    function initParallaxLayers() {
        if (prefersReducedMotion) {
            return;
        }

        document.querySelectorAll("[data-parallax]").forEach((el) => {
            const speed = parseFloat(el.dataset.parallax) || 0.15;
            gsap.to(el, {
                yPercent: speed * 100,
                ease: "none",
                scrollTrigger: {
                    trigger: el.closest(".chapter") || el,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true
                }
            });
        });
    }

    function initArcadeTransitions() {
        const steps = Array.from(document.querySelectorAll(".arcade-transition"));
        if (!steps.length) {
            return;
        }

        steps.forEach((step) => {
            setTransitionProgress(step, 0);
            const stage = step.querySelector(".arcade-stage");

            if (prefersReducedMotion) {
                setTransitionProgress(step, 0.5);
                step.classList.add("is-active", "has-entered");
                return;
            }

            ScrollTrigger.create({
                trigger: step,
                start: "top top",
                end: "+=160%",
                pin: stage,
                scrub: 0.6,
                anticipatePin: 1,
                onEnter: () => step.classList.add("is-active", "has-entered"),
                onEnterBack: () => step.classList.add("is-active", "has-entered"),
                onUpdate: (self) => setTransitionProgress(step, self.progress)
            });
        });
    }

    function initCardHovers() {
        document.querySelectorAll(".content-card, .chart-item, .method-card").forEach((card) => {
            card.addEventListener("mouseenter", () => {
                if (prefersReducedMotion) {
                    return;
                }
                gsap.to(card, { y: -4, duration: 0.35, ease: "power2.out" });
            });
            card.addEventListener("mouseleave", () => {
                gsap.to(card, { y: 0, duration: 0.45, ease: "power2.out" });
            });
        });
    }

    function init() {
        if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        splitWords(".chapter-title, .hero-title");
        initLenis();
        initNav();
        initMagneticButtons();
        initChapterColors();
        initHero();
        initChapterReveals();
        initParallaxLayers();
        initArcadeTransitions();
        initCardHovers();

        ScrollTrigger.refresh();

        window.addEventListener("resize", () => {
            ScrollTrigger.refresh();
        });
    }

    window.F1Motion = { init, getLenis: () => lenis };
})();
