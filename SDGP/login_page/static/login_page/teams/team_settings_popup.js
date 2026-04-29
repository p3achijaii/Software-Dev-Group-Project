(() => {
  const FIELD_SEPARATOR = " | ";
  const BASE_TEXTAREA_HEIGHT = 30;
  const LABEL_SHIFT_STEP = -2;
  const MAX_ITEMS_PER_FIELD = Number.POSITIVE_INFINITY;

  const PICKER_CONFIG = {
    key_skills: {
      title: "Key skills & Technologies",
      options: [
        "JavaScript",
        "TypeScript",
        "HTML",
        "CSS",
        "React",
        "Vue.js",
        "Node.js",
        "Express.js",
        "REST APIs",
        "GraphQL",
        "SQL",
        "MongoDB",
        "PostgreSQL",
        "Git/GitHub",
        "Unit Testing",
        "Docker",
        "CI/CD",
        "AWS",
        "Azure",
        "Security Engineering"
      ]
    },
    focus_areas: {
      title: "Development Focus Areas",
      options: [
        "Frontend Architecture",
        "Backend Services",
        "API Design",
        "System Integration",
        "Performance Optimization",
        "Reliability",
        "Observability",
        "Automation",
        "Quality Assurance",
        "Release Management",
        "Technical Documentation",
        "Security Hardening",
        "Accessibility",
        "Data Modeling",
        "Developer Experience",
        "Refactoring",
        "Legacy Modernization",
        "Incident Response",
        "Platform Engineering",
        "Scalability"
      ]
    }
  };

  const LOCKED_SINGLE_FIELDS = new Set([
    "department_name",
    "department_head",
    "team_name",
    "team_lead"
  ]);

  const ACCESS_LOCKED_MESSAGE =
    "You do not have access to make those changes, please contact an admin.";
  const LOCKED_POPUP_AUTO_HIDE_MS = 1000;

  function parseEntries(rawValue) {
    return rawValue
      .split(/\s*(?:,|\|)\s*/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function scrollPickerIntoComfortView(wrapper, popup) {
    window.requestAnimationFrame(() => {
      const wrapperBounds = wrapper.getBoundingClientRect();
      const popupBounds = popup.getBoundingClientRect();
      const bottomComfortLine = window.innerHeight - 48;
      const visibleBottom = Math.max(wrapperBounds.bottom, popupBounds.bottom);

      if (visibleBottom <= bottomComfortLine) return;

      window.scrollBy({
        top: visibleBottom - bottomComfortLine,
        behavior: "smooth"
      });
    });
  }

  function initTeamSettingsPickers() {
    const pickerWrappers = Array.from(
      document.querySelectorAll(".team_picker_field[data-team-picker-field]")
    );

    if (pickerWrappers.length === 0) return;

    const pickerInstances = [];

    function closeAllPopups(exceptFieldKey = null) {
      pickerInstances.forEach((instance) => {
        if (instance.fieldKey === exceptFieldKey) return;
        instance.closePopup();
      });
    }

    function createActionButton(text, onClick) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "member_skills_action_btn";
      button.textContent = text;
      button.addEventListener("click", onClick);
      return button;
    }

    pickerWrappers.forEach((wrapper) => {
      const fieldKey = wrapper.dataset.teamPickerField || "";
      const fieldConfig = PICKER_CONFIG[fieldKey];
      if (!fieldConfig) return;

      const input = wrapper.querySelector(
        `textarea[data-team-popup-input="${fieldKey}"]`
      );
      const popup = wrapper.querySelector(
        `.member_skills_popup[data-team-popup="${fieldKey}"]`
      );

      if (!input || !popup) return;

      const state = {
        isOpen: false,
        selectedOptions: parseEntries(input.value)
      };

      function syncAriaState() {
        input.setAttribute("aria-expanded", String(state.isOpen));
        popup.setAttribute("aria-hidden", state.isOpen ? "false" : "true");
      }

      function dispatchInputEvents() {
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }

      function syncTextareaLayout() {
        if (!(input instanceof HTMLTextAreaElement)) return;

        input.style.height = `${BASE_TEXTAREA_HEIGHT}px`;
        const nextHeight = Math.max(BASE_TEXTAREA_HEIGHT, input.scrollHeight);
        const expandedSteps = Math.max(
          0,
          Math.ceil((nextHeight - BASE_TEXTAREA_HEIGHT) / 22)
        );
        const labelShift = expandedSteps * LABEL_SHIFT_STEP;

        input.style.height = `${nextHeight}px`;
        wrapper.style.setProperty("--skills-label-shift", `${labelShift}px`);
        wrapper.classList.toggle("is-expanded", expandedSteps > 0);
      }

      function syncInputVisualState() {
        const hasValue = input.value.trim().length > 0;
        wrapper.classList.toggle("has-value", hasValue);
        syncTextareaLayout();
      }

      function normalizeSelectedOptions() {
        const allowedOptions = new Set(fieldConfig.options);
        state.selectedOptions = state.selectedOptions
          .filter((entry) => allowedOptions.has(entry))
          .slice(0, MAX_ITEMS_PER_FIELD);
      }

      function persistSelections(updateEvents = true) {
        input.value = state.selectedOptions.join(FIELD_SEPARATOR);
        syncInputVisualState();
        if (updateEvents) dispatchInputEvents();
      }

      function toggleSelection(optionValue) {
        const existingIndex = state.selectedOptions.indexOf(optionValue);

        if (existingIndex >= 0) {
          state.selectedOptions.splice(existingIndex, 1);
          persistSelections();
          renderPopup();
          return;
        }

        if (state.selectedOptions.length >= MAX_ITEMS_PER_FIELD) return;

        state.selectedOptions.push(optionValue);
        persistSelections();
        renderPopup();
      }

      function renderPopup() {
        popup.innerHTML = "";

        const header = document.createElement("div");
        header.className = "member_skills_header";

        const title = document.createElement("p");
        title.className = "member_skills_title";
        title.textContent = Number.isFinite(MAX_ITEMS_PER_FIELD)
          ? `${fieldConfig.title} (${state.selectedOptions.length}/${MAX_ITEMS_PER_FIELD})`
          : `${fieldConfig.title} (${state.selectedOptions.length})`;

        const actions = document.createElement("div");
        actions.className = "member_skills_actions";

        if (state.selectedOptions.length > 0) {
          actions.appendChild(
            createActionButton("Clear", () => {
              state.selectedOptions = [];
              persistSelections();
              renderPopup();
            })
          );
        }

        actions.appendChild(
          createActionButton("Close", () => {
            closePopup();
          })
        );

        header.appendChild(title);
        header.appendChild(actions);
        popup.appendChild(header);

        const list = document.createElement("ul");
        list.className = "member_skills_list";

        fieldConfig.options.forEach((optionValue) => {
          const item = document.createElement("li");
          const button = document.createElement("button");
          const isSelected = state.selectedOptions.includes(optionValue);
          const isDisabled =
            !isSelected && state.selectedOptions.length >= MAX_ITEMS_PER_FIELD;

          button.type = "button";
          button.className = "member_skills_option";
          button.textContent = optionValue;

          if (isSelected) button.classList.add("is-selected");
          if (isDisabled) button.classList.add("is-disabled");

          button.addEventListener("click", () => {
            if (isDisabled) return;
            toggleSelection(optionValue);
          });

          item.appendChild(button);
          list.appendChild(item);
        });

        popup.appendChild(list);

        const hint = document.createElement("p");
        hint.className = "member_skills_limit_hint";
        hint.textContent = Number.isFinite(MAX_ITEMS_PER_FIELD)
          ? `Select up to ${MAX_ITEMS_PER_FIELD} items. Click a selected item to remove it.`
          : "Click a selected item to remove it.";
        popup.appendChild(hint);
      }

      function openPopup() {
        if (state.isOpen) return;

        closeAllPopups(fieldKey);
        state.isOpen = true;
        renderPopup();
        popup.classList.add("is-open");
        syncAriaState();
        scrollPickerIntoComfortView(wrapper, popup);
      }

      function closePopup() {
        if (!state.isOpen) return;

        state.isOpen = false;
        popup.classList.remove("is-open");
        popup.innerHTML = "";
        syncAriaState();
      }

      function containsTarget(target) {
        return popup.contains(target) || input.contains(target);
      }

      input.addEventListener("click", () => {
        openPopup();
      });

      input.addEventListener("focus", () => {
        openPopup();
      });

      input.addEventListener("keydown", (event) => {
        if (
          event.key === "Enter" ||
          event.key === " " ||
          event.key === "ArrowDown"
        ) {
          event.preventDefault();
          openPopup();
        }
      });

      input.addEventListener("input", () => {
        syncInputVisualState();
      });

      normalizeSelectedOptions();
      persistSelections(false);
      syncAriaState();

      pickerInstances.push({
        fieldKey,
        closePopup,
        containsTarget
      });
    });

    document.addEventListener("mousedown", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const clickedInsideAnyPicker = pickerInstances.some((instance) =>
        instance.containsTarget(target)
      );

      if (!clickedInsideAnyPicker) closeAllPopups();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeAllPopups();
    });
  }

  function initTeamSingleFieldPickers() {
    const singleFieldWrappers = Array.from(
      document.querySelectorAll(".team_single_picker_field[data-team-single-field]")
    );

    if (singleFieldWrappers.length === 0) return;

    const singleFieldInstances = [];

    function closeAllSinglePopups(exceptFieldKey = null) {
      singleFieldInstances.forEach((instance) => {
        if (instance.fieldKey === exceptFieldKey) return;
        instance.closePopup();
      });
    }

    singleFieldWrappers.forEach((wrapper) => {
      const fieldKey = wrapper.dataset.teamSingleField || "";
      if (!LOCKED_SINGLE_FIELDS.has(fieldKey)) return;

      const input = wrapper.querySelector(
        `input[data-team-single-input="${fieldKey}"]`
      );
      const popup = wrapper.querySelector(
        `.member_skills_popup[data-team-single-popup="${fieldKey}"]`
      );

      if (!input || !popup) return;

      const state = {
        isOpen: false,
        hideTimer: null
      };

      input.setAttribute("readonly", "readonly");
      input.setAttribute("autocomplete", "off");

      function syncAriaState() {
        input.setAttribute("aria-expanded", String(state.isOpen));
        popup.setAttribute("aria-hidden", state.isOpen ? "false" : "true");
      }

      function syncInputVisualState() {
        const hasValue = input.value.trim().length > 0;
        wrapper.classList.toggle("has-value", hasValue);
      }

      function renderPopup() {
        popup.innerHTML = "";

        const message = document.createElement("p");
        message.className = "team_access_locked_message";
        message.textContent = ACCESS_LOCKED_MESSAGE;
        popup.appendChild(message);
      }

      function scheduleAutoClose() {
        if (state.hideTimer) {
          clearTimeout(state.hideTimer);
        }

        state.hideTimer = setTimeout(() => {
          closePopup();
        }, LOCKED_POPUP_AUTO_HIDE_MS);
      }

      function openPopup() {
        if (state.isOpen) {
          scheduleAutoClose();
          return;
        }

        closeAllSinglePopups(fieldKey);
        state.isOpen = true;
        renderPopup();
        popup.classList.add("is-open");
        syncAriaState();
        scrollPickerIntoComfortView(wrapper, popup);
        scheduleAutoClose();
      }

      function closePopup() {
        if (state.hideTimer) {
          clearTimeout(state.hideTimer);
          state.hideTimer = null;
        }

        if (!state.isOpen) return;

        state.isOpen = false;
        popup.classList.remove("is-open");
        popup.innerHTML = "";
        syncAriaState();
      }

      function containsTarget(target) {
        return popup.contains(target) || input.contains(target);
      }

      input.addEventListener("click", () => {
        openPopup();
      });

      input.addEventListener("focus", () => {
        openPopup();
      });

      input.addEventListener("keydown", (event) => {
        if (
          event.key === "Enter" ||
          event.key === " " ||
          event.key === "ArrowDown"
        ) {
          event.preventDefault();
          openPopup();
        }
      });

      input.addEventListener("input", () => {
        syncInputVisualState();
      });

      syncInputVisualState();
      syncAriaState();

      singleFieldInstances.push({
        fieldKey,
        closePopup,
        containsTarget
      });
    });

    document.addEventListener("mousedown", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      const clickedInsideAnyPopup = singleFieldInstances.some((instance) =>
        instance.containsTarget(target)
      );

      if (!clickedInsideAnyPopup) closeAllSinglePopups();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeAllSinglePopups();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initTeamSettingsPickers();
      initTeamSingleFieldPickers();
    });
  } else {
    initTeamSettingsPickers();
    initTeamSingleFieldPickers();
  }
})();
