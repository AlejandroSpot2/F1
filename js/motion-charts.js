(function () {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function animateBars() {
        document.querySelectorAll(".chart-item .chart-bar").forEach((bar, index) => {
            if (prefersReducedMotion) {
                return;
            }
            const wrapper = bar.closest(".chart-item");
            gsap.set(bar, { scaleX: 0, transformOrigin: "left center", opacity: 0 });
            gsap.to(bar, {
                scaleX: 1,
                opacity: 1,
                duration: 0.8,
                delay: index * 0.02,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: wrapper || bar,
                    start: "top 85%",
                    toggleActions: "play none none reverse"
                }
            });
        });
    }

    function animateStepPaths() {
        document.querySelectorAll(".chart-step-path").forEach((path) => {
            if (prefersReducedMotion) {
                return;
            }
            const length = path.getTotalLength();
            gsap.set(path, {
                strokeDasharray: length,
                strokeDashoffset: length,
                opacity: 0.3
            });
            gsap.to(path, {
                strokeDashoffset: 0,
                opacity: 1,
                duration: 1.4,
                ease: "power2.inOut",
                scrollTrigger: {
                    trigger: path.closest(".chart-item") || path,
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                }
            });
        });
    }

    function animateSlopePaths() {
        document.querySelectorAll(".position-slope").forEach((path, index) => {
            if (prefersReducedMotion) {
                return;
            }
            const length = path.getTotalLength();
            gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
            gsap.to(path, {
                strokeDashoffset: 0,
                duration: 1.2,
                delay: index * 0.12,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: "#position-proxy-chart",
                    start: "top 75%",
                    toggleActions: "play none none reverse"
                }
            });
        });

        document.querySelectorAll(".position-slope-point").forEach((point, index) => {
            if (prefersReducedMotion) {
                return;
            }
            gsap.from(point, {
                scale: 0,
                opacity: 0,
                duration: 0.4,
                delay: 0.5 + index * 0.05,
                ease: "back.out(2)",
                scrollTrigger: {
                    trigger: "#position-proxy-chart",
                    start: "top 75%",
                    toggleActions: "play none none reverse"
                }
            });
        });
    }

    function animateScorecardCells() {
        document.querySelectorAll(".scorecard-cell").forEach((cell, index) => {
            if (prefersReducedMotion) {
                return;
            }
            gsap.from(cell, {
                y: 24,
                opacity: 0,
                duration: 0.45,
                delay: (index % 6) * 0.04,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: "#scorecard-chart",
                    start: "top 78%",
                    toggleActions: "play none none reverse"
                }
            });
        });
    }

    function animateTimelineCells() {
        document.querySelectorAll("#timeline-chart .chart-mark").forEach((cell, index) => {
            if (prefersReducedMotion) {
                return;
            }
            gsap.from(cell, {
                scaleX: 0,
                opacity: 0,
                duration: 0.35,
                delay: (index % 20) * 0.008,
                ease: "power1.out",
                transformOrigin: "left center",
                scrollTrigger: {
                    trigger: "#timeline-chart",
                    start: "top 80%",
                    toggleActions: "play none none reverse"
                }
            });
        });
    }

    function init() {
        if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
            return;
        }

        animateBars();
        animateStepPaths();
        animateSlopePaths();
        animateScorecardCells();
        animateTimelineCells();

        ScrollTrigger.refresh();
    }

    window.F1MotionCharts = { init };
})();
