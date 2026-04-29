(() => {
    "use strict";

    const indicationTemplate = document.getElementById("Indication-Template");
    if (!indicationTemplate) return;

    const DAILY_SLOT_HEIGHT_FALLBACK = 50;
    const LARGE_DISPLAY_SLOT_HEIGHT = 60;
    const FOUR_K_VIEWPORT_WIDTH = 2560;
    const FOUR_K_DISPLAY_WIDTH = 3840;
    const FHD_VISIBLE_SLOT_COUNT = 8;
    const FOUR_K_VISIBLE_SLOT_COUNT = 10;

    function isLargeDisplay(viewportWidth) {
        const screenWidth = window.screen?.width || viewportWidth;
        const devicePixelRatio = window.devicePixelRatio || 1;
        const displayPixelWidth = Math.max(viewportWidth, screenWidth) * devicePixelRatio;

        return viewportWidth >= FOUR_K_VIEWPORT_WIDTH || displayPixelWidth >= FOUR_K_DISPLAY_WIDTH;
    }

    function getVisibleSlotCount(viewportWidth) {
        return isLargeDisplay(viewportWidth)
            ? FOUR_K_VISIBLE_SLOT_COUNT
            : FHD_VISIBLE_SLOT_COUNT;
    }

    function getTargetSlotHeight(viewportWidth) {
        return isLargeDisplay(viewportWidth) ? LARGE_DISPLAY_SLOT_HEIGHT : DAILY_SLOT_HEIGHT_FALLBACK;
    }

    function getDailySlotHeight(fallbackSlotHeight) {
        const dailyLayout = document.querySelector(".schedule_daily_layout");
        if (!dailyLayout) return fallbackSlotHeight;

        const computedStyle = window.getComputedStyle(dailyLayout);
        const cssSlotHeight = Number.parseFloat(computedStyle.getPropertyValue("--slot-height"));
        return cssSlotHeight > 0 ? cssSlotHeight : fallbackSlotHeight;
    }

    function getActiveTemplateKey() {
        const activeButton = document.querySelector(
            ".Option_selector_active[data-template-target]"
        );
        const visibleSection = document.querySelector(
            ".schedule_template_section[data-schedule-template]:not(.d-none)"
        );

        return (
            activeButton?.dataset.templateTarget ||
            visibleSection?.dataset.scheduleTemplate ||
            "daily"
        );
    }

    function applyHeights() {
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
        const visibleSlotCount = getVisibleSlotCount(viewportWidth);
        const targetSlotHeight = getTargetSlotHeight(viewportWidth);
        const dailyLayout = document.querySelector(".schedule_daily_layout");
        if (dailyLayout instanceof HTMLElement) {
            dailyLayout.style.setProperty("--slot-height", `${targetSlotHeight}px`);
        }
        const slotHeight = getDailySlotHeight(targetSlotHeight);
        const templateHeight = Math.round(visibleSlotCount * slotHeight);

        indicationTemplate.dataset.activeScheduleTemplate = getActiveTemplateKey();
        indicationTemplate.dataset.visibleSlots = String(visibleSlotCount);
        indicationTemplate.dataset.slotHeight = String(slotHeight);
        indicationTemplate.style.setProperty("--schedule-visible-slot-count", String(visibleSlotCount));
        indicationTemplate.style.setProperty("--schedule-template-height", `${templateHeight}px`);
        indicationTemplate.style.height = `${templateHeight}px`;
        indicationTemplate.style.maxHeight = `${templateHeight}px`;

        document.dispatchEvent(
            new CustomEvent("schedule:layout-resized", {
                detail: {
                    visibleSlots: visibleSlotCount,
                    slotHeight,
                    templateHeight
                }
            })
        );
    }

    let resizeRaf = 0;
    function scheduleApply() {
        if (resizeRaf) return;
        resizeRaf = window.requestAnimationFrame(() => {
            resizeRaf = 0;
            applyHeights();
        });
    }

    applyHeights();
    window.addEventListener("resize", scheduleApply);
    window.addEventListener("orientationchange", scheduleApply);
    document.addEventListener("schedule:template-changed", scheduleApply);
})();
