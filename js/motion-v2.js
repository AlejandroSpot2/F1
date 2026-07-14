(function () {
    "use strict";

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    let initialized = false;

    function initNavigation() {
        const header = document.querySelector(".topbar");
        const links = Array.from(document.querySelectorAll(".topnav a[href^='#']"));
        const anchors = Array.from(document.querySelectorAll("main [id]"))
            .filter((section) => links.some((link) => link.hash === `#${section.id}`));

        document.querySelectorAll("a[href^='#']").forEach((link) => {
            link.addEventListener("click", (event) => {
                const selector = link.getAttribute("href");
                if (!selector || selector === "#") return;
                const target = document.querySelector(selector);
                if (!target) return;
                event.preventDefault();
                const offset = header ? header.offsetHeight : 0;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
                if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
                window.setTimeout(() => target.focus({ preventScroll: true }), reducedMotion ? 0 : 520);
            });
        });

        if (!("IntersectionObserver" in window) || !anchors.length) return;
        const visibility = new Map();
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => visibility.set(entry.target.id, entry.intersectionRatio));
            const active = Array.from(visibility.entries()).sort((a, b) => b[1] - a[1])[0];
            if (!active || active[1] <= 0) return;
            links.forEach((link) => {
                const isActive = link.hash === `#${active[0]}`;
                link.classList.toggle("is-active", isActive);
                if (isActive) link.setAttribute("aria-current", "location");
                else link.removeAttribute("aria-current");
            });
        }, {
            rootMargin: "-24% 0px -58% 0px",
            threshold: [0, 0.08, 0.24, 0.5, 0.72]
        });
        anchors.forEach((anchor) => observer.observe(anchor));
    }

    function initSceneObserver() {
        const scenes = Array.from(document.querySelectorAll("[data-scene]"));
        if (!("IntersectionObserver" in window) || !scenes.length) return;
        const observer = new IntersectionObserver((entries) => {
            const active = entries
                .filter((entry) => entry.isIntersecting)
                .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (!active) return;
            const scene = active.target.dataset.scene || "hero";
            if (document.documentElement.dataset.scene === scene) return;
            document.documentElement.dataset.scene = scene;
            window.dispatchEvent(new CustomEvent("regulation-scene", { detail: { scene } }));
        }, {
            rootMargin: "-32% 0px -44% 0px",
            threshold: [0.08, 0.25, 0.52]
        });
        scenes.forEach((scene) => observer.observe(scene));
    }

    function introTimeline(gsap) {
        const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
        timeline
            .from(".brand, .topbar-tools, .lap-readout", {
                opacity: 0,
                y: -14,
                duration: 0.45,
                stagger: 0.06
            }, 0.16)
            .from(".hero-context", {
                opacity: 0,
                x: -28,
                duration: 0.52
            }, 0.28)
            .from(".hero h1 span", {
                opacity: 0,
                x: (index) => index % 2 ? 52 : -52,
                skewX: (index) => index % 2 ? 4 : -4,
                duration: 0.82,
                stagger: 0.08
            }, 0.33)
            .from(".hero-lede, .primary-action, .hero-thesis", {
                opacity: 0,
                y: 20,
                duration: 0.62,
                stagger: 0.09
            }, 0.68)
            .from(".hero-car", {
                opacity: 0,
                scale: 0.95,
                xPercent: 8,
                duration: 1.05
            }, 0.34);
    }

    function heroScroll(gsap, ScrollTrigger) {
        const hero = document.querySelector(".hero");
        if (!hero) return;
        const timeline = gsap.timeline({
            scrollTrigger: {
                trigger: hero,
                start: "top top",
                end: "bottom top",
                scrub: 0.8
            }
        });
        timeline
            .to(".hero h1 span:nth-child(1)", { xPercent: -12, opacity: 0.14, ease: "none" }, 0)
            .to(".hero h1 span:nth-child(2)", { xPercent: 9, opacity: 0.2, ease: "none" }, 0)
            .to(".hero h1 span:nth-child(3)", { xPercent: -5, opacity: 0.34, ease: "none" }, 0)
            .to(".hero-car", { scale: 1.11, xPercent: 6, yPercent: 5, ease: "none" }, 0)
            .to("#hero-ascii-car", { opacity: 0.12, xPercent: -5, ease: "none" }, 0)
            .to(".hero-telemetry", { yPercent: 70, opacity: 0, ease: "none" }, 0);

        ScrollTrigger.create({
            trigger: hero,
            start: "top top",
            end: "bottom top",
            onUpdate: (self) => {
                document.documentElement.style.setProperty("--hero-exit", self.progress.toFixed(3));
            }
        });
    }

    function animateGates(gsap) {
        document.querySelectorAll(".signal-gate").forEach((gate) => {
            const number = gate.querySelector(":scope > p");
            const copy = gate.querySelector(":scope > div");
            const ascii = gate.querySelector("pre");
            const timeline = gsap.timeline({
                scrollTrigger: {
                    trigger: gate,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.7
                }
            });
            if (number) timeline.fromTo(number, { xPercent: -20, rotate: -3 }, { xPercent: 26, rotate: 2, ease: "none" }, 0);
            if (copy) timeline.fromTo(copy, { xPercent: 8 }, { xPercent: -6, ease: "none" }, 0);
            if (ascii) timeline.fromTo(ascii, { yPercent: 42, opacity: 0 }, { yPercent: -34, opacity: 0.72, ease: "none" }, 0);

            if (!coarsePointer && window.innerWidth > 900) {
                ScrollTrigger.create({
                    trigger: gate,
                    start: "top top",
                    end: "+=75%",
                    pin: true,
                    pinSpacing: true,
                    anticipatePin: 1
                });
            }
        });
    }

    function animateChapters(gsap) {
        document.querySelectorAll(".chapter").forEach((chapter) => {
            const intro = chapter.querySelector(".chapter-intro");
            const board = chapter.querySelector(".evidence-board, .scorecard-wrap");
            const index = chapter.querySelector(".section-index");
            if (index) {
                gsap.from(index, {
                    opacity: 0,
                    scaleX: 0.4,
                    transformOrigin: "left center",
                    duration: 0.75,
                    ease: "power2.out",
                    scrollTrigger: { trigger: chapter, start: "top 82%" }
                });
            }
            if (intro) {
                gsap.from(Array.from(intro.children), {
                    opacity: 0,
                    y: 34,
                    duration: 0.72,
                    stagger: 0.07,
                    ease: "power3.out",
                    scrollTrigger: { trigger: intro, start: "top 78%", toggleActions: "play none none reverse" }
                });
            }
            if (board) {
                gsap.from(board, {
                    opacity: 0,
                    y: 46,
                    duration: 0.88,
                    ease: "power3.out",
                    scrollTrigger: { trigger: board, start: "top 82%", toggleActions: "play none none reverse" }
                });
            }
        });

        document.querySelectorAll(".ascii-ribbon").forEach((ribbon) => {
            gsap.fromTo(ribbon, { xPercent: 0 }, {
                xPercent: -18,
                ease: "none",
                scrollTrigger: { trigger: ribbon.parentElement, start: "top bottom", end: "bottom top", scrub: 0.8 }
            });
        });
    }

    function animateCharts(gsap) {
        document.querySelectorAll(".chart-stage").forEach((stage) => {
            const marks = stage.querySelectorAll(".pace-row, .movement-row, .driver-series, .timeline-row");
            if (marks.length) {
                gsap.from(marks, {
                    opacity: 0,
                    x: (index) => index % 2 ? 18 : -18,
                    duration: 0.5,
                    stagger: { each: 0.025, from: "random" },
                    ease: "power2.out",
                    scrollTrigger: { trigger: stage, start: "top 82%", once: true }
                });
            }
            stage.querySelectorAll("path").forEach((path) => {
                if (typeof path.getTotalLength !== "function") return;
                let length = 0;
                try { length = path.getTotalLength(); } catch (error) { length = 0; }
                if (!length || length > 10000) return;
                gsap.from(path, {
                    strokeDasharray: length,
                    strokeDashoffset: length,
                    duration: 1.15,
                    ease: "power2.out",
                    scrollTrigger: { trigger: stage, start: "top 82%", once: true }
                });
            });
        });
    }

    function animateVerdict(gsap) {
        const verdict = document.querySelector(".verdict");
        if (!verdict) return;
        gsap.from(".verdict h2 span", {
            opacity: 0,
            x: (index) => index % 2 ? 80 : -80,
            duration: 0.74,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: { trigger: verdict, start: "top 64%", toggleActions: "play none none reverse" }
        });
        gsap.from(".verdict-row", {
            opacity: 0,
            x: 34,
            duration: 0.5,
            stagger: 0.08,
            scrollTrigger: { trigger: ".verdict-board", start: "top 78%", toggleActions: "play none none reverse" }
        });
        gsap.to(".verdict-noise", {
            xPercent: -22,
            rotate: 4,
            ease: "none",
            scrollTrigger: { trigger: verdict, start: "top bottom", end: "bottom top", scrub: 0.7 }
        });
    }

    function initGsap() {
        if (reducedMotion || typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") {
            document.documentElement.classList.add("motion-reduced");
            return;
        }
        const gsap = window.gsap;
        const ScrollTrigger = window.ScrollTrigger;
        gsap.registerPlugin(ScrollTrigger);
        // Register the scrub while the headline is still at its authored state.
        // If the intro `.from()` runs first, the scrub captures opacity: 0 as its
        // starting value and can leave the title invisible at scroll position 0.
        heroScroll(gsap, ScrollTrigger);
        introTimeline(gsap);
        animateGates(gsap);
        animateChapters(gsap);
        animateCharts(gsap);
        animateVerdict(gsap);
        window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
        window.addEventListener("terminal-slipstream-ready", () => ScrollTrigger.refresh(), { once: true });
    }

    function init() {
        if (initialized) return true;
        initialized = true;
        initNavigation();
        initSceneObserver();
        initGsap();
        return true;
    }

    window.F1Motion = { init };
}());
