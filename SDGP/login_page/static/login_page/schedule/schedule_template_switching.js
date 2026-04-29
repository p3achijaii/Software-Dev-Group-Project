(() => {
  const templateButtons = Array.from(
    document.querySelectorAll(".Option_selector[data-template-target]")
  );
  const templateSections = Array.from(
    document.querySelectorAll(".schedule_template_section[data-schedule-template]")
  );
  const indicationTemplate = document.getElementById("Indication-Template");

  if (templateButtons.length === 0 || templateSections.length === 0) return;

  const availableTemplates = new Set(
    templateSections.map((section) => section.dataset.scheduleTemplate).filter(Boolean)
  );

  function applyTemplate(templateKey) {
    if (indicationTemplate) {
      indicationTemplate.dataset.activeScheduleTemplate = templateKey;
    }

    templateSections.forEach((section) => {
      const isVisible = section.dataset.scheduleTemplate === templateKey;
      section.classList.toggle("d-none", !isVisible);
    });

    templateButtons.forEach((button) => {
      const isActive = button.dataset.templateTarget === templateKey;
      button.classList.toggle("Option_selector_active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    document.dispatchEvent(
      new CustomEvent("schedule:template-changed", {
        detail: {
          template: templateKey
        }
      })
    );
  }

  templateButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTemplate = button.dataset.templateTarget;
      if (!targetTemplate || !availableTemplates.has(targetTemplate)) return;
      applyTemplate(targetTemplate);
    });
  });

  const activeButton = templateButtons.find(
    (button) =>
      button.classList.contains("Option_selector_active") &&
      availableTemplates.has(button.dataset.templateTarget || "")
  );
  const fallbackButton = templateButtons.find((button) =>
    availableTemplates.has(button.dataset.templateTarget || "")
  );

  const defaultTemplate = availableTemplates.has("daily")
    ? "daily"
    : activeButton?.dataset.templateTarget || fallbackButton?.dataset.templateTarget;

  if (defaultTemplate) {
    applyTemplate(defaultTemplate);
  }
})();
