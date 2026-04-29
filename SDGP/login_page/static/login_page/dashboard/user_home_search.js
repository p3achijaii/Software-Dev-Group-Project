(() => {
  const searchFieldIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
  </svg>`;

  function readJsonScriptContent(scriptId, fallbackValue) {
    const scriptElement = document.getElementById(scriptId);
    if (!scriptElement) return fallbackValue;

    try {
      return JSON.parse(scriptElement.textContent || "");
    } catch {
      return fallbackValue;
    }
  }

  const searchUrl = readJsonScriptContent("user-home-search-url", "");
  const searchConfig = readJsonScriptContent("user-home-search-config", {});
  const searchResultsTitle = searchConfig.resultsTitle || "Search results";
  const searchEmptyMessage = searchConfig.emptyMessage || "No matching people found yet.";
  const searchMinimumMessage = searchConfig.minimumMessage || "Type at least 3 letters to search.";
  const searchableFields = Array.from(document.querySelectorAll(".question_form_text"));
  const searchWrapper = searchableFields.find((fieldWrapper) => {
    const fieldLabel = fieldWrapper.querySelector("label");
    if (!fieldLabel) return false;
    return /search/i.test(fieldLabel.textContent.trim());
  });

  if (!searchWrapper) {
    return;
  }

  const searchInput = searchWrapper.querySelector("input[type='search'], input[name='search text']");
  if (!searchInput) {
    return;
  }

  searchWrapper.classList.add("has-search-icon");
  searchWrapper.classList.add("dashboard-search-wrapper");

  let searchIcon = searchWrapper.querySelector(".search-field-icon");
  if (!searchIcon) {
    searchIcon = document.createElement("button");
    searchIcon.type = "button";
    searchIcon.className = "search-field-icon";
    searchIcon.setAttribute("aria-label", "Focus search field");
    searchIcon.innerHTML = searchFieldIcon;
    searchInput.insertAdjacentElement("afterend", searchIcon);
  }

  let searchPanel = searchWrapper.querySelector(".search-inline-panel");
  let searchResults = null;
  let searchCloseButton = null;

  if (!searchPanel) {
    searchPanel = document.createElement("div");
    searchPanel.className = "search-inline-panel";
    searchPanel.setAttribute("aria-hidden", "true");

    const searchPanelHeader = document.createElement("div");
    searchPanelHeader.className = "search-inline-header d-flex justify-content-between align-items-center";

    const searchPanelTitle = document.createElement("p");
    searchPanelTitle.textContent = searchResultsTitle;

    searchCloseButton = document.createElement("button");
    searchCloseButton.type = "button";
    searchCloseButton.className = "search-inline-close";
    searchCloseButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
      </svg>
    `;

    searchResults = document.createElement("div");
    searchResults.className = "search-results-list";
    searchResults.setAttribute("aria-live", "polite");

    searchPanelHeader.appendChild(searchPanelTitle);
    searchPanelHeader.appendChild(searchCloseButton);
    searchPanel.appendChild(searchPanelHeader);
    searchPanel.appendChild(searchResults);
    searchWrapper.appendChild(searchPanel);
  } else {
    searchResults = searchPanel.querySelector(".search-results-list");
    searchCloseButton = searchPanel.querySelector(".search-inline-close");
  }

  if (!searchResults) {
    searchResults = document.createElement("div");
    searchResults.className = "search-results-list";
    searchResults.setAttribute("aria-live", "polite");
    searchPanel.appendChild(searchResults);
  }

  const DEBOUNCE_DELAY = 240;
  let debounceHandle = null;
  let activeQueryRequestId = 0;

  function openPanel() {
    searchPanel.classList.add("is-open");
    searchPanel.setAttribute("aria-hidden", "false");
  }

  function closePanel() {
    searchPanel.classList.remove("is-open");
    searchPanel.setAttribute("aria-hidden", "true");
  }

  function syncInputVisualState() {
    searchWrapper.classList.toggle("has-value", searchInput.value.trim().length > 0);
  }

  function renderEmptyState(messageText) {
    searchResults.innerHTML = "";
    const emptyParagraph = document.createElement("p");
    emptyParagraph.className = "search-empty-state";
    emptyParagraph.textContent = messageText;
    searchResults.appendChild(emptyParagraph);
  }

  function getStatusVariantClass(statusValue) {
    const normalizedStatus = statusValue.trim().toLowerCase();

    switch (normalizedStatus) {
      case "available":
        return "search-result-status--available";
      case "busy":
        return "search-result-status--busy";
      case "in meeting":
        return "search-result-status--in-meeting";
      case "working remotely":
        return "search-result-status--working-remotely";
      case "on vacation":
        return "search-result-status--on-vacation";
      case "sick leave":
        return "search-result-status--sick-leave";
      case "offline":
        return "search-result-status--offline";
      default:
        return "search-result-status--custom";
    }
  }

  function createResultCard(resultItem) {
    const card = document.createElement("article");
    card.className = "search-result-card";

    const avatarColumn = document.createElement("div");
    avatarColumn.className = "search-result-avatar-column";

    if (resultItem.avatar_url) {
      const avatarImage = document.createElement("img");
      avatarImage.className = "search-result-avatar";
      avatarImage.src = resultItem.avatar_url;
      avatarImage.alt = `${resultItem.full_name || "User"} profile picture`;
      avatarColumn.appendChild(avatarImage);
    } else {
      const resultInitial = document.createElement("span");
      resultInitial.className = "search-result-initial";
      resultInitial.textContent = resultItem.result_type === "department" ? "D" : "T";
      avatarColumn.appendChild(resultInitial);
    }

    const content = document.createElement("div");
    content.className = "search-result-content";

    const mainText = document.createElement("div");
    mainText.className = "search-result-main";

    const nameParagraph = document.createElement("p");
    nameParagraph.className = "search-result-name";
    nameParagraph.textContent = resultItem.full_name || "Unknown user";

    const roleParagraph = document.createElement("p");
    roleParagraph.className = "search-result-role";
    roleParagraph.textContent = resultItem.team_role || "Team member";

    mainText.appendChild(nameParagraph);
    mainText.appendChild(roleParagraph);

    const statusBadge = document.createElement("span");
    const normalizedStatus = (resultItem.status || "").trim() || "Offline";
    statusBadge.className = `search-result-status ${getStatusVariantClass(normalizedStatus)}`;
    statusBadge.textContent = normalizedStatus;

    const actions = document.createElement("div");
    actions.className = "search-result-actions";
    actions.appendChild(statusBadge);

    if (resultItem.message_url || resultItem.mail_to) {
      const emailButton = document.createElement("a");
      emailButton.className = "search-result-email-btn";
      emailButton.href = resultItem.message_url || resultItem.mail_to || "#";
      emailButton.setAttribute("aria-label", `E-mail ${resultItem.full_name || "user"}`);
      emailButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-envelope-plus" viewBox="0 0 16 16">
          <path d="M2 2a2 2 0 0 0-2 2v8.01A2 2 0 0 0 2 14h5.5a.5.5 0 0 0 0-1H2a1 1 0 0 1-.966-.741l5.64-3.471L8 9.583l7-4.2V8.5a.5.5 0 0 0 1 0V4a2 2 0 0 0-2-2zm3.708 6.208L1 11.105V5.383zM1 4.217V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v.217l-7 4.2z"/>
          <path d="M16 12.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0m-3.5-2a.5.5 0 0 0-.5.5v1h-1a.5.5 0 0 0 0 1h1v1a.5.5 0 0 0 1 0v-1h1a.5.5 0 0 0 0-1h-1v-1a.5.5 0 0 0-.5-.5"/>
        </svg>
      `;
      actions.appendChild(emailButton);
    } else if (resultItem.detail_url) {
      const openButton = document.createElement("a");
      openButton.className = "search-result-open-btn";
      openButton.href = resultItem.detail_url;
      openButton.setAttribute("aria-label", `Open ${resultItem.full_name || "result"}`);
      openButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-right" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793L9.146 3.354a.5.5 0 1 1 .708-.708l5 5a.5.5 0 0 1 0 .708l-5 5a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8"/>
        </svg>
      `;
      actions.appendChild(openButton);
    }
    content.appendChild(mainText);
    content.appendChild(actions);
    card.appendChild(avatarColumn);
    card.appendChild(content);
    return card;
  }

  function renderSearchResults(resultsList) {
    searchResults.innerHTML = "";

    if (!Array.isArray(resultsList) || resultsList.length === 0) {
      renderEmptyState(searchEmptyMessage);
      return;
    }

    resultsList.forEach((resultItem) => {
      searchResults.appendChild(createResultCard(resultItem));
    });
  }

  async function fetchSearchResults(queryValue, requestId) {
    if (!searchUrl) return;

    try {
      const requestUrl = new URL(searchUrl, window.location.origin);
      requestUrl.searchParams.set("query", queryValue);

      const response = await fetch(requestUrl.toString(), {
        method: "GET",
        headers: {
          "X-Requested-With": "XMLHttpRequest"
        }
      });

      if (!response.ok) {
        return;
      }

      const responseData = await response.json();
      if (requestId !== activeQueryRequestId) {
        return;
      }

      renderSearchResults(responseData.results || []);
      openPanel();
    } catch (error) {
      console.warn("Dashboard search: failed to fetch results.", error);
    }
  }

  function queueSearch() {
    const queryValue = searchInput.value.trim();
    syncInputVisualState();

    if (queryValue.length < 3) {
      activeQueryRequestId += 1;
      renderEmptyState(searchMinimumMessage);
      closePanel();
      return;
    }

    if (debounceHandle) {
      clearTimeout(debounceHandle);
    }

    const requestId = activeQueryRequestId + 1;
    activeQueryRequestId = requestId;
    debounceHandle = setTimeout(() => {
      fetchSearchResults(queryValue, requestId);
    }, DEBOUNCE_DELAY);
  }

  searchInput.addEventListener("input", queueSearch);
  searchInput.addEventListener("blur", syncInputVisualState);

  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim().length >= 3 && searchResults.children.length > 0) {
      openPanel();
    }
  });

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanel();
    }
  });

  searchIcon.addEventListener("click", () => {
    searchInput.focus();
  });

  if (searchCloseButton) {
    searchCloseButton.addEventListener("click", () => {
      closePanel();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePanel();
    }
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    if (searchPanel.contains(event.target) || searchWrapper.contains(event.target)) return;
    closePanel();
  });

  syncInputVisualState();
  renderEmptyState(searchMinimumMessage);
})();
