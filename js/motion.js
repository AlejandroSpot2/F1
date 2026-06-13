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

    function splitLines(selector) {
        document.querySelectorAll(selector).forEach((el) => {
            if (el.dataset.lineSplit) {
                return;
            }
            el.dataset.lineSplit = "true";
            const lines = el.innerHTML.split(/<br\s*\/?>/i).map((s) => s.trim()).filter(Boolean);
            if (lines.length <= 1) {
                const words = el.textContent.trim().split(/\s+/);
                const mid = Math.ceil(words.length / 2);
                el.innerHTML = [
                    `<span class="hero-line"><span class="hero-line-inner">${words.slice(0, mid).join(" ")}</span></span>`,
                    `<span class="hero-line"><span class="hero-line-inner">${words.slice(mid).join(" ")}</span></span>`
                ].join(" ");
                return;
            }
            el.innerHTML = lines
                .map((line) => `<span class="hero-line"><span class="hero-line-inner">${line}</span></span>`)
                .join("");
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

        let lastScroll = 0;
        let velocity = 0;
        lenis.on("scroll", ({ scroll }) => {
            velocity = Math.abs(scroll - lastScroll);
            lastScroll = scroll;
            document.documentElement.style.setProperty("--scroll-velocity", String(Math.min(velocity / 40, 1)));
        });

        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });
        gsap.ticker.lagSmoothing(0);

        window.F1ScrollVelocity = () => velocity;
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

        document.querySelectorAll("[data-chapter]").forEach((section) => {
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
                const active = link.getAttribute("href") === `#${id}`;
                link.classList.toggle("is-active", active);
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
                gsap.to(button, { x: x * strength, y: y * strength, duration: 0.35, ease: "power2.out" });
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

        document.querySelectorAll("[data-theme]").forEach((chapter) => {
            const theme = CHAPTER_THEMES.find((item) => item.id === chapter.dataset.theme);
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
        if (!hero) {
            return;
        }

        if (prefersReducedMotion) {
            return;
        }

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from(".hero-bg-layer", { scale: 1.14, duration: 2.4 })
            .from(".hero-car-layer", { x: -80, opacity: 0, duration: 1.2 }, "-=1.8")
            .from(".hero-speed-lines", { opacity: 0, duration: 1 }, "-=1.2")
            .from(".hero-line-inner", { yPercent: 110, duration: 0.85, stagger: 0.12 }, "-=0.9")
            .from(".hero-lede", { y: 24, opacity: 0, duration: 0.8 }, "-=0.4")
            .from(".scroll-cue", { y: 16, opacity: 0, duration: 0.6 }, "-=0.3");

        gsap.to(".hero-bg-layer img", {
            scale: 1.08,
            yPercent: 8,
            ease: "none",
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true }
        });

        gsap.to(".hero-car-layer", {
            x: 60,
            yPercent: -6,
            ease: "none",
            scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true }
        });

        gsap.to(".scroll-cue", {
            opacity: 0.5,
            y: 6,
            duration: 1.8,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }

    function initChapterReveals() {
        document.querySelectorAll(".chapter-content").forEach((section) => {
            const words = section.querySelectorAll(".chapter-title .word-inner");
            const body = section.querySelectorAll(".chapter-lede");
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
                    scrollTrigger: { trigger: section, start: "top 78%", toggleActions: "play none none reverse" }
                });
            }

            body.forEach((lede) => {
                const ledeWords = lede.textContent.trim().split(/\s+/);
                lede.innerHTML = ledeWords
                    .map((w) => `<span class="lede-word">${w}</span>`)
                    .join(" ");
                gsap.from(lede.querySelectorAll(".lede-word"), {
                    opacity: 0.15,
                    duration: 0.5,
                    stagger: 0.015,
                    ease: "none",
                    scrollTrigger: {
                        trigger: lede,
                        start: "top 85%",
                        end: "top 55%",
                        scrub: true
                    }
                });
            });

            if (cards.length) {
                gsap.from(cards, {
                    y: 48,
                    opacity: 0,
                    duration: 0.7,
                    stagger: 0.06,
                    ease: "power2.out",
                    scrollTrigger: { trigger: section, start: "top 68%", toggleActions: "play none none reverse" }
                });
            }
        });
    }

    function initPinnedChapterNumbers() {
        if (prefersReducedMotion || isMobile || window.matchMedia("(max-width: 1080px)").matches) {
            return;
        }

        document.querySelectorAll(".chapter-content").forEach((section) => {
            const num = section.querySelector(".chapter-num");
            if (!num) {
                return;
            }
            ScrollTrigger.create({
                trigger: section,
                start: "top top",
                end: "bottom top",
                pin: num,
                pinSpacing: false
            });
        });
    }

    function initStatCountUp() {
        const stats = document.querySelectorAll(".stat-value");
        if (prefersReducedMotion) {
            return;
        }

        stats.forEach((stat) => {
            const target = parseInt(stat.textContent, 10);
            if (Number.isNaN(target)) {
                return;
            }
            const obj = { val: 0 };
            gsap.to(obj, {
                val: target,
                duration: 1.4,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: stat.closest(".overview-stats"),
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                },
                onUpdate: () => {
                    stat.textContent = Math.round(obj.val);
                }
            });
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

        const footerSilhouette = document.querySelector(".footer-parallax img");
        if (footerSilhouette) {
            gsap.to(footerSilhouette, {
                xPercent: -8,
                ease: "none",
                scrollTrigger: {
                    trigger: ".site-footer",
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true
                }
            });
        }
    }

    function initCardTilt() {
        if (prefersReducedMotion || isMobile) {
            return;
        }

        document.querySelectorAll(".content-card, .chart-item, .method-card").forEach((card) => {
            card.addEventListener("mousemove", (event) => {
                const rect = card.getBoundingClientRect();
                const x = (event.clientX - rect.left) / rect.width - 0.5;
                const y = (event.clientY - rect.top) / rect.height - 0.5;
                gsap.to(card, {
                    rotateY: x * 6,
                    rotateX: -y * 6,
                    y: -4,
                    duration: 0.35,
                    ease: "power2.out",
                    transformPerspective: 800
                });
            });
            card.addEventListener("mouseleave", () => {
                gsap.to(card, {
                    rotateY: 0,
                    rotateX: 0,
                    y: 0,
                    duration: 0.5,
                    ease: "power2.out"
                });
            });
        });
    }

    function init() {
        if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        splitWords(".chapter-title");
        splitLines(".hero-title");
        initLenis();
        initNav();
        initMagneticButtons();
        initChapterColors();
        initHero();
        initChapterReveals();
        initPinnedChapterNumbers();
        initStatCountUp();
        initParallaxLayers();

        if (window.F1MotionTransitions) {
            window.F1MotionTransitions.init();
        }

        if (window.F1MotionCharts) {
            window.F1MotionCharts.init();
        }

        initCardTilt();

        ScrollTrigger.refresh();

        window.addEventListener("resize", () => ScrollTrigger.refresh());
    }

    window.F1Motion = { init, getLenis: () => lenis };
})();
