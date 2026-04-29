(() => {
  const BASE_TEXTAREA_HEIGHT = 30;
  const HEIGHT_NOISE_TOLERANCE = 8;
  const LABEL_SHIFT_STEP = -0.5;
  const EXPAND_TRANSITION = "height 0.14s ease-out, border-color 0.2s ease";
  const COLLAPSE_TRANSITION = "height 0.03s ease-out, border-color 0.2s ease";
  const FIELD_SELECTOR =
    ".question_form_text input, .question_form_text_long textarea:not([data-team-popup-input])";

  function getFieldWrapper(field) {
    return field.closest(".question_form_text, .question_form_text_long");
  }

  function scrollFieldIntoComfortView(field) {
    window.requestAnimationFrame(() => {
      const wrapper = getFieldWrapper(field) || field;
      const fieldBounds = wrapper.getBoundingClientRect();
      const bottomComfortLine = window.innerHeight - 48;

      if (fieldBounds.bottom <= bottomComfortLine) return;

      window.scrollBy({
        top: fieldBounds.bottom - bottomComfortLine,
        behavior: "smooth"
      });
    });
  }

  function syncTextareaLayout(textarea, wrapper) {
    const previousHeight = textarea.getBoundingClientRect().height || BASE_TEXTAREA_HEIGHT;
    textarea.style.height = `${BASE_TEXTAREA_HEIGHT}px`;

    let nextHeight = Math.max(BASE_TEXTAREA_HEIGHT, textarea.scrollHeight);
    const effectiveGrowth = Math.max(
      0,
      nextHeight - BASE_TEXTAREA_HEIGHT - HEIGHT_NOISE_TOLERANCE
    );
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
      if (document.activeElement === field) {
        scrollFieldIntoComfortView(field);
      }
    }
  }

  function initTeamTextareaAutogrow() {
    const fields = Array.from(document.querySelectorAll(FIELD_SELECTOR));

    fields.forEach((field) => {
      field.addEventListener("input", () => {
        syncFieldState(field);
      });

      field.addEventListener("change", () => {
        syncFieldState(field);
      });

      field.addEventListener("focus", () => {
        syncFieldState(field);
        if (field instanceof HTMLTextAreaElement) {
          scrollFieldIntoComfortView(field);
        }
      });

      syncFieldState(field);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTeamTextareaAutogrow);
  } else {
    initTeamTextareaAutogrow();
  }
})();
