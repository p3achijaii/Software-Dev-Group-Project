(() => {
    const BASE_TEXTAREA_HEIGHT = 30;
    const HEIGHT_NOISE_TOLERANCE = 8;
    const LABEL_SHIFT_STEP = -0.5;
    const EXPAND_TRANSITION = "height 0.14s ease-out, border-color 0.2s ease";
    const COLLAPSE_TRANSITION = "height 0.01s ease-out, border-color 0.2s ease";
    const FIELD_SELECTOR = ".question_form_text input, .question_form_text_long textarea";
    const RESYNC_INTERVAL_MS = 100;
    const trackedFields = new Set();
    let resyncIntervalId = null;

    function getFieldWrapper(field) {
        return field.closest(".question_form_text, .question_form_text_long");
    }

    function syncTextareaLayout(textarea, wrapper) {
        const previousHeight = textarea.getBoundingClientRect().height || BASE_TEXTAREA_HEIGHT;
        textarea.style.height = `${BASE_TEXTAREA_HEIGHT}px`;

        let nextHeight = Math.max(BASE_TEXTAREA_HEIGHT, textarea.scrollHeight);
        const effectiveGrowth = Math.max(0, nextHeight - BASE_TEXTAREA_HEIGHT - HEIGHT_NOISE_TOLERANCE);
        const expandedSteps = Math.max(0, Math.ceil(effectiveGrowth / 22));
        const labelShift = expandedSteps * LABEL_SHIFT_STEP;

        if (expandedSteps === 0) {
            nextHeight = BASE_TEXTAREA_HEIGHT;
        }

        const isCollapsing = nextHeight < previousHeight;
        textarea.style.transition = isCollapsing ? COLLAPSE_TRANSITION : EXPAND_TRANSITION;
        textarea.style.height = `${nextHeight}px`;
        textarea.style.overflowY = "hidden";
        wrapper.style.setProperty("--skills-label-shift", `${labelShift}px`);
        wrapper.classList.toggle("is-expanded", expandedSteps > 0);
    }

    function syncFieldState(field) {
        const wrapper = getFieldWrapper(field);
        if (!wrapper) return;

        const hasValue = field.value.trim().length > 0;
        wrapper.classList.toggle("has-value", hasValue);

        if (field instanceof HTMLTextAreaElement) {
            syncTextareaLayout(field, wrapper);
        }
    }

    function getActiveTemplatePanel() {
        const activeDocPanel = document.querySelector(".report-doc-panel.report-doc-panel-active[aria-hidden='false']");
        if (!activeDocPanel) return null;

        return activeDocPanel.querySelector(
            ".pdf-template-page.pdf-template-page-active[aria-hidden='false'], .excel-template-page.excel-template-page-active[aria-hidden='false']"
        );
    }

    function getActiveTemplateFields() {
        const activeTemplatePanel = getActiveTemplatePanel();
        if (!activeTemplatePanel) return [];
        return Array.from(activeTemplatePanel.querySelectorAll(FIELD_SELECTOR));
    }

    function bindField(field) {
        if (trackedFields.has(field)) return;
        trackedFields.add(field);
        field.addEventListener("input", () => {
            syncFieldState(field);
        });
    }

    function syncActiveTemplateFields() {
        const fields = getActiveTemplateFields();
        if (fields.length === 0) return;

        fields.forEach((field) => {
            syncFieldState(field);
        });
    }

    function bindAllTemplateFields() {
        const fields = Array.from(document.querySelectorAll(FIELD_SELECTOR));
        fields.forEach((field) => {
            bindField(field);
        });
    }

    function startResyncInterval() {
        if (resyncIntervalId !== null) return;
        resyncIntervalId = window.setInterval(() => {
            syncActiveTemplateFields();
        }, RESYNC_INTERVAL_MS);
    }

    function initReportsTextareaAutogrow() {
        bindAllTemplateFields();
        syncActiveTemplateFields();
        startResyncInterval();
    }

    document.addEventListener("DOMContentLoaded", initReportsTextareaAutogrow);
})();
