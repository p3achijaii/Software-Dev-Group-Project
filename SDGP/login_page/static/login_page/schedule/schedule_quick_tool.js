(() => {
  const trigger = document.getElementById("schedule-quick-tool-trigger");
  const popup = document.getElementById("schedule-quick-tool-popup");
  const feedbackPopup = document.getElementById("schedule-event-feedback-popup");

  const dateInput = document.getElementById("schedule-event-date");
  const startTimeInput = document.getElementById("schedule-event-start-time");
  const endTimeInput = document.getElementById("schedule-event-end-time");
  const platformInput = document.getElementById("schedule-platform-input");
  const inviteMembersInput = document.getElementById("schedule-invite-members");
  const mainDateInput =
    document.getElementById("schedule-main-date") ||
    document.querySelector('input[name="Desirable_day"]');

  const platformPopup = document.getElementById("schedule-platform-popup");
  const platformCloseButton = document.getElementById("schedule-platform-popup-close");
  const platformButtons = Array.from(
    document.querySelectorAll(".quick_tool_platform_option[data-platform-option]")
  );

  const colorButtons = Array.from(
    document.querySelectorAll(".quick_tool_color_chip[data-event-color]")
  );
  const colorPreview = document.getElementById("schedule-event-color-preview");
  const colorValueInput = document.getElementById("schedule-event-color");

  const dailyTrack = document.querySelector('[data-schedule-template="daily"] .day_track');

  if (
    !trigger ||
    !popup ||
    !dateInput ||
    !startTimeInput ||
    !endTimeInput ||
    !platformInput ||
    !inviteMembersInput ||
    !platformPopup ||
    platformButtons.length === 0 ||
    colorButtons.length === 0 ||
    !colorPreview ||
    !colorValueInput ||
    !dailyTrack
  ) {
    console.warn("Schedule quick tool: required HTML hooks are missing.");
    return;
  }

  const DAY_START_MINUTES = 7 * 60;
  const SLOT_MINUTES = 60;
  const DEFAULT_COLOR_FALLBACK = "rgba(37, 99, 235, 1)";
  const CONFIRMATION_TIMEOUT_MS = 5000;
  const EVENT_CREATE_URL = readJsonScriptContent("schedule-event-create-url", "");
  const EVENT_UPDATE_URL_TEMPLATE = readJsonScriptContent(
    "schedule-event-update-url-template",
    ""
  );
  const CSRF_TOKEN = readJsonScriptContent("schedule-csrf-token", "");

  let isMainPopupOpen = false;
  let isPlatformPopupOpen = false;
  let isSavingEvent = false;
  let feedbackTimer = null;
  let editingEventId = null;

  function readJsonScriptContent(elementId, fallbackValue) {
    const scriptElement = document.getElementById(elementId);
    if (!scriptElement) return fallbackValue;

    try {
      const parsedValue = JSON.parse(scriptElement.textContent || "null");
      return parsedValue === null ? fallbackValue : parsedValue;
    } catch (error) {
      console.warn("Schedule: failed to read JSON config.", error);
      return fallbackValue;
    }
  }

  function dispatchInputEvents(inputElement) {
    inputElement.dispatchEvent(new Event("input", { bubbles: true }));
    inputElement.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function syncMainPopupAria() {
    trigger.setAttribute("aria-expanded", String(isMainPopupOpen));
    popup.setAttribute("aria-hidden", isMainPopupOpen ? "false" : "true");
  }

  function syncPlatformPopupAria() {
    platformInput.setAttribute("aria-expanded", String(isPlatformPopupOpen));
    platformPopup.setAttribute("aria-hidden", isPlatformPopupOpen ? "false" : "true");
  }

  function hideFeedbackPopup() {
    if (!feedbackPopup) return;
    feedbackPopup.classList.remove("is-open");
    feedbackPopup.setAttribute("aria-hidden", "true");
  }

  function showFeedbackPopup(message = "An event has been scheduled") {
    if (!feedbackPopup) return;

    const feedbackText = feedbackPopup.querySelector("p");
    if (feedbackText) {
      feedbackText.textContent = message;
    }

    feedbackPopup.classList.add("is-open");
    feedbackPopup.setAttribute("aria-hidden", "false");

    if (feedbackTimer) {
      clearTimeout(feedbackTimer);
    }

    feedbackTimer = setTimeout(() => {
      hideFeedbackPopup();
      feedbackTimer = null;
    }, CONFIRMATION_TIMEOUT_MS);
  }

  function closePlatformPopup() {
    if (!isPlatformPopupOpen) return;
    isPlatformPopupOpen = false;
    platformPopup.classList.remove("is-open");
    syncPlatformPopupAria();
  }

  function openPlatformPopup() {
    if (isPlatformPopupOpen) return;
    if (!isMainPopupOpen) openMainPopup();
    isPlatformPopupOpen = true;
    platformPopup.classList.add("is-open");
    syncPlatformPopupAria();
  }

  function closeMainPopup() {
    if (!isMainPopupOpen) return;
    isMainPopupOpen = false;
    popup.classList.remove("is-open");
    closePlatformPopup();
    syncMainPopupAria();
  }

  function openMainPopup() {
    if (isMainPopupOpen) return;
    isMainPopupOpen = true;
    popup.classList.add("is-open");
    if (!dateInput.value && mainDateInput && mainDateInput.value) {
      dateInput.value = mainDateInput.value;
      dispatchInputEvents(dateInput);
    }
    syncMainPopupAria();
  }

  function applyPlatformSelection(platformName) {
    platformInput.value = platformName;
    platformButtons.forEach((button) => {
      const isSelected = button.dataset.platformOption === platformName;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
    dispatchInputEvents(platformInput);
    closePlatformPopup();
  }

  function applyColorSelection(colorValue) {
    const normalizedColor = String(colorValue || "").trim();
    if (!normalizedColor) return;

    colorValueInput.value = normalizedColor;
    colorPreview.style.backgroundColor = normalizedColor;

    colorButtons.forEach((button) => {
      const buttonColor = String(button.dataset.eventColor || "").trim();
      const isSelected = buttonColor.toLowerCase() === normalizedColor.toLowerCase();
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });

    dispatchInputEvents(colorValueInput);
  }

  function parseTimeToMinutes(timeValue) {
    const match = /^(\d{2}):(\d{2})$/.exec(String(timeValue || ""));
    if (!match) return null;
    const hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  function getCalendarRange() {
    const slotCount = dailyTrack.querySelectorAll(".time_slot").length;
    const normalizedSlots = slotCount > 0 ? slotCount : 16;
    return {
      startMinutes: DAY_START_MINUTES,
      endMinutes: DAY_START_MINUTES + normalizedSlots * SLOT_MINUTES
    };
  }

  function validateScheduleData() {
    endTimeInput.setCustomValidity("");

    const requiredInputs = [
      dateInput,
      startTimeInput,
      endTimeInput,
      platformInput,
      inviteMembersInput
    ];

    for (const inputField of requiredInputs) {
      if (!inputField.checkValidity()) {
        inputField.reportValidity();
        return null;
      }
    }

    const startMinutes = parseTimeToMinutes(startTimeInput.value);
    const endMinutes = parseTimeToMinutes(endTimeInput.value);

    if (startMinutes === null || endMinutes === null) {
      endTimeInput.setCustomValidity("Choose valid start and end times.");
      endTimeInput.reportValidity();
      return null;
    }

    if (endMinutes <= startMinutes) {
      endTimeInput.setCustomValidity("End time must be later than start time.");
      endTimeInput.reportValidity();
      return null;
    }

    const calendarRange = getCalendarRange();
    if (
      startMinutes < calendarRange.startMinutes ||
      endMinutes > calendarRange.endMinutes
    ) {
      endTimeInput.setCustomValidity(
        "Meeting time must be between 07:00 and 23:00 for this daily calendar."
      );
      endTimeInput.reportValidity();
      return null;
    }

    endTimeInput.setCustomValidity("");

    return {
      date: dateInput.value,
      startTime: startTimeInput.value,
      endTime: endTimeInput.value,
      platform: platformInput.value.trim(),
      inviteMembers: inviteMembersInput.value.trim(),
      color: colorValueInput.value.trim() || DEFAULT_COLOR_FALLBACK
    };
  }

  function resetQuickToolForm() {
    dateInput.value = "";
    startTimeInput.value = "";
    endTimeInput.value = "";
    platformInput.value = "";
    inviteMembersInput.value = "";
    endTimeInput.setCustomValidity("");

    platformButtons.forEach((button) => {
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    });

    const defaultColor = String(colorButtons[0]?.dataset.eventColor || "").trim();
    applyColorSelection(defaultColor || DEFAULT_COLOR_FALLBACK);

    dispatchInputEvents(dateInput);
    dispatchInputEvents(startTimeInput);
    dispatchInputEvents(endTimeInput);
    dispatchInputEvents(platformInput);
    dispatchInputEvents(inviteMembersInput);
  }

  function getUpdateUrlForEvent(eventId) {
    if (!EVENT_UPDATE_URL_TEMPLATE) return "";
    return EVENT_UPDATE_URL_TEMPLATE.replace(/\/0\/(update|delete)\/$/, `/${eventId}/$1/`);
  }

  async function persistScheduleEvent(eventData) {
    const targetUrl = editingEventId ? getUpdateUrlForEvent(editingEventId) : EVENT_CREATE_URL;

    if (!targetUrl) {
      return {
        event: eventData,
        events: [eventData]
      };
    }

    const headers = {
      "Content-Type": "application/json"
    };
    const csrfTokenValue =
      (window.SDGP_CSRF && window.SDGP_CSRF.getCsrfToken && window.SDGP_CSRF.getCsrfToken()) ||
      CSRF_TOKEN;
    if (csrfTokenValue) {
      headers["X-CSRFToken"] = csrfTokenValue;
    }

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      credentials: "same-origin",
      body: JSON.stringify(eventData)
    });

    let responseData = {};
    try {
      responseData = await response.json();
    } catch (error) {
      responseData = {};
    }

    if (!response.ok) {
      throw new Error(responseData.message || "Unable to save the schedule event.");
    }

    return responseData;
  }

  function applyEventToForm(eventItem) {
    if (!eventItem) return;
    editingEventId = eventItem.id || null;

    if (eventItem.date) dateInput.value = eventItem.date;
    if (eventItem.startTime) startTimeInput.value = eventItem.startTime;
    if (eventItem.endTime) endTimeInput.value = eventItem.endTime;
    if (eventItem.platform) applyPlatformSelection(eventItem.platform);
    if (eventItem.inviteMembers) inviteMembersInput.value = eventItem.inviteMembers;
    applyColorSelection(eventItem.color || DEFAULT_COLOR_FALLBACK);

    [dateInput, startTimeInput, endTimeInput, platformInput, inviteMembersInput].forEach(
      dispatchInputEvents
    );

    trigger.textContent = "Update event";
    popup.classList.add("is-edit-mode");
    openMainPopup();
  }

  function clearEditingMode() {
    editingEventId = null;
    trigger.textContent = "Add event";
    popup.classList.remove("is-edit-mode");
  }

  async function scheduleEvent() {
    if (isSavingEvent) return;

    const eventData = validateScheduleData();
    if (!eventData) return;

    isSavingEvent = true;
    trigger.disabled = true;

    try {
      const savedState = await persistScheduleEvent(eventData);
      if (mainDateInput) {
        mainDateInput.value = eventData.date;
        dispatchInputEvents(mainDateInput);
      }

      document.dispatchEvent(
        new CustomEvent("schedule:events-updated", {
          detail: {
            events: Array.isArray(savedState.events) ? savedState.events : [savedState.event],
            activeDate: eventData.date
          }
        })
      );

      resetQuickToolForm();
      clearEditingMode();
      closeMainPopup();
      showFeedbackPopup(editingEventId ? "Event updated" : "An event has been scheduled");
    } catch (error) {
      console.warn("Schedule quick tool: failed to save event.", error);
      endTimeInput.setCustomValidity(error.message || "Unable to save the schedule event.");
      endTimeInput.reportValidity();
    } finally {
      isSavingEvent = false;
      trigger.disabled = false;
    }
  }

  trigger.addEventListener("click", () => {
    if (!isMainPopupOpen) {
      openMainPopup();
      return;
    }
    scheduleEvent();
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!isMainPopupOpen) {
        openMainPopup();
        return;
      }
      scheduleEvent();
    }
  });

  platformInput.addEventListener("click", () => {
    openPlatformPopup();
  });

  platformInput.addEventListener("focus", () => {
    openPlatformPopup();
  });

  platformInput.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      openPlatformPopup();
    }
  });

  if (platformCloseButton) {
    platformCloseButton.addEventListener("click", () => {
      closePlatformPopup();
    });
  }

  platformButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const platformName = String(button.dataset.platformOption || "").trim();
      if (!platformName) return;
      applyPlatformSelection(platformName);
    });
  });

  colorButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedColor = String(button.dataset.eventColor || "").trim();
      if (!selectedColor) return;
      applyColorSelection(selectedColor);
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;

    if (
      isPlatformPopupOpen &&
      !platformPopup.contains(target) &&
      !platformInput.contains(target)
    ) {
      closePlatformPopup();
    }

    if (isMainPopupOpen && !popup.contains(target) && !trigger.contains(target)) {
      closeMainPopup();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (isPlatformPopupOpen) {
      closePlatformPopup();
      platformInput.blur();
      return;
    }

    if (isMainPopupOpen) {
      closeMainPopup();
      trigger.blur();
    }
  });

  const existingPlatform = String(platformInput.value || "").trim();
  if (existingPlatform) {
    applyPlatformSelection(existingPlatform);
  } else {
    platformButtons.forEach((button) => {
      button.classList.remove("is-selected");
      button.setAttribute("aria-pressed", "false");
    });
  }

  const initialColorFromInput = String(colorValueInput.value || "").trim();
  const fallbackColor = String(colorButtons[0]?.dataset.eventColor || "").trim();
  applyColorSelection(initialColorFromInput || fallbackColor || DEFAULT_COLOR_FALLBACK);

  hideFeedbackPopup();
  syncMainPopupAria();
  syncPlatformPopupAria();

  document.addEventListener("schedule:event-edit-requested", (event) => {
    const detail = event instanceof CustomEvent ? event.detail : null;
    if (!detail || !detail.event) return;
    applyEventToForm(detail.event);
  });
})();
