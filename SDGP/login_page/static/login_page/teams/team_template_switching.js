(() => {
  const templateButtons = Array.from(
    document.querySelectorAll(".Option_selector[data-template-target]")
  );
  const templateSections = Array.from(
    document.querySelectorAll(".team_template_section[data-team-template]")
  );
  const quickBlocks = Array.from(
    document.querySelectorAll("#Quick_blocks .quick_block_card[data-quick-block]")
  );
  const dependencyButtons = Array.from(
    document.querySelectorAll(".dependency[data-dependency-filter]")
  );
  const dependencyRows = Array.from(
    document.querySelectorAll(".Blocks[data-dependency-direction]")
  );

  const quickBlocksByTemplate = {
    overview: new Set(["1", "2", "3"]),
    links: new Set(["1", "2"]),
    members: new Set(["3"]),
    dependencies: new Set(["1", "2", "3"]),
    settings: new Set()
  };

  function applyQuickBlocks(templateKey) {
    if (quickBlocks.length === 0) return;
    const visibleBlocks = quickBlocksByTemplate[templateKey] ?? quickBlocksByTemplate.overview;

    quickBlocks.forEach((block) => {
      const blockId = block.dataset.quickBlock;
      const isVisible = typeof blockId === "string" && visibleBlocks.has(blockId);
      block.classList.toggle("d-none", !isVisible);
    });
  }

  function setActiveTemplateButton(templateKey) {
    templateButtons.forEach((button) => {
      const isActive = button.dataset.templateTarget === templateKey;
      button.classList.toggle("Option_selector_active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function applyTemplate(templateKey) {
    if (templateSections.length === 0) return;

    templateSections.forEach((section) => {
      const isVisible = section.dataset.teamTemplate === templateKey;
      section.classList.toggle("d-none", !isVisible);
    });

    setActiveTemplateButton(templateKey);
    applyQuickBlocks(templateKey);
  }

  function wireTemplateSwitching() {
    if (templateButtons.length === 0 || templateSections.length === 0) return;

    const availableTemplates = new Set(
      templateSections.map((section) => section.dataset.teamTemplate).filter(Boolean)
    );

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

    const defaultTemplate = availableTemplates.has("overview")
      ? "overview"
      : activeButton?.dataset.templateTarget || fallbackButton?.dataset.templateTarget;
    if (defaultTemplate) applyTemplate(defaultTemplate);
  }

  function applyDependencyFilter(filterKey) {
    if (dependencyRows.length === 0) return;

    dependencyRows.forEach((row) => {
      const direction = (row.dataset.dependencyDirection || "").toLowerCase();
      const isVisible = filterKey === "all" || direction === filterKey;
      row.classList.toggle("d-none", !isVisible);
    });

    dependencyButtons.forEach((button) => {
      const isActive = button.dataset.dependencyFilter === filterKey;
      button.classList.toggle("dependency_active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function wireDependencyFiltering() {
    if (dependencyButtons.length === 0 || dependencyRows.length === 0) return;

    const allowedFilters = new Set(["all", "upstream", "downstream"]);

    dependencyButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const nextFilter = (button.dataset.dependencyFilter || "").toLowerCase();
        if (!allowedFilters.has(nextFilter)) return;
        applyDependencyFilter(nextFilter);
      });
    });

    const activeButton = dependencyButtons.find((button) =>
      button.classList.contains("dependency_active")
    );

    const defaultFilter = (
      activeButton?.dataset.dependencyFilter ||
      dependencyButtons[0].dataset.dependencyFilter ||
      "all"
    ).toLowerCase();

    applyDependencyFilter(allowedFilters.has(defaultFilter) ? defaultFilter : "all");
  }

  wireTemplateSwitching();
  wireDependencyFiltering();
})();
