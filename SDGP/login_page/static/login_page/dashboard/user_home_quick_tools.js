(() => {
  const trigger = document.getElementById("quick-tools-trigger");
  const panel = document.getElementById("quick-tools-inline-panel");
  const closeBtn = document.getElementById("quick-tools-inline-close");
  const list = document.getElementById("quick-tools-list");
  const slots = Array.from(document.querySelectorAll("[data-quick-slot]")).sort(
    (firstSlot, secondSlot) => Number(firstSlot.dataset.quickSlot) - Number(secondSlot.dataset.quickSlot)
  );

  if (!trigger || !panel || !list || slots.length === 0) {
    console.warn("Quick tools: required HTML hooks are missing.");
    return;
  }

  function readJsonScriptContent(scriptId, fallbackValue) {
    const scriptElement = document.getElementById(scriptId);
    if (!scriptElement) return fallbackValue;

    try {
      return JSON.parse(scriptElement.textContent || "");
    } catch {
      return fallbackValue;
    }
  }

  function getCsrfToken() {
    const cookieEntry = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("csrftoken="));

    if (!cookieEntry) {
      return "";
    }

    return decodeURIComponent(cookieEntry.split("=")[1]);
  }

  const quickToolsCatalog = readJsonScriptContent("user-home-quick-tools-catalog", []);
  const quickToolUrlMap = readJsonScriptContent("user-home-quick-tool-url-map", {});
  const quickToolsSaveUrl = readJsonScriptContent("user-home-quick-tools-url", "");
  const initialSlotState = readJsonScriptContent("user-home-quick-tool-slot-state", []);

  const PLACEHOLDER = {
    title: "Add something",
    description: "This is a template button for your quick tool",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-lg" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2"/></svg>`
  };

  const TOOL_ICONS = {
    "tile-1": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chat-square-text" viewBox="0 0 16 16"><path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.5a2 2 0 0 0-1.6.8L8 14.333 6.1 11.8a2 2 0 0 0-1.6-.8H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5a1 1 0 0 1 .8.4l1.9 2.533a1 1 0 0 0 1.6 0l1.9-2.533a1 1 0 0 1 .8-.4H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/><path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5M3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6m0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5"/></svg>`,
    "tile-2": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-bar-graph" viewBox="0 0 16 16"><path d="M10 13.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-6a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5zm-2.5.5a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5zm-3 0a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5z"/><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2M9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5z"/></svg>`,
    "tile-3": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-building" viewBox="0 0 16 16"><path d="M4 2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zM4 5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zM7.5 5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm2.5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zM4.5 8a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm2.5.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm3.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z"/><path d="M2 1a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1zm11 0H3v14h3v-2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V15h3z"/></svg>`,
    "tile-4": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-calendar-range" viewBox="0 0 16 16"><path d="M9 7a1 1 0 0 1 1-1h5v2h-5a1 1 0 0 1-1-1M1 9h4a1 1 0 0 1 0 2H1z"/><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"/></svg>`,
    "tile-5": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-people" viewBox="0 0 16 16"><path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1L7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002-.014.002zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7 7 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.24 2.24 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816M4.92 10A5.5 5.5 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4"/></svg>`,
    "tile-6": `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bar-chart-line" viewBox="0 0 16 16"><path d="M11 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3h1V7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7h1zM2 14h2v-3H2zm5 0h2V7H7zm5 0h2V2h-2z"/></svg>`
  };

  const toolsById = new Map(
    quickToolsCatalog.map((toolItem) => [
      toolItem.id,
      {
        ...toolItem,
        icon: TOOL_ICONS[toolItem.id] || PLACEHOLDER.icon,
        url: quickToolUrlMap[toolItem.id] || "#"
      }
    ])
  );

  let assigned = slots.map(() => null);
  if (Array.isArray(initialSlotState)) {
    assigned = assigned.map((_, slotIndex) => {
      const toolId = initialSlotState[slotIndex];
      return typeof toolId === "string" && toolsById.has(toolId) ? toolId : null;
    });
  }

  let isOpen = false;
  let dragPayload = null;
  let saveRequestId = 0;

  function setTriggerWidth(open) {
    trigger.classList.toggle("col-2", !open);
    trigger.classList.toggle("col-3", open);
    trigger.setAttribute("aria-expanded", String(open));
  }

  function availableTools() {
    const usedToolIds = new Set(assigned.filter(Boolean));
    return quickToolsCatalog.filter((toolItem) => !usedToolIds.has(toolItem.id));
  }

  function renderSlots() {
    slots.forEach((slotElement) => {
      const slotIndex = Number(slotElement.dataset.quickSlot);
      const tool = toolsById.get(assigned[slotIndex] || "");
      const title = slotElement.querySelector("[data-slot-title]");
      const description = slotElement.querySelector("[data-slot-description]");
      const icon = slotElement.querySelector("[data-slot-icon]");
      if (!title || !description || !icon) return;

      if (tool) {
        title.textContent = tool.title;
        description.textContent = tool.description;
        icon.innerHTML = tool.icon || PLACEHOLDER.icon;
        slotElement.classList.remove("slot-empty");
        slotElement.classList.add("slot-filled");
        slotElement.setAttribute("draggable", "true");
      } else {
        title.textContent = PLACEHOLDER.title;
        description.textContent = PLACEHOLDER.description;
        icon.innerHTML = PLACEHOLDER.icon;
        slotElement.classList.remove("slot-filled");
        slotElement.classList.add("slot-empty");
        slotElement.setAttribute("draggable", "false");
      }
    });
  }

  function renderToolList() {
    list.innerHTML = "";

    const tools = availableTools();
    tools.forEach((toolItem, itemIndex) => {
      const tool = toolsById.get(toolItem.id);
      if (!tool) return;

      const card = document.createElement("article");
      card.className = "quick-tool-card";
      card.draggable = true;
      card.dataset.toolId = tool.id;
      card.style.setProperty("--rollout-order", String(itemIndex));
      card.innerHTML = `
        <div class="quick-tool-icon">${tool.icon || PLACEHOLDER.icon}</div>
        <div class="quick-tool-content">
          <strong>${tool.title}</strong>
          <p>${tool.description}</p>
        </div>
      `;
      list.appendChild(card);
    });
  }

  function clearVisuals() {
    slots.forEach((slotElement) => slotElement.classList.remove("is-drop-target", "is-dragging"));
    list.querySelectorAll(".quick-tool-card.is-dragging").forEach((cardElement) => cardElement.classList.remove("is-dragging"));
    dragPayload = null;
  }

  let panelOriginalParent = null;
  let panelOriginalNextSibling = null;

  function hoistPanelToBody() {
    if (panel.parentElement === document.body) return;
    panelOriginalParent = panel.parentElement;
    panelOriginalNextSibling = panel.nextElementSibling;
    document.body.appendChild(panel);
  }

  function restorePanelToOriginalParent() {
    if (!panelOriginalParent) return;
    if (panelOriginalNextSibling && panelOriginalNextSibling.parentElement === panelOriginalParent) {
      panelOriginalParent.insertBefore(panel, panelOriginalNextSibling);
    } else {
      panelOriginalParent.appendChild(panel);
    }
    panelOriginalParent = null;
    panelOriginalNextSibling = null;
  }

  function positionPanel() {
    const triggerRect = trigger.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const gap = 8;

    const panelRect = panel.getBoundingClientRect();
    const panelWidth = panelRect.width || 280;
    const panelHeight = panelRect.height || 220;

    let leftValue = triggerRect.right - panelWidth;
    if (leftValue + panelWidth > viewportWidth - 12) {
      leftValue = viewportWidth - panelWidth - 12;
    }
    if (leftValue < 12) {
      leftValue = 12;
    }

    let topValue = triggerRect.bottom + gap;
    if (topValue + panelHeight > viewportHeight - 12) {
      topValue = Math.max(12, triggerRect.top - panelHeight - gap);
    }

    panel.style.top = `${topValue}px`;
    panel.style.left = `${leftValue}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  function openEditor() {
    if (isOpen) return;

    isOpen = true;
    setTriggerWidth(true);
    hoistPanelToBody();
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    renderToolList();
    requestAnimationFrame(positionPanel);
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel, true);
  }

  function closeEditor() {
    if (!isOpen) return;

    isOpen = false;
    setTriggerWidth(false);
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    clearVisuals();
    window.removeEventListener("resize", positionPanel);
    window.removeEventListener("scroll", positionPanel, true);
    restorePanelToOriginalParent();
  }

  function toggleEditor() {
    isOpen ? closeEditor() : openEditor();
  }

  function parsePayload(event) {
    const rawPayload = event.dataTransfer?.getData("text/plain");
    if (!rawPayload) return dragPayload;

    try {
      return JSON.parse(rawPayload);
    } catch {
      return dragPayload;
    }
  }

  async function persistSlotState() {
    if (!quickToolsSaveUrl) return;

    const requestId = saveRequestId + 1;
    saveRequestId = requestId;

    try {
      const response = await fetch(quickToolsSaveUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCsrfToken(),
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({
          slot_state: assigned
        })
      });

      if (!response.ok) {
        return;
      }

      const responseData = await response.json();
      if (!responseData || !Array.isArray(responseData.slot_state)) {
        return;
      }

      if (requestId !== saveRequestId) {
        return;
      }

      assigned = slots.map((_, slotIndex) => {
        const toolId = responseData.slot_state[slotIndex];
        return typeof toolId === "string" && toolsById.has(toolId) ? toolId : null;
      });
      renderSlots();
      renderToolList();
    } catch (error) {
      console.warn("Quick tools: failed to persist slot state.", error);
    }
  }

  function assignTool(toolId, targetIndex) {
    if (!toolsById.has(toolId)) return;

    const existingIndex = assigned.indexOf(toolId);
    if (existingIndex >= 0 && existingIndex !== targetIndex) {
      assigned[existingIndex] = null;
    }

    assigned[targetIndex] = toolId;
    renderSlots();
    renderToolList();
    persistSlotState();
  }

  function swapSlots(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;

    const temporaryToolId = assigned[fromIndex];
    assigned[fromIndex] = assigned[toIndex] || null;
    assigned[toIndex] = temporaryToolId || null;
    renderSlots();
    renderToolList();
    persistSlotState();
  }

  function openToolById(toolId) {
    const tool = toolsById.get(toolId || "");
    if (!tool || !tool.url) return;
    window.location.href = tool.url;
  }

  trigger.addEventListener("click", toggleEditor);
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleEditor();
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", closeEditor);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen) {
      closeEditor();
    }
  });

  document.addEventListener("click", (event) => {
    if (!isOpen) return;
    if (panel.contains(event.target) || trigger.contains(event.target)) return;
    closeEditor();
  });

  list.addEventListener("dragstart", (event) => {
    const cardElement = event.target.closest(".quick-tool-card");
    if (!cardElement) return;

    dragPayload = {
      type: "catalog",
      toolId: cardElement.dataset.toolId
    };
    cardElement.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(dragPayload));
  });

  list.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const cardElement = event.target.closest(".quick-tool-card");
    if (!cardElement || event.target.closest(".quick-tool-card-drag-handle")) return;

    openToolById(cardElement.dataset.toolId || "");
  });

  list.addEventListener("dragend", clearVisuals);

  slots.forEach((slotElement) => {
    const slotIndex = Number(slotElement.dataset.quickSlot);

    slotElement.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.target.closest(".quick-slot-clear")) return;
      if (isOpen || !assigned[slotIndex]) return;

      openToolById(assigned[slotIndex]);
    });

    slotElement.addEventListener("dragstart", (event) => {
      if (!isOpen || !assigned[slotIndex]) {
        event.preventDefault();
        return;
      }

      dragPayload = {
        type: "slot",
        slotIndex,
        toolId: assigned[slotIndex]
      };
      slotElement.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify(dragPayload));
    });

    slotElement.addEventListener("dragover", (event) => {
      if (!isOpen || !parsePayload(event)) return;

      event.preventDefault();
      slotElement.classList.add("is-drop-target");
      event.dataTransfer.dropEffect = "move";
    });

    slotElement.addEventListener("dragleave", () => {
      slotElement.classList.remove("is-drop-target");
    });

    slotElement.addEventListener("drop", (event) => {
      if (!isOpen) return;

      event.preventDefault();
      slotElement.classList.remove("is-drop-target");
      const payload = parsePayload(event);
      if (!payload) return;

      if (payload.type === "catalog" && payload.toolId) {
        assignTool(payload.toolId, slotIndex);
      }

      if (payload.type === "slot") {
        swapSlots(payload.slotIndex, slotIndex);
      }

      clearVisuals();
    });

    slotElement.addEventListener("dragend", clearVisuals);

    const clearBtn = slotElement.querySelector(".quick-slot-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        assigned[slotIndex] = null;
        renderSlots();
        renderToolList();
        persistSlotState();
      });
    }
  });

  setTriggerWidth(false);
  closeEditor();
  renderSlots();
  renderToolList();
})();
