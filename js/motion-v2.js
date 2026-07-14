(function () {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    function initNavigation() {
        const header = document.querySelector(".topbar");
        const links = Array.from(document.querySelectorAll(".topnav a[href^='#']"));
        const anchors = Array.from(document.querySelectorAll("main [id]"))
            .filter((section) => links.some((link) => link.hash === `#${section.id}`));

        document.querySelectorAll("a[href^='#']").forEach((link) => {
            link.addEventListener("click", (event) => {
                const selector = link.getAttribute("href");
                if (!selector || selector === "#") {
                    return;
                }
                const target = document.querySelector(selector);
                if (!target) {
                    return;
                }
                event.preventDefault();
                const offset = header ? header.offsetHeight + 12 : 0;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: reducedMotion ? "auto" : "smooth" });
                if (!target.hasAttribute("tabindex")) {
                    target.setAttribute("tabindex", "-1");
                }
                window.setTimeout(() => target.focus({ preventScroll: true }), reducedMotion ? 0 : 450);
            });
        });

        if (!("IntersectionObserver" in window) || !anchors.length) {
            return;
        }

        const visibility = new Map();
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => visibility.set(entry.target.id, entry.intersectionRatio));
            const active = Array.from(visibility.entries()).sort((a, b) => b[1] - a[1])[0];
            if (!active || active[1] <= 0) {
                return;
            }
            links.forEach((link) => {
                const isActive = link.hash === `#${active[0]}`;
                link.classList.toggle("is-active", isActive);
                if (isActive) {
                    link.setAttribute("aria-current", "location");
                } else {
                    link.removeAttribute("aria-current");
                }
            });
        }, {
            rootMargin: "-28% 0px -58% 0px",
            threshold: [0, 0.1, 0.3, 0.6]
        });

        anchors.forEach((anchor) => observer.observe(anchor));
    }

    function initGsap() {
        if (reducedMotion || typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") {
            document.documentElement.classList.add("motion-reduced");
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        const hero = document.querySelector(".hero");
        const heroImage = document.querySelector(".hero-media img");
        const heroCopy = document.querySelector(".hero-copy");
        const heroBottom = document.querySelector(".hero-bottom");
        if (hero && heroImage) {
            gsap.fromTo(heroImage, { scale: 1.04 }, {
                scale: 1.12,
                yPercent: 5,
                ease: "none",
                scrollTrigger: {
                    trigger: hero,
                    start: "top top",
                    end: "bottom top",
                    scrub: 0.6
                }
            });
        }

        if (heroCopy) {
            gsap.from(heroCopy.children, {
                y: 28,
                opacity: 0,
                duration: 0.75,
                stagger: 0.09,
                ease: "power3.out"
            });
        }

        if (heroBottom) {
            gsap.from(heroBottom, {
                y: 20,
                opacity: 0,
                duration: 0.7,
                delay: 0.35,
                ease: "power2.out"
            });
        }

        document.querySelectorAll(".chapter").forEach((section) => {
            const intro = section.querySelector(".chapter-intro");
            const board = section.querySelector(".evidence-board, .scorecard-wrap");
            if (intro) {
                gsap.from(intro.children, {
                    y: 22,
                    opacity: 0,
                    duration: 0.65,
                    stagger: 0.07,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: section,
                        start: "top 72%",
                        toggleActions: "play none none reverse"
                    }
                });
            }
            if (board) {
                gsap.from(board, {
                    y: 34,
                    opacity: 0,
                    duration: 0.78,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: board,
                        start: "top 82%",
                        toggleActions: "play none none reverse"
                    }
                });
            }
        });

        document.querySelectorAll(".midpoint").forEach((section) => {
            const car = section.querySelector(".midpoint-car");
            if (!car) {
                return;
            }
            gsap.fromTo(car, { xPercent: -115 }, {
                xPercent: 28,
                ease: "none",
                scrollTrigger: {
                    trigger: section,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.45
                }
            });
        });

        const verdict = document.querySelector(".verdict");
        if (verdict) {
            gsap.from(verdict.querySelectorAll("h2 span, .verdict-copy > p, .verdict-row"), {
                y: 32,
                opacity: 0,
                duration: 0.65,
                stagger: 0.08,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: verdict,
                    start: "top 62%",
                    toggleActions: "play none none reverse"
                }
            });
        }

        if (!coarsePointer) {
            document.querySelectorAll(".interactive-mark").forEach((mark) => {
                mark.addEventListener("mouseenter", () => {
                    gsap.to(mark, { opacity: 0.72, duration: 0.15 });
                });
                mark.addEventListener("mouseleave", () => {
                    gsap.to(mark, { opacity: 1, duration: 0.15 });
                });
            });
        }

        window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
    }

    function init() {
        initNavigation();
        if (window.F1Course && typeof window.F1Course.init === "function") {
            window.F1Course.init();
        }
        initGsap();
    }

    window.F1Motion = { init };
})();
