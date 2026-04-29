(() => {
  const teamsList = document.getElementById("teams-list");
  const searchInput = document.getElementById("teams-search-input");
  const searchClearButton = document.getElementById("teams-search-clear");
  const emptyFilterRow = document.getElementById("teams-empty-filter-row");
  const filterPanel = document.getElementById("teams-filter-panel");
  const sortPanel = document.getElementById("teams-sort-panel");
  const filterLabel = document.getElementById("teams-filter-label");
  const sortLabel = document.getElementById("teams-sort-label");

  if (!teamsList || !filterPanel || !sortPanel || !filterLabel || !sortLabel) return;

  const teamCards = Array.from(teamsList.querySelectorAll(".Block_Team"));
  const filterOptions = Array.from(filterPanel.querySelectorAll("[data-filter-value]"));
  const sortOptions = Array.from(sortPanel.querySelectorAll("[data-sort-value]"));

  const filterLabelMap = {
    all: "All teams",
    active: "Active",
    review: "On review",
    inactive: "Inactive"
  };

  const sortLabelMap = {
    "name-asc": "Name A-Z",
    "name-desc": "Name Z-A",
    "members-desc": "Members high-low",
    "members-asc": "Members low-high"
  };

  let currentFilter = "all";
  let currentSort = "name-asc";
  let currentSearch = "";

  function getTeamName(teamCard) {
    return (teamCard.dataset.teamName || "").trim();
  }

  function getTeamLead(teamCard) {
    return (teamCard.dataset.teamLead || "").trim();
  }

  function getTeamDepartment(teamCard) {
    return (teamCard.dataset.teamDepartment || "").trim();
  }

  function getTeamStatus(teamCard) {
    return (teamCard.dataset.teamStatus || "").trim().toLowerCase();
  }

  function getTeamMembers(teamCard) {
    return Number(teamCard.dataset.teamMembers || 0);
  }

  function closeOpenDropdowns() {
    setTimeout(() => {
      document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }, 0);
  }

  function markSelected(options, datasetKey, currentValue) {
    options.forEach((option) => {
      const isSelected = option.dataset[datasetKey] === currentValue;
      option.classList.toggle("is-selected", isSelected);
      option.setAttribute("aria-pressed", String(isSelected));
    });
  }

  function compareTeamCards(firstCard, secondCard) {
    const firstName = getTeamName(firstCard);
    const secondName = getTeamName(secondCard);
    const firstMemberCount = getTeamMembers(firstCard);
    const secondMemberCount = getTeamMembers(secondCard);

    if (currentSort === "members-desc" || currentSort === "members-asc") {
      const memberComparison = firstMemberCount - secondMemberCount;
      if (memberComparison !== 0) {
        return currentSort === "members-desc" ? -memberComparison : memberComparison;
      }
    }

    const nameComparison = firstName.localeCompare(secondName, undefined, {
      numeric: true,
      sensitivity: "base"
    });

    return currentSort === "name-desc" ? -nameComparison : nameComparison;
  }

  function cardMatchesCurrentState(teamCard) {
    const statusMatches = currentFilter === "all" || getTeamStatus(teamCard) === currentFilter;
    const normalizedSearch = currentSearch.toLowerCase();

    if (!statusMatches) return false;
    if (!normalizedSearch) return true;

    const searchableText = `${getTeamName(teamCard)} ${getTeamLead(teamCard)} ${getTeamDepartment(teamCard)}`.toLowerCase();
    return searchableText.includes(normalizedSearch);
  }

  function applyTeamsLayout() {
    const sortedCards = [...teamCards].sort(compareTeamCards);
    const visibleCards = [];
    let visibleCardCount = 0;

    sortedCards.forEach((teamCard) => {
      const isVisible = cardMatchesCurrentState(teamCard);
      teamCard.classList.toggle("d-none", !isVisible);
      if (isVisible) {
        visibleCardCount += 1;
        visibleCards.push(teamCard);
      }
    });

    Array.from(teamsList.querySelectorAll("[data-team-row]")).forEach((teamRow) => {
      teamRow.remove();
    });

    for (let cardIndex = 0; cardIndex < visibleCards.length; cardIndex += 4) {
      const teamRow = document.createElement("div");
      teamRow.className = "row Team_row d-flex justify-content-evenly";
      teamRow.dataset.teamRow = "true";

      visibleCards.slice(cardIndex, cardIndex + 4).forEach((teamCard) => {
        teamRow.appendChild(teamCard);
      });

      teamsList.insertBefore(teamRow, emptyFilterRow || null);
    }

    emptyFilterRow?.classList.toggle("d-none", visibleCardCount > 0);
    markSelected(filterOptions, "filterValue", currentFilter);
    markSelected(sortOptions, "sortValue", currentSort);
    filterLabel.textContent = filterLabelMap[currentFilter] || "All teams";
    sortLabel.textContent = sortLabelMap[currentSort] || "Name A-Z";
  }

  filterOptions.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.preventDefault();
      const nextFilter = option.dataset.filterValue;
      if (!nextFilter) return;
      currentFilter = nextFilter;
      applyTeamsLayout();
      closeOpenDropdowns();
    });
  });

  sortOptions.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.preventDefault();
      const nextSort = option.dataset.sortValue;
      if (!nextSort) return;
      currentSort = nextSort;
      applyTeamsLayout();
      closeOpenDropdowns();
    });
  });

  searchInput?.addEventListener("input", () => {
    currentSearch = searchInput.value.trim();
    applyTeamsLayout();
  });

  searchInput?.addEventListener("search", () => {
    currentSearch = searchInput.value.trim();
    applyTeamsLayout();
  });

  searchClearButton?.addEventListener("click", () => {
    if (!searchInput) return;
    searchInput.value = "";
    currentSearch = "";
    applyTeamsLayout();
    searchInput?.focus();
  });

  applyTeamsLayout();
})();
