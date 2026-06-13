(function () {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const ASSET = "assets/images/cinematic";

    function splitTitleLines(container) {
        const title = container.querySelector(".cinematic-title");
        if (!title || title.dataset.split) {
            return;
        }
        const text = title.textContent.trim();
        title.dataset.split = "true";
        title.innerHTML = text
            .split(/\s+/)
            .map((word) => `<span class="title-word"><span class="title-word-inner">${word}</span></span>`)
            .join(" ");
    }

    function buildTimeline(section, variant, vehicle) {
        const stage = section.querySelector(".cinematic-stage");
        const layers = section.querySelector(".cinematic-layers");
        const bg = section.querySelector(".layer-bg");
        const track = section.querySelector(".layer-track");
        const streaks = section.querySelector(".layer-streaks");
        const vehicleWrap = section.querySelector(".layer-vehicle-wrap");
        const vehicleEl = section.querySelector(".layer-vehicle");
        const shadow = section.querySelector(".layer-shadow");
        const fx = section.querySelector(".layer-fx");
        const smoke = section.querySelector(".layer-smoke");
        const copy = section.querySelector(".cinematic-copy");
        const titleWords = section.querySelectorAll(".title-word-inner");
        const body = section.querySelector(".cinematic-copy p:last-child");
        const wipe = section.querySelector(".layer-wipe");

        const isKart = vehicle === "kart";
        const isOvertake = variant === "overtake";
        const pinEnd = isMobile ? "+=120%" : "+=160%";

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: section,
                start: "top top",
                end: pinEnd,
                pin: stage,
                scrub: prefersReducedMotion ? false : 0.65,
                anticipatePin: 1,
                onEnter: () => section.classList.add("is-active"),
                onEnterBack: () => section.classList.add("is-active")
            }
        });

        if (prefersReducedMotion) {
            gsap.set([vehicleEl, shadow, streaks, copy, titleWords, body], { clearProps: "all", opacity: 1 });
            gsap.set(vehicleWrap, { x: "15vw" });
            return tl;
        }

        gsap.set(bg, { scale: 1.08 });
        gsap.set(track, { x: "-8%" });
        gsap.set(streaks, { x: "-20%", opacity: 0 });
        gsap.set(vehicleWrap, { x: "-55vw", rotation: isKart ? 0 : -1.5 });
        gsap.set(shadow, { x: "-58vw", opacity: 0.5, scaleX: 0.8 });
        gsap.set(vehicleEl, { y: 0 });
        gsap.set(fx, { opacity: 0 });
        gsap.set(smoke, { opacity: 0, x: "-10%" });
        gsap.set(copy, { opacity: 0, y: 40 });
        gsap.set(titleWords, { yPercent: 120, opacity: 0 });
        gsap.set(body, { opacity: 0, y: 20 });
        gsap.set(wipe, { yPercent: 100, opacity: 0 });

        tl.to(bg, { scale: 1, duration: 0.15, ease: "none" }, 0)
            .to(titleWords, {
                yPercent: 0,
                opacity: 1,
                stagger: 0.012,
                duration: 0.12,
                ease: "power3.out"
            }, 0)
            .to(copy, { opacity: 1, y: 0, duration: 0.1, ease: "power2.out" }, 0.02)
            .to(body, { opacity: 1, y: 0, duration: 0.1, ease: "power2.out" }, 0.06)
            .to(streaks, { opacity: isOvertake ? 0.85 : 0.65, duration: 0.08 }, 0.1)
            .to(vehicleWrap, {
                x: isMobile ? "8vw" : "12vw",
                rotation: isKart ? 2 : 0.5,
                duration: 0.4,
                ease: "power2.inOut"
            }, 0.12)
            .to(shadow, {
                x: isMobile ? "5vw" : "8vw",
                opacity: 0.75,
                scaleX: 1,
                duration: 0.4,
                ease: "power2.inOut"
            }, 0.12)
            .to(track, { x: "0%", duration: 0.45, ease: "none" }, 0.12)
            .to(streaks, { x: "35%", duration: 0.45, ease: "none" }, 0.12);

        if (isKart) {
            tl.to(vehicleEl, {
                y: -12,
                duration: 0.08,
                repeat: 3,
                yoyo: true,
                ease: "sine.inOut"
            }, 0.2);
        }

        if (isOvertake) {
            tl.to(smoke, { opacity: 0.7, x: "20%", duration: 0.15, ease: "power1.in" }, 0.45)
                .to(fx, { opacity: 0.5, duration: 0.1 }, 0.5)
                .to(vehicleWrap, { x: "18vw", duration: 0.12, ease: "power2.in" }, 0.52);
        }

        tl.to(fx, { opacity: 0.35, duration: 0.08 }, 0.55)
            .to(copy, { opacity: 0, y: -30, duration: 0.12, ease: "power2.in" }, 0.72)
            .to(titleWords, { yPercent: -80, opacity: 0, stagger: 0.008, duration: 0.1 }, 0.74)
            .to(wipe, { yPercent: 0, opacity: 0.45, duration: 0.14, ease: "power2.in" }, 0.78)
            .to(vehicleWrap, { x: "120vw", duration: 0.18, ease: "power2.in" }, 0.8)
            .to(streaks, { opacity: 0, duration: 0.1 }, 0.85);

        return tl;
    }

    function init() {
        if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
            return;
        }

        const sections = document.querySelectorAll(".cinematic-transition");
        sections.forEach((section) => {
            splitTitleLines(section);
            const variant = section.dataset.variant || "pace";
            const vehicle = section.dataset.vehicle || "f1";
            buildTimeline(section, variant, vehicle);
        });
    }

    window.F1MotionTransitions = { init, ASSET };
})();
