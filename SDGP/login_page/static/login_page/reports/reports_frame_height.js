(() => {
    "use strict";

    const outerFrame = document.getElementById("Outer-frame");
    if (!outerFrame) return;

    const BREAKPOINTS = [
        { maxWidth: 720, ratio: 0.682, minPx: 352, maxPx: 572 },
        { maxWidth: 1280, ratio: 0.605, minPx: 396, maxPx: 682 },
        { maxWidth: 1920, ratio: 0.550, minPx: 418, maxPx: 792 },
        { maxWidth: 2560, ratio: 0.528, minPx: 506, maxPx: 968 },
        { maxWidth: Infinity, ratio: 0.484, minPx: 594, maxPx: 1188 }
    ];

    function pickBreakpoint(viewportWidth) {
        for (const breakpoint of BREAKPOINTS) {
            if (viewportWidth <= breakpoint.maxWidth) return breakpoint;
        }
        return BREAKPOINTS[BREAKPOINTS.length - 1];
    }

    function clamp(value, minimum, maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }

    function applyFrameHeight() {
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
        if (!viewportHeight) return;

        const breakpoint = pickBreakpoint(viewportWidth);
        const targetHeight = Math.round(
            clamp(viewportHeight * breakpoint.ratio, breakpoint.minPx, breakpoint.maxPx)
        );
        const maxHeight = Math.round(
            clamp(viewportHeight * (breakpoint.ratio + 0.10), breakpoint.minPx, breakpoint.maxPx + 80)
        );

        outerFrame.style.height = `${targetHeight}px`;
        outerFrame.style.minHeight = `${targetHeight}px`;
        outerFrame.style.maxHeight = `${maxHeight}px`;
    }

    let resizeRaf = 0;
    function scheduleApply() {
        if (resizeRaf) return;
        resizeRaf = window.requestAnimationFrame(() => {
            resizeRaf = 0;
            applyFrameHeight();
        });
    }

    applyFrameHeight();
    window.addEventListener("resize", scheduleApply);
    window.addEventListener("orientationchange", scheduleApply);
})();
