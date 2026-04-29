(() => {
  const mainDateInput =
    document.getElementById("schedule-main-date") ||
    document.querySelector('input[name="Desirable_day"]');
  const dailySection = document.querySelector('[data-schedule-template="daily"]');
  const dailyTrack = dailySection?.querySelector(".day_track");
  const weeklySection = document.querySelector('[data-schedule-template="weekly"]');
  const monthlySection = document.querySelector('[data-schedule-template="monthly"]');
  const scheduleTemplate = document.getElementById("Indication-Template");
  const schedulerRow = document.getElementById("Schedular");
  const monthLabel = document.getElementById("schedule-month-label");
  const dailyTemplateButton = document.querySelector(
    '.Option_selector[data-template-target="daily"]'
  );

  if (!mainDateInput || !dailyTrack || !weeklySection || !monthlySection || !scheduleTemplate) {
    console.warn("Schedule calendar sync: required HTML hooks are missing.");
    return;
  }

  const DAY_START_MINUTES = 7 * 60;
  const SLOT_MINUTES = 60;
  const DAY_SLOT_COUNT = dailyTrack.querySelectorAll(".time_slot").length || 16;
  const DAY_END_MINUTES = DAY_START_MINUTES + SLOT_MINUTES * DAY_SLOT_COUNT;
  const EVENT_SOURCE = "schedule-db";
  const DEFAULT_COLOR_A = "rgba(14, 165, 233, 1)";
  const DEFAULT_COLOR_B = "rgba(99, 102, 241, 1)";
  const DEFAULT_EVENT_COLOR = "rgba(37, 99, 235, 1)";
  const COMPACT_EVENT_MAX_MINUTES = 150;
  const MAX_MONTH_DAY_COUNT = 31;
  const INBOX_REDIRECT_URL = readJsonScriptContent(
    "schedule-inbox-url",
    "/user-home/tools/message/"
  );
  const EVENT_DELETE_URL_TEMPLATE = readJsonScriptContent(
    "schedule-event-delete-url-template",
    ""
  );
  const SCHEDULE_CSRF_TOKEN = readJsonScriptContent("schedule-csrf-token", "");
  const COLOR_PICKER_PALETTE = [
    "rgba(239, 68, 68, 1)",
    "rgba(249, 115, 22, 1)",
    "rgba(234, 179, 8, 1)",
    "rgba(34, 197, 94, 1)",
    "rgba(20, 184, 166, 1)",
    "rgba(14, 165, 233, 1)",
    "rgba(37, 99, 235, 1)",
    "rgba(99, 102, 241, 1)",
    "rgba(168, 85, 247, 1)",
    "rgba(236, 72, 153, 1)"
  ];

  let scheduleEvents = normalizeEventList(readJsonScriptContent("schedule-event-state", []));

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

  function parseDateValue(dateValue) {
    const normalizedDate = String(dateValue || "").trim();
    const parsedDate = new Date(`${normalizedDate}T00:00:00`);
    if (!normalizedDate || Number.isNaN(parsedDate.getTime())) return null;
    return parsedDate;
  }

  function toIsoDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDays(dateObj, daysToAdd) {
    const nextDate = new Date(dateObj);
    nextDate.setDate(nextDate.getDate() + daysToAdd);
    return nextDate;
  }

  function parseTimeToMinutes(timeValue) {
    const match = /^(\d{2}):(\d{2})$/.exec(String(timeValue || "").trim());
    if (!match) return null;

    const hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);
    if (
      Number.isNaN(hours) ||
      Number.isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return hours * 60 + minutes;
  }

  function formatTimeLabel(timeValue) {
    const timeMinutes = parseTimeToMinutes(timeValue);
    if (timeMinutes === null) return timeValue;

    const hour24 = Math.floor(timeMinutes / 60);
    const minuteValue = timeMinutes % 60;
    const suffix = hour24 >= 12 ? "P.M." : "A.M.";
    const hour12 = ((hour24 + 11) % 12) + 1;
    return `${String(hour12).padStart(2, "0")}:${String(minuteValue).padStart(2, "0")} ${suffix}`;
  }

  function formatWeeklySummary(eventItem) {
    const timeLabel = formatTimeLabel(eventItem.startTime);
    const labelText =
      eventItem.title ||
      (eventItem.inviteMembers ? `with ${eventItem.inviteMembers}` : "Scheduled event");
    return `${timeLabel} - ${labelText}`;
  }

  function formatDateNumeric(dateObj) {
    return `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
  }

  function parseColorChannels(colorValue) {
    const rgbaMatch = String(colorValue || "")
      .trim()
      .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);

    if (rgbaMatch) {
      return {
        r: Math.round(Number.parseFloat(rgbaMatch[1])),
        g: Math.round(Number.parseFloat(rgbaMatch[2])),
        b: Math.round(Number.parseFloat(rgbaMatch[3]))
      };
    }

    return null;
  }

  function withAlpha(colorValue, alpha) {
    const channels = parseColorChannels(colorValue);
    if (!channels) return `rgba(37, 99, 235, ${alpha})`;
    return `rgba(${channels.r}, ${channels.g}, ${channels.b}, ${alpha})`;
  }

  function clampNumber(value, minimumValue, maximumValue) {
    return Math.max(minimumValue, Math.min(maximumValue, value));
  }

  function getPairedPaletteColor(primaryColor) {
    const normalizedPrimary = String(primaryColor || "").trim().toLowerCase();
    const colorIndex = COLOR_PICKER_PALETTE.findIndex(
      (paletteColor) => paletteColor.toLowerCase() === normalizedPrimary
    );
    if (colorIndex < 0) return DEFAULT_COLOR_B;

    return COLOR_PICKER_PALETTE[(colorIndex + 1) % COLOR_PICKER_PALETTE.length];
  }

  function normalizeEventList(rawEvents) {
    if (!Array.isArray(rawEvents)) return [];

    return rawEvents
      .map((rawEvent, index) => normalizeEvent(rawEvent, index))
      .filter((eventItem) => eventItem !== null)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
        return a.endMinutes - b.endMinutes;
      });
  }

  function normalizeEvent(rawEvent, index) {
    const parsedDate = parseDateValue(rawEvent?.date || rawEvent?.event_date);
    if (!parsedDate) return null;

    const startTime = String(rawEvent?.startTime || rawEvent?.start_time || "").trim();
    const endTime = String(rawEvent?.endTime || rawEvent?.end_time || "").trim();
    let startMinutes = Number(rawEvent?.startMinutes ?? rawEvent?.start_minutes);
    let endMinutes = Number(rawEvent?.endMinutes ?? rawEvent?.end_minutes);

    if (!Number.isFinite(startMinutes)) startMinutes = parseTimeToMinutes(startTime);
    if (!Number.isFinite(endMinutes)) endMinutes = parseTimeToMinutes(endTime);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return null;

    const selectedColor = String(rawEvent?.color || DEFAULT_EVENT_COLOR).trim();
    const secondaryColor =
      String(rawEvent?.colorSecondary || rawEvent?.color_secondary || "").trim() ||
      getPairedPaletteColor(selectedColor);

    return {
      id: rawEvent?.id ?? `schedule-event-${index}`,
      source: rawEvent?.source || "db",
      date: toIsoDate(parsedDate),
      startTime,
      endTime,
      startMinutes,
      endMinutes,
      platform: String(rawEvent?.platform || "Meeting").trim(),
      inviteMembers: String(rawEvent?.inviteMembers || rawEvent?.invite_members || "Team").trim(),
      title: String(rawEvent?.title || "").trim(),
      color: selectedColor,
      colorSecondary: secondaryColor,
      detailUrl: String(rawEvent?.detailUrl || rawEvent?.detail_url || INBOX_REDIRECT_URL).trim()
    };
  }

  function getEventsLayer() {
    let eventsLayer = dailyTrack.querySelector(".day_events_layer");
    if (!eventsLayer) {
      eventsLayer = document.createElement("div");
      eventsLayer.className = "day_events_layer";
      dailyTrack.appendChild(eventsLayer);
    }
    return eventsLayer;
  }

  function getEventsForDate(dateIso) {
    return scheduleEvents
      .filter((eventItem) => eventItem.date === dateIso)
      .sort((a, b) => {
        if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
        return a.endMinutes - b.endMinutes;
      });
  }

  function getDailySlotHeight() {
    const slotElement = dailyTrack.querySelector(".time_slot");
    const measuredSlotHeight = slotElement ? slotElement.getBoundingClientRect().height : 0;
    if (measuredSlotHeight > 0) return measuredSlotHeight;

    if (slotElement) {
      const computedSlotHeight = Number.parseFloat(window.getComputedStyle(slotElement).height);
      if (computedSlotHeight > 0) return computedSlotHeight;
    }

    const dailyLayout = dailySection.querySelector(".schedule_daily_layout");
    const dailyLayoutStyles = window.getComputedStyle(dailyLayout || dailySection);
    const cssSlotHeight = Number.parseFloat(dailyLayoutStyles.getPropertyValue("--slot-height"));
    return cssSlotHeight > 0 ? cssSlotHeight : 50;
  }

  function buildEventClusters(dayEvents) {
    const clusters = [];
    let currentCluster = [];
    let currentClusterEnd = null;

    dayEvents.forEach((eventItem) => {
      if (currentCluster.length === 0 || eventItem.startMinutes < currentClusterEnd) {
        currentCluster.push(eventItem);
        currentClusterEnd = Math.max(currentClusterEnd ?? eventItem.endMinutes, eventItem.endMinutes);
        return;
      }

      clusters.push(currentCluster);
      currentCluster = [eventItem];
      currentClusterEnd = eventItem.endMinutes;
    });

    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    return clusters;
  }

  function assignEventLanes(dayEvents) {
    const eventLayouts = [];

    buildEventClusters(dayEvents).forEach((eventCluster) => {
      const laneEndTimes = [];
      const clusterLayouts = eventCluster.map((eventItem) => {
        let laneIndex = laneEndTimes.findIndex((laneEndTime) => laneEndTime <= eventItem.startMinutes);
        if (laneIndex < 0) {
          laneIndex = laneEndTimes.length;
        }

        laneEndTimes[laneIndex] = eventItem.endMinutes;
        return {
          ...eventItem,
          laneIndex
        };
      });
      const laneCount = Math.max(laneEndTimes.length, 1);
      clusterLayouts.forEach((eventItem) => {
        eventLayouts.push({
          ...eventItem,
          laneCount
        });
      });
    });

    return eventLayouts;
  }

  function renderDailyEvents(dateIso) {
    const eventsLayer = getEventsLayer();
    Array.from(eventsLayer.querySelectorAll(".schedule_event_card")).forEach((card) => {
      card.remove();
    });

    const slotHeight = getDailySlotHeight();
    const dayEvents = getEventsForDate(dateIso).filter(
      (eventItem) =>
        eventItem.startMinutes >= DAY_START_MINUTES && eventItem.endMinutes <= DAY_END_MINUTES
    );

    assignEventLanes(dayEvents).forEach((eventItem) => {
      const topOffset =
        ((eventItem.startMinutes - DAY_START_MINUTES) / SLOT_MINUTES) * slotHeight;
      const baseHeight =
        ((eventItem.endMinutes - eventItem.startMinutes) / SLOT_MINUTES) * slotHeight;
      const minimumEventHeight = Math.min(48, slotHeight);
      const eventHeight = Math.max(baseHeight, minimumEventHeight);
      const durationMinutes = eventItem.endMinutes - eventItem.startMinutes;
      const shouldUseCompactLayout =
        durationMinutes <= COMPACT_EVENT_MAX_MINUTES || eventHeight <= slotHeight * 1.5;
      const redirectUrl = eventItem.detailUrl || INBOX_REDIRECT_URL;

      const eventCard = document.createElement("article");
      eventCard.className = "schedule_event_card";
      if (shouldUseCompactLayout) {
        eventCard.classList.add("schedule_event_card_compact");
      }
      eventCard.dataset.eventSource = EVENT_SOURCE;
      eventCard.dataset.eventId = String(eventItem.id);
      eventCard.dataset.eventDate = eventItem.date;
      eventCard.setAttribute("role", "link");
      eventCard.setAttribute("tabindex", "0");
      eventCard.setAttribute("aria-label", "Open inbox page");
      eventCard.style.top = `${topOffset}px`;
      eventCard.style.height = `${eventHeight}px`;
      eventCard.style.backgroundColor = withAlpha(eventItem.color, 0.32);
      eventCard.style.borderColor = withAlpha(eventItem.color, 0.78);
      eventCard.style.borderLeftColor = eventItem.color;

      if (eventItem.laneCount > 1) {
        const leftPercent = (eventItem.laneIndex / eventItem.laneCount) * 100;
        const rightPercent =
          ((eventItem.laneCount - eventItem.laneIndex - 1) / eventItem.laneCount) * 100;
        eventCard.style.left = `calc(${leftPercent}% + 8px)`;
        eventCard.style.right = `calc(${rightPercent}% + 8px)`;
      }

      eventCard.addEventListener("click", (clickEvent) => {
        if (clickEvent.target instanceof HTMLElement && clickEvent.target.closest(".schedule_event_action")) {
          return;
        }
        window.location.href = redirectUrl;
      });
      eventCard.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          if (event.target instanceof HTMLElement && event.target.closest(".schedule_event_action")) {
            return;
          }
          event.preventDefault();
          window.location.href = redirectUrl;
        }
      });

      const title = document.createElement("p");
      title.className = "schedule_event_title";
      title.textContent = eventItem.title || `With: ${eventItem.inviteMembers}`;

      const platformMeta = document.createElement("p");
      platformMeta.className = "schedule_event_meta";
      platformMeta.textContent = `Platform: ${eventItem.platform}`;

      const timeMeta = document.createElement("p");
      timeMeta.className = "schedule_event_meta";
      timeMeta.textContent = `Time: ${formatTimeLabel(eventItem.startTime)} - ${formatTimeLabel(
        eventItem.endTime
      )}`;

      const actionRow = document.createElement("div");
      actionRow.className = "schedule_event_actions";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "schedule_event_action schedule_event_action_edit";
      editButton.setAttribute("aria-label", "Edit event");
      editButton.textContent = "Edit";
      editButton.addEventListener("click", (clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        document.dispatchEvent(
          new CustomEvent("schedule:event-edit-requested", { detail: { event: eventItem } })
        );
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "schedule_event_action schedule_event_action_delete";
      deleteButton.setAttribute("aria-label", "Delete event");
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", (clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
        deleteScheduleEvent(eventItem);
      });

      actionRow.appendChild(editButton);
      actionRow.appendChild(deleteButton);

      eventCard.appendChild(title);
      eventCard.appendChild(platformMeta);
      eventCard.appendChild(timeMeta);
      eventCard.appendChild(actionRow);
      eventsLayer.appendChild(eventCard);
    });
  }

  async function deleteScheduleEvent(eventItem) {
    if (!eventItem || !eventItem.id) return;
    if (!EVENT_DELETE_URL_TEMPLATE) return;
    if (!window.confirm("Delete this event?")) return;

    const deleteUrl = EVENT_DELETE_URL_TEMPLATE.replace(/\/0\/(delete|update)\/$/, `/${eventItem.id}/$1/`);
    const csrfToken =
      (window.SDGP_CSRF && window.SDGP_CSRF.getCsrfToken && window.SDGP_CSRF.getCsrfToken()) ||
      SCHEDULE_CSRF_TOKEN;

    try {
      const response = await fetch(deleteUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken
        },
        body: "{}"
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        window.alert(errorBody.message || "Unable to delete the event.");
        return;
      }

      const result = await response.json();
      const incoming = Array.isArray(result.events) ? result.events : [];
      scheduleEvents = normalizeEventList(incoming);
      refreshCalendarViews();
    } catch (error) {
      console.warn("Schedule: failed to delete event.", error);
      window.alert("Unable to delete the event.");
    }
  }

  function getWeekFocusDate(selectedDate) {
    const dayNumber = selectedDate.getDay();
    if (dayNumber === 6) return addDays(selectedDate, 2);
    if (dayNumber === 0) return addDays(selectedDate, 1);
    return new Date(selectedDate);
  }

  function updateWeeklyTemplate(selectedDate) {
    const weeklyCards = Array.from(weeklySection.querySelectorAll("[data-weekly-day-card]"));
    if (weeklyCards.length === 0) return;

    const focusDate = getWeekFocusDate(selectedDate);
    const mondayDate = addDays(focusDate, 1 - focusDate.getDay());
    const usedCardIndex = Math.max(0, Math.min(4, focusDate.getDay() - 1));

    weeklyCards.slice(0, 5).forEach((card, index) => {
      const cardDate = addDays(mondayDate, index);
      const cardDateIso = toIsoDate(cardDate);
      card.dataset.dateValue = cardDateIso;
      card.classList.remove("Blocks", "Blocks_used");
      card.classList.add(index === usedCardIndex ? "Blocks_used" : "Blocks");
      card.classList.add("schedule_day_jump");

      const dayName = card.querySelector(".date_of_Month");
      if (dayName) {
        dayName.textContent = cardDate.toLocaleDateString(undefined, { weekday: "long" });
      }

      const dayDate = card.querySelector(".date");
      if (dayDate) {
        dayDate.textContent = formatDateNumeric(cardDate);
      }

      const dayEvents = getEventsForDate(cardDateIso);
      const eventsContainer = card.querySelector(".weekly_events_container");

      if (eventsContainer) {
        eventsContainer.innerHTML = "";
        if (dayEvents.length === 0) {
          const noEvents = document.createElement("p");
          noEvents.className = "Event_1";
          noEvents.textContent = "No events scheduled";
          eventsContainer.appendChild(noEvents);
        } else {
          dayEvents.forEach((eventItem, eventIndex) => {
            const eventLine = document.createElement("p");
            if (eventIndex === 0) {
              eventLine.className = "Event_1";
            } else if (eventIndex === 1) {
              eventLine.className = "Event_2";
            } else {
              eventLine.className = "Event_weekly_item";
            }
            eventLine.textContent = formatWeeklySummary(eventItem);
            eventsContainer.appendChild(eventLine);
          });
        }
      }

      const viewButton = card.querySelector(".weekly-display-day, .Option_selector");
      if (viewButton instanceof HTMLButtonElement) {
        viewButton.dataset.dateValue = cardDateIso;
        viewButton.textContent = dayEvents.length > 0 ? "Display events" : "View this day";
      }
    });
  }

  function getGradientColorsForDay(dateIso) {
    const dayEvents = getEventsForDate(dateIso);
    if (dayEvents.length === 0) return [DEFAULT_COLOR_A, DEFAULT_COLOR_B];

    const normalizedPrimaryColors = dayEvents
      .map((eventItem) => String(eventItem.color || "").trim())
      .filter((colorValue) => colorValue.length > 0);

    if (normalizedPrimaryColors.length === 0) {
      return [DEFAULT_COLOR_A, DEFAULT_COLOR_B];
    }

    const firstColor = normalizedPrimaryColors[0];
    const secondDistinctPrimary = normalizedPrimaryColors.find(
      (colorValue) => colorValue.toLowerCase() !== firstColor.toLowerCase()
    );

    if (secondDistinctPrimary) {
      return [firstColor, secondDistinctPrimary];
    }

    const firstEvent = dayEvents[0];
    const fallbackSecondary =
      String(firstEvent?.colorSecondary || "").trim() || getPairedPaletteColor(firstColor);
    const safeSecondary =
      fallbackSecondary.toLowerCase() === firstColor.toLowerCase()
        ? getPairedPaletteColor(firstColor)
        : fallbackSecondary;

    return [firstColor, safeSecondary];
  }

  function createMonthDayCell() {
    const dayCell = document.createElement("div");
    dayCell.className = "col-1 Blocks d-flex justify-content-center";

    const dayLabel = document.createElement("p");
    dayLabel.className = "date_of_Month_selection";
    dayCell.appendChild(dayLabel);

    return dayCell;
  }

  function getMonthDayCells() {
    const monthRows = Array.from(monthlySection.querySelectorAll(".row_calendar"));
    if (monthRows.length === 0) return [];

    const lastMonthRow = monthRows[monthRows.length - 1];
    const monthCells = Array.from(monthlySection.querySelectorAll(".row_calendar .col-1"));

    while (monthCells.length < MAX_MONTH_DAY_COUNT) {
      const dayCell = createMonthDayCell();
      lastMonthRow.appendChild(dayCell);
      monthCells.push(dayCell);
    }

    monthCells.slice(MAX_MONTH_DAY_COUNT).forEach((cell) => {
      cell.classList.add("month_day_hidden");
    });

    return monthCells.slice(0, MAX_MONTH_DAY_COUNT);
  }

  function updateMonthlyTemplate(selectedDate) {
    const monthCells = getMonthDayCells();
    if (monthCells.length === 0) return;

    const selectedYear = selectedDate.getFullYear();
    const selectedMonth = selectedDate.getMonth();
    const selectedDay = selectedDate.getDate();
    const visibleDays = clampNumber(
      new Date(selectedYear, selectedMonth + 1, 0).getDate(),
      1,
      MAX_MONTH_DAY_COUNT
    );

    if (monthLabel) {
      monthLabel.textContent = selectedDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric"
      });
    }

    monthCells.forEach((cell, index) => {
      const dayValue = index + 1;
      const dayLabel = cell.querySelector("p");
      const isVisible = dayValue <= visibleDays;

      cell.classList.toggle("month_day_hidden", !isVisible);
      cell.classList.remove("schedule_day_jump", "month_event_day", "Blocks", "Blocks_used");
      cell.style.removeProperty("--month-event-color-a");
      cell.style.removeProperty("--month-event-color-b");
      delete cell.dataset.dateValue;

      if (dayLabel) {
        dayLabel.textContent = String(dayValue);
        dayLabel.classList.remove("date_of_Month_selection_next");
        dayLabel.classList.add("date_of_Month_selection");
      }

      if (!isVisible) {
        cell.classList.add("Blocks");
        return;
      }

      const dayDate = new Date(selectedYear, selectedMonth, dayValue);
      const dayIso = toIsoDate(dayDate);
      cell.dataset.dateValue = dayIso;
      cell.classList.add(dayValue === selectedDay ? "Blocks_used" : "Blocks");
      cell.classList.add("schedule_day_jump");

      const dayEvents = getEventsForDate(dayIso);
      if (dayEvents.length > 0) {
        const [firstColor, secondColor] = getGradientColorsForDay(dayIso);
        cell.classList.add("month_event_day");
        cell.style.setProperty("--month-event-color-a", firstColor);
        cell.style.setProperty("--month-event-color-b", secondColor);
      }
    });

    Array.from(monthlySection.querySelectorAll(".row_calendar")).forEach((row) => {
      const cells = Array.from(row.querySelectorAll(".col-1"));
      const allHidden = cells.length > 0 && cells.every((cell) =>
        cell.classList.contains("month_day_hidden")
      );
      row.classList.toggle("month_day_hidden", allHidden);
    });
  }

  function refreshCalendarViews() {
    const selectedDate = parseDateValue(mainDateInput.value);
    if (!selectedDate) return;

    updateWeeklyTemplate(selectedDate);
    updateMonthlyTemplate(selectedDate);
    renderDailyEvents(toIsoDate(selectedDate));
  }

  let refreshRaf = 0;
  function scheduleRefreshCalendarViews() {
    if (refreshRaf) return;
    refreshRaf = window.requestAnimationFrame(() => {
      refreshRaf = 0;
      refreshCalendarViews();
    });
  }

  function jumpToDailyDate(dateValue) {
    if (!parseDateValue(dateValue)) return;
    mainDateInput.value = dateValue;
    mainDateInput.dispatchEvent(new Event("input", { bubbles: true }));
    mainDateInput.dispatchEvent(new Event("change", { bubbles: true }));
    forceDailyTemplateVisible();
  }

  function forceDailyTemplateVisible() {
    if (dailyTemplateButton instanceof HTMLButtonElement) {
      dailyTemplateButton.click();
      return;
    }

    const sections = Array.from(
      document.querySelectorAll(".schedule_template_section[data-schedule-template]")
    );
    sections.forEach((section) => {
      const shouldShow = section.dataset.scheduleTemplate === "daily";
      section.classList.toggle("d-none", !shouldShow);
    });
  }

  weeklySection.addEventListener("click", (event) => {
    const targetElement = event.target;
    if (!(targetElement instanceof Element)) return;
    const cardElement = targetElement.closest("[data-weekly-day-card]");
    if (!(cardElement instanceof HTMLElement) || !weeklySection.contains(cardElement)) return;

    const triggerButton = targetElement.closest(".weekly-display-day");
    const selectedDateValue =
      (triggerButton instanceof HTMLButtonElement
        ? triggerButton.dataset.dateValue
        : cardElement.dataset.dateValue) || "";

    jumpToDailyDate(selectedDateValue);
  });

  monthlySection.addEventListener("click", (event) => {
    const targetElement = event.target;
    if (!(targetElement instanceof Element)) return;
    const dayCell = targetElement.closest(".row_calendar .col-1");
    if (!(dayCell instanceof HTMLElement) || !monthlySection.contains(dayCell)) return;
    if (dayCell.classList.contains("month_day_hidden")) return;

    const selectedDateValue = String(dayCell.dataset.dateValue || "").trim();
    jumpToDailyDate(selectedDateValue);
  });

  mainDateInput.addEventListener("input", refreshCalendarViews);
  mainDateInput.addEventListener("change", refreshCalendarViews);
  window.addEventListener("resize", scheduleRefreshCalendarViews);

  document.addEventListener("schedule:events-updated", (event) => {
    const detail = event instanceof CustomEvent ? event.detail : null;
    const incoming = Array.isArray(detail?.events) ? detail.events : [];
    scheduleEvents = normalizeEventList(incoming);
    refreshCalendarViews();
  });

  document.addEventListener("schedule:layout-resized", scheduleRefreshCalendarViews);
  document.addEventListener("schedule:template-changed", scheduleRefreshCalendarViews);

  if (!parseDateValue(mainDateInput.value)) {
    mainDateInput.value = toIsoDate(new Date());
  }

  refreshCalendarViews();
})();
