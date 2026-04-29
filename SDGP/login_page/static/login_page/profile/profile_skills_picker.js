(() => {
    const SKILL_SEPARATOR = " | ";
    const BASE_TEXTAREA_HEIGHT = 30;
    const LABEL_SHIFT_STEP = -2;

    const FEATURE_POOL = [
        "JavaScript",
        "TypeScript",
        "HTML",
        "CSS",
        "React",
        "Node.js",
        "Express.js",
        "SQL",
        "MongoDB",
        "Git/GitHub",
        "REST APIs",
        "Unit Testing",
        "UI/UX Design",
        "Agile/Scrum",
        "Data Analysis",
        "Python",
        "Java",
        "C#",
        "Cloud Platforms",
        "CI/CD"
    ];

    const LEVEL_POOL = [
        "Novice",
        "Learner",
        "Practitioner",
        "Specialist",
        "Master"
    ];

    const STATUS_OPTIONS = [
        "Available",
        "Busy",
        "In Meeting",
        "Working Remotely",
        "On Vacation",
        "Sick Leave",
        "Offline"
    ];

    const TEAM_NAME_OPTIONS = [
        "Development Team",
        "Design Team",
        "QA Team",
        "Product Team",
        "Operations Team"
    ];

    const DEPARTMENT_NAME_OPTIONS = [
        "IT Department",
        "HR Department",
        "Finance Department",
        "Operations Department",
        "Product Department"
    ];

    const DEPARTMENT_HEAD_OPTIONS = [
        "Selim Yilmaz",
        "Aylin Demir",
        "Omar Hassan",
        "Maya Patel",
        "Lucas Brown"
    ];

    function syncFieldWrapperState(field) {
        const fieldWrapper = field.closest(".question_form_text, .question_form_text_long");

        if (!fieldWrapper) {
            return;
        }

        fieldWrapper.classList.toggle("has-value", field.value.trim().length > 0);
    }

    function initFloatingLabels() {
        document.querySelectorAll(".question_form_text input, .question_form_text_long textarea").forEach((field) => {
            syncFieldWrapperState(field);
            field.addEventListener("input", () => syncFieldWrapperState(field));
            field.addEventListener("blur", () => syncFieldWrapperState(field));
            field.addEventListener("change", () => syncFieldWrapperState(field));
        });
    }

    function initMemberSkillsPicker() {
        const input = document.getElementById("member-skills-input");
        const popup = document.getElementById("member-skills-popup");
        const inputFieldWrapper = input ? input.closest(".question_form_text_long, .question_form_text") : null;

        if (!input || !popup) {
            console.warn("Member skills picker: required hooks are missing.");
            return;
        }

        const state = {
            isOpen: false,
            activeStep: "features",
            selectedFeature: null
        };

        function syncAriaState() {
            input.setAttribute("aria-expanded", String(state.isOpen));
            popup.setAttribute("aria-hidden", state.isOpen ? "false" : "true");
        }

        function dispatchInputEvents() {
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
        }

        function syncInputVisualState() {
            if (!inputFieldWrapper) {
                return;
            }

            const hasValue = input.value.trim().length > 0;
            inputFieldWrapper.classList.toggle("has-value", hasValue);
            syncTextareaLayout();
        }

        function parseSkillEntries(rawValue) {
            return rawValue
                .split(/\s*(?:,|\|)\s*/)
                .map((entry) => entry.trim())
                .filter(Boolean);
        }

        function syncTextareaLayout() {
            if (!(input instanceof HTMLTextAreaElement) || !inputFieldWrapper) {
                return;
            }

            input.style.height = `${BASE_TEXTAREA_HEIGHT}px`;
            const nextHeight = Math.max(BASE_TEXTAREA_HEIGHT, input.scrollHeight);
            const expandedSteps = Math.max(0, Math.ceil((nextHeight - BASE_TEXTAREA_HEIGHT) / 22));
            const labelShift = expandedSteps * LABEL_SHIFT_STEP;

            input.style.height = `${nextHeight}px`;
            inputFieldWrapper.style.setProperty("--skills-label-shift", `${labelShift}px`);
            inputFieldWrapper.classList.toggle("is-expanded", expandedSteps > 0);
        }

        function upsertSkillEntry(feature, level) {
            const nextEntry = `${feature} - ${level}`;
            const entries = parseSkillEntries(input.value);
            const featurePrefix = `${feature} - `;
            const existingIndex = entries.findIndex((entry) => entry.startsWith(featurePrefix));

            if (existingIndex >= 0) {
                entries[existingIndex] = nextEntry;
            } else {
                entries.push(nextEntry);
            }

            input.value = entries.join(SKILL_SEPARATOR);
        }

        function createActionButton(text, onClick) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "member_skills_action_btn";
            button.textContent = text;
            button.addEventListener("click", onClick);
            return button;
        }

        function createHeader(title, options = {}) {
            const { showBack = false, showClear = false } = options;
            const header = document.createElement("div");
            header.className = "member_skills_header";

            const heading = document.createElement("p");
            heading.className = "member_skills_title";
            heading.textContent = title;

            const actions = document.createElement("div");
            actions.className = "member_skills_actions";

            if (showBack) {
                actions.appendChild(createActionButton("Back", () => {
                    renderFeatureList();
                }));
            }

            if (showClear) {
                actions.appendChild(createActionButton("Clear", () => {
                    input.value = "";
                    syncInputVisualState();
                    dispatchInputEvents();
                    closePopup();
                }));
            }

            header.appendChild(heading);
            header.appendChild(actions);
            return header;
        }

        function resetToFeatureStep() {
            state.activeStep = "features";
            state.selectedFeature = null;
        }

        function applySelection(feature, level) {
            upsertSkillEntry(feature, level);
            syncInputVisualState();
            dispatchInputEvents();
            closePopup();
        }

        function renderFeatureList() {
            state.activeStep = "features";
            state.selectedFeature = null;
            popup.innerHTML = "";

            const header = createHeader("Choose a feature to add", {
                showClear: Boolean(input.value.trim())
            });

            const list = document.createElement("ul");
            list.className = "member_skills_list";

            FEATURE_POOL.forEach((feature) => {
                const item = document.createElement("li");
                const button = document.createElement("button");
                button.type = "button";
                button.className = "member_skills_option";
                button.textContent = feature;
                button.addEventListener("click", () => {
                    renderLevelList(feature);
                });

                item.appendChild(button);
                list.appendChild(item);
            });

            popup.appendChild(header);
            popup.appendChild(list);
        }

        function renderLevelList(feature) {
            state.activeStep = "levels";
            state.selectedFeature = feature;
            popup.innerHTML = "";

            const header = createHeader(`Choose level for ${feature}`, {
                showBack: true,
                showClear: Boolean(input.value.trim())
            });

            const list = document.createElement("ul");
            list.className = "member_skills_list";

            LEVEL_POOL.forEach((level) => {
                const item = document.createElement("li");
                const button = document.createElement("button");
                button.type = "button";
                button.className = "member_skills_option";
                button.textContent = level;
                button.addEventListener("click", () => {
                    applySelection(feature, level);
                });

                item.appendChild(button);
                list.appendChild(item);
            });

            popup.appendChild(header);
            popup.appendChild(list);
        }

        function openPopup() {
            if (state.isOpen) {
                return;
            }

            state.isOpen = true;
            popup.classList.add("is-open");
            resetToFeatureStep();
            renderFeatureList();
            syncAriaState();
        }

        function closePopup() {
            if (!state.isOpen) {
                return;
            }

            state.isOpen = false;
            popup.classList.remove("is-open");
            popup.innerHTML = "";
            resetToFeatureStep();
            syncAriaState();
        }

        function bindGlobalCloseHandlers() {
            document.addEventListener("mousedown", (event) => {
                if (!state.isOpen) {
                    return;
                }

                const target = event.target;
                if (!(target instanceof Node)) {
                    return;
                }

                if (popup.contains(target) || input.contains(target)) {
                    return;
                }

                closePopup();
            });

            document.addEventListener("keydown", (event) => {
                if (event.key !== "Escape" || !state.isOpen) {
                    return;
                }

                closePopup();
                input.blur();
            });
        }

        input.addEventListener("click", () => {
            openPopup();
        });

        input.addEventListener("focus", () => {
            openPopup();
        });

        input.addEventListener("input", () => {
            syncInputVisualState();
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                event.preventDefault();
                openPopup();
            }
        });

        bindGlobalCloseHandlers();
        syncInputVisualState();
        syncAriaState();
    }

    function initStatusPicker() {
        const statusInput = document.querySelector("input.status");
        if (!statusInput) {
            return;
        }

        const statusFieldWrapper = statusInput.closest(".question_form_text, .question_form_text_long");
        if (!statusFieldWrapper) {
            return;
        }

        let statusPopup = statusFieldWrapper.querySelector("#status-popup");
        if (!statusPopup) {
            statusPopup = document.createElement("div");
            statusPopup.id = "status-popup";
            statusPopup.className = "member_skills_popup status_popup";
            statusPopup.setAttribute("role", "dialog");
            statusPopup.setAttribute("aria-hidden", "true");
            statusFieldWrapper.appendChild(statusPopup);
        }

        const statusState = {
            isOpen: false
        };

        statusInput.setAttribute("readonly", "readonly");
        statusInput.setAttribute("autocomplete", "off");
        statusInput.setAttribute("aria-haspopup", "dialog");
        statusInput.setAttribute("aria-expanded", "false");

        function syncStatusVisualState() {
            const hasValue = statusInput.value.trim().length > 0;
            statusFieldWrapper.classList.toggle("has-value", hasValue);
        }

        function syncStatusAriaState() {
            statusInput.setAttribute("aria-expanded", String(statusState.isOpen));
            statusPopup.setAttribute("aria-hidden", statusState.isOpen ? "false" : "true");
        }

        function dispatchStatusEvents() {
            statusInput.dispatchEvent(new Event("input", { bubbles: true }));
            statusInput.dispatchEvent(new Event("change", { bubbles: true }));
        }

        function renderStatusList() {
            statusPopup.innerHTML = "";

            const title = document.createElement("p");
            title.className = "member_skills_title status_title";
            title.textContent = "Choose status";

            const list = document.createElement("ul");
            list.className = "member_skills_list status_list";

            STATUS_OPTIONS.forEach((statusOption) => {
                const item = document.createElement("li");
                const button = document.createElement("button");
                button.type = "button";
                button.className = "member_skills_option status_option";
                button.textContent = statusOption;

                if (statusInput.value.trim() === statusOption) {
                    button.classList.add("is-active");
                }

                button.addEventListener("click", () => {
                    statusInput.value = statusOption;
                    syncStatusVisualState();
                    dispatchStatusEvents();
                    closeStatusPopup();
                });

                item.appendChild(button);
                list.appendChild(item);
            });

            statusPopup.appendChild(title);
            statusPopup.appendChild(list);
        }

        function openStatusPopup() {
            if (statusState.isOpen) {
                return;
            }

            statusState.isOpen = true;
            renderStatusList();
            statusPopup.classList.add("is-open");
            syncStatusAriaState();
        }

        function closeStatusPopup() {
            if (!statusState.isOpen) {
                return;
            }

            statusState.isOpen = false;
            statusPopup.classList.remove("is-open");
            statusPopup.innerHTML = "";
            syncStatusAriaState();
        }

        statusInput.addEventListener("click", () => {
            openStatusPopup();
        });

        statusInput.addEventListener("focus", () => {
            openStatusPopup();
        });

        statusInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
                event.preventDefault();
                openStatusPopup();
            }
        });

        statusInput.addEventListener("input", () => {
            syncStatusVisualState();
        });

        document.addEventListener("mousedown", (event) => {
            if (!statusState.isOpen) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Node)) {
                return;
            }

            if (statusPopup.contains(target) || statusInput.contains(target)) {
                return;
            }

            closeStatusPopup();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape" || !statusState.isOpen) {
                return;
            }

            closeStatusPopup();
            statusInput.blur();
        });

        syncStatusVisualState();
        syncStatusAriaState();
    }

    function buildUniqueOptions(options) {
        const seen = new Set();

        return options.filter((option) => {
            const normalizedOption = option.trim();
            if (!normalizedOption) {
                return false;
            }

            const lookupKey = normalizedOption.toLowerCase();
            if (seen.has(lookupKey)) {
                return false;
            }

            seen.add(lookupKey);
            return true;
        });
    }

    function initSearchablePopupField(fieldId, popupTitle, baseOptions) {
        const fieldInput = document.getElementById(fieldId);
        if (!fieldInput) {
            return;
        }

        const fieldWrapper = fieldInput.closest(".question_form_text, .question_form_text_long");
        if (!fieldWrapper) {
            return;
        }

        const popupId = `${fieldId}-popup`;
        let fieldPopup = fieldWrapper.querySelector(`#${popupId}`);
        if (!fieldPopup) {
            fieldPopup = document.createElement("div");
            fieldPopup.id = popupId;
            fieldPopup.className = "member_skills_popup status_popup";
            fieldPopup.setAttribute("role", "dialog");
            fieldPopup.setAttribute("aria-hidden", "true");
            fieldWrapper.appendChild(fieldPopup);
        }

        const fieldState = {
            isOpen: false
        };

        fieldInput.removeAttribute("readonly");
        fieldInput.setAttribute("autocomplete", "off");
        fieldInput.setAttribute("aria-haspopup", "dialog");
        fieldInput.setAttribute("aria-autocomplete", "list");
        fieldInput.setAttribute("aria-expanded", "false");

        function syncFieldVisualState() {
            const hasValue = fieldInput.value.trim().length > 0;
            fieldWrapper.classList.toggle("has-value", hasValue);
        }

        function syncFieldAriaState() {
            fieldInput.setAttribute("aria-expanded", String(fieldState.isOpen));
            fieldPopup.setAttribute("aria-hidden", fieldState.isOpen ? "false" : "true");
        }

        function dispatchFieldEvents() {
            fieldInput.dispatchEvent(new Event("input", { bubbles: true }));
            fieldInput.dispatchEvent(new Event("change", { bubbles: true }));
        }

        function getFilteredOptions() {
            const currentValue = fieldInput.value.trim();
            const searchableOptions = buildUniqueOptions([...baseOptions, currentValue]);
            const query = currentValue.toLowerCase();

            if (!query) {
                return searchableOptions;
            }

            return searchableOptions.filter((option) => option.toLowerCase().includes(query));
        }

        function renderFieldList() {
            fieldPopup.innerHTML = "";

            const title = document.createElement("p");
            title.className = "member_skills_title status_title";
            title.textContent = `Choose ${popupTitle}`;

            const list = document.createElement("ul");
            list.className = "member_skills_list status_list";

            const filteredOptions = getFilteredOptions();

            if (filteredOptions.length === 0) {
                const item = document.createElement("li");
                const button = document.createElement("button");
                button.type = "button";
                button.className = "member_skills_option status_option is-empty";
                button.disabled = true;
                button.textContent = "No matches";
                item.appendChild(button);
                list.appendChild(item);
            } else {
                filteredOptions.forEach((option) => {
                    const item = document.createElement("li");
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "member_skills_option status_option";
                    button.textContent = option;

                    if (fieldInput.value.trim().toLowerCase() === option.toLowerCase()) {
                        button.classList.add("is-active");
                    }

                    button.addEventListener("click", () => {
                        fieldInput.value = option;
                        syncFieldVisualState();
                        dispatchFieldEvents();
                        closeFieldPopup();
                    });

                    item.appendChild(button);
                    list.appendChild(item);
                });
            }

            fieldPopup.appendChild(title);
            fieldPopup.appendChild(list);
        }

        function openFieldPopup() {
            if (fieldState.isOpen) {
                return;
            }

            fieldState.isOpen = true;
            renderFieldList();
            fieldPopup.classList.add("is-open");
            syncFieldAriaState();
        }

        function closeFieldPopup() {
            if (!fieldState.isOpen) {
                return;
            }

            fieldState.isOpen = false;
            fieldPopup.classList.remove("is-open");
            fieldPopup.innerHTML = "";
            syncFieldAriaState();
        }

        fieldInput.addEventListener("click", () => {
            openFieldPopup();
        });

        fieldInput.addEventListener("focus", () => {
            openFieldPopup();
        });

        fieldInput.addEventListener("input", () => {
            syncFieldVisualState();
            if (!fieldState.isOpen) {
                return;
            }

            renderFieldList();
        });

        fieldInput.addEventListener("keydown", (event) => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                openFieldPopup();
                return;
            }

            if (event.key === "Escape" && fieldState.isOpen) {
                closeFieldPopup();
                fieldInput.blur();
            }
        });

        document.addEventListener("mousedown", (event) => {
            if (!fieldState.isOpen) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Node)) {
                return;
            }

            if (fieldPopup.contains(target) || fieldInput.contains(target)) {
                return;
            }

            closeFieldPopup();
        });

        document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape" || !fieldState.isOpen) {
                return;
            }

            closeFieldPopup();
            fieldInput.blur();
        });

        syncFieldVisualState();
        syncFieldAriaState();
    }

    function initSearchablePopupFields() {
        [
            {
                ids: ["team-name", "account-team-name"],
                title: "team name",
                options: TEAM_NAME_OPTIONS
            },
            {
                ids: ["department-name", "account-department-name"],
                title: "department name",
                options: DEPARTMENT_NAME_OPTIONS
            },
            {
                ids: ["department-head", "account-department-head"],
                title: "department head",
                options: DEPARTMENT_HEAD_OPTIONS
            }
        ].forEach((fieldConfig) => {
            fieldConfig.ids.forEach((fieldId) => {
                initSearchablePopupField(fieldId, fieldConfig.title, fieldConfig.options);
            });
        });
    }

    function initProfileCreationMode() {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = (urlParams.get("mode") || "").trim().toLowerCase();
        if (mode !== "new") {
            return;
        }

        const heading = document.querySelector(".Naming");
        if (heading) {
            heading.textContent = "Add Profile";
        }

        const saveButton = document.querySelector(".btn_Save");
        if (saveButton) {
            saveButton.textContent = "Create Profile";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            initProfileCreationMode();
            initFloatingLabels();
            initMemberSkillsPicker();
            initStatusPicker();
            initSearchablePopupFields();
        });
    } else {
        initProfileCreationMode();
        initFloatingLabels();
        initMemberSkillsPicker();
        initStatusPicker();
        initSearchablePopupFields();
    }
})();
