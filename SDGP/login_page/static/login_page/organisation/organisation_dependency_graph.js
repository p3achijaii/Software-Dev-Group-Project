(() => {
  "use strict";

  /*
    References:
    - Force Graph docs/repo: https://github.com/vasturiano/force-graph
    - D3 force simulation concepts: https://github.com/d3/d3-force
    - Bootstrap grid/layout docs: https://getbootstrap.com/docs/5.3/layout/grid/
  */

  if (typeof ForceGraph !== "function") {
    console.warn("Organisation graph: ForceGraph import is missing.");
    return;
  }

  const $ = (id) => document.getElementById(id);

  const canvasEl = $("Organisation_graph_canvas");
  const frameEl = $("Organisation_graph_frame");
  const overlayEl = $("Organisation_graph_mode_overlay");
  const emptyEl = $("Organisation_graph_empty_state");

  if (!canvasEl || !frameEl) return;

  const ui = {
    primaryLabel: $("organisation-primary-department-label"),
    deptLabel: $("organisation-department-filter-label"),
    teamLabel: $("organisation-team-filter-label"),
    projectLabel: $("organisation-project-filter-label"),
    primaryPanel: $("organisation-primary-department-panel"),
    deptPanel: $("organisation-department-filter-panel"),
    teamPanel: $("organisation-team-filter-panel"),
    projectPanel: $("organisation-project-filter-panel"),
    chainBtn: $("organisation-chain-toggle"),
    focusBtn: $("organisation-focus-selected"),
    resetBtn: $("organisation-reset-view"),
    modeBadge: $("organisation-mode-badge"),
    infoTitle: $("organisation-info-title"),
    infoSubtitle: $("organisation-info-subtitle"),
    infoMode: $("organisation-info-mode"),
    infoNodeCount: $("organisation-info-node-count"),
    infoLinkCount: $("organisation-info-link-count"),
    infoSummary: $("organisation-info-summary"),
    infoConnections: $("organisation-info-connections"),
    infoDirectional: $("organisation-info-directional")
  };

  if (Object.values(ui).some((item) => !item)) {
    console.warn("Organisation graph: expected HTML hooks are missing.");
    return;
  }

  const MODE = {
    TEAM: "team",
    DEPARTMENT: "department"
  };

  const CFG = {
    zoomOutSwitch: 0.5,
    zoomInSwitch: 0.85,
    zoomDebounceMs: 150,
    fadeMs: 180,
    defaultZoomTeam: 0.9,
    defaultZoomDepartment: 0.62,
    maxListItems: 7,
    cooldownTicks: 72,
    alphaDecay: 0.14,
    velocityDecay: 0.52,
    teamLinkDistance: 138,
    departmentLinkDistanceBase: 210,
    departmentLinkDistanceStep: 22,
    focusZoomTeam: 1.16,
    focusZoomDepartment: 0.74,
    singleClickZoomStepTeam: 0.08,
    singleClickZoomStepDepartment: 0.06
  };

  const DEFAULT_TEAM_ROWS = [
    { Department: "Platform Engineering", "Department Head": "Ava Hart", "Team Name": "Core API", "Team Leader": "Liam Patel", "Jira Project Name": "COREAPI", "Downstream Dependencies": ["Identity Services", "Data Pipeline"], Avatar: "CA" },
    { Department: "Platform Engineering", "Department Head": "Ava Hart", "Team Name": "Identity Services", "Team Leader": "Maya Green", "Jira Project Name": "IDENTITY", "Downstream Dependencies": ["Security Operations", "Governance and Risk"], Avatar: "ID" },
    { Department: "Platform Engineering", "Department Head": "Ava Hart", "Team Name": "Dev Experience", "Team Leader": "Noah Kim", "Jira Project Name": "DXP", "Downstream Dependencies": ["Core API", "SRE Command"], Avatar: "DX" },
    { Department: "Platform Engineering", "Department Head": "Ava Hart", "Team Name": "Integration Platform", "Team Leader": "Chloe Evans", "Jira Project Name": "INTPLAT", "Downstream Dependencies": ["Core API", "Data Pipeline", "Network Engineering"], Avatar: "IP" },
    { Department: "Data and Insights", "Department Head": "Rafael Stone", "Team Name": "Data Pipeline", "Team Leader": "Ivy Perez", "Jira Project Name": "DATAPIPE", "Downstream Dependencies": ["Cloud Foundation", "Security Operations"], Avatar: "DP" },
    { Department: "Data and Insights", "Department Head": "Rafael Stone", "Team Name": "Analytics Studio", "Team Leader": "Ethan Park", "Jira Project Name": "ANALYTICS", "Downstream Dependencies": ["Data Pipeline", "Reporting Ops"], Avatar: "AS" },
    { Department: "Data and Insights", "Department Head": "Rafael Stone", "Team Name": "Reporting Ops", "Team Leader": "Grace Lin", "Jira Project Name": "REPORTS", "Downstream Dependencies": ["Core API"], Avatar: "RO" },
    { Department: "Customer Experience", "Department Head": "Sophia Malik", "Team Name": "Mobile App", "Team Leader": "Harper Bell", "Jira Project Name": "MOBILE", "Downstream Dependencies": ["Core API", "Identity Services", "Analytics Studio"], Avatar: "MA" },
    { Department: "Customer Experience", "Department Head": "Sophia Malik", "Team Name": "Web Portal", "Team Leader": "Leo Foster", "Jira Project Name": "WEBPORT", "Downstream Dependencies": ["Core API", "Identity Services", "Analytics Studio"], Avatar: "WP" },
    { Department: "Customer Experience", "Department Head": "Sophia Malik", "Team Name": "Customer Success Tech", "Team Leader": "Nora Diaz", "Jira Project Name": "CSOPS", "Downstream Dependencies": ["Web Portal", "Reporting Ops"], Avatar: "CS" },
    { Department: "Security and Compliance", "Department Head": "Victor Alvarado", "Team Name": "Security Operations", "Team Leader": "Olivia Reed", "Jira Project Name": "SECOPS", "Downstream Dependencies": ["SRE Command"], Avatar: "SO" },
    { Department: "Security and Compliance", "Department Head": "Victor Alvarado", "Team Name": "Governance and Risk", "Team Leader": "Mason Price", "Jira Project Name": "GRC", "Downstream Dependencies": ["Finance Systems", "People Ops Systems"], Avatar: "GR" },
    { Department: "Business Operations", "Department Head": "Elena Fox", "Team Name": "Finance Systems", "Team Leader": "Zoe Khan", "Jira Project Name": "FINOPS", "Downstream Dependencies": ["Core API", "Data Pipeline"], Avatar: "FI" },
    { Department: "Business Operations", "Department Head": "Elena Fox", "Team Name": "People Ops Systems", "Team Leader": "Ariana West", "Jira Project Name": "PEOPLE", "Downstream Dependencies": ["Identity Services"], Avatar: "PO" },
    { Department: "Infrastructure", "Department Head": "Jonas Cole", "Team Name": "Cloud Foundation", "Team Leader": "Felix Moore", "Jira Project Name": "CLOUD", "Downstream Dependencies": ["Network Engineering"], Avatar: "CF" },
    { Department: "Infrastructure", "Department Head": "Jonas Cole", "Team Name": "SRE Command", "Team Leader": "Mila Turner", "Jira Project Name": "SRE", "Downstream Dependencies": ["Cloud Foundation"], Avatar: "SR" },
    { Department: "Infrastructure", "Department Head": "Jonas Cole", "Team Name": "Network Engineering", "Team Leader": "Parker Brooks", "Jira Project Name": "NETWORK", "Downstream Dependencies": ["SRE Command"], Avatar: "NE" }
  ];
  const TEAM_ROWS = parseOrganisationRows("organisation-team-rows", DEFAULT_TEAM_ROWS);

  const allDepartments = uniqueValues(TEAM_ROWS, "Department");

  const FILTER_KEY = {
    PRIMARY: "primary",
    DEPARTMENT: "department",
    TEAM: "team",
    PROJECT: "project"
  };

  const state = {
    mode: MODE.TEAM,
    models: {
      [MODE.TEAM]: emptyModel(),
      [MODE.DEPARTMENT]: emptyModel()
    },
    primaryDepartment: null,
    selectedDepartments: new Set(),
    selectedTeams: new Set(),
    selectedProjects: new Set(),
    selectedNodeId: null,
    selectedNodeMode: null,
    hoveredNodeId: null,
    highlightNodes: new Set(),
    highlightLinks: new Set(),
    upstreamNodes: new Set(),
    downstreamNodes: new Set(),
    dependenciesRevealed: false,
    fullChain: false,
    switchingMode: false,
    overlayTimer: null,
    refreshRaf: null,
    semanticZoomMutedUntil: 0,
    lastNodeClickId: null,
    lastNodeClickAt: 0,
    lastFilterHash: null,
    zoomDebounceTimer: null,
    pendingZoomK: null
  };

  const dropdown = wireDropdowns();

  const graph = ForceGraph()(canvasEl)
    .backgroundColor("rgba(0,0,0,0)")
    .nodeId("id")
    .linkWidth(linkWidth)
    .linkColor(linkColor)
    .linkDirectionalArrowLength((link) =>
      state.mode === MODE.DEPARTMENT ? Math.min(10, 5 + (link.weight || 1)) : 5
    )
    .linkDirectionalArrowRelPos(1)
    .linkDirectionalArrowColor(linkColor)
    .nodeCanvasObject(drawNode)
    .nodePointerAreaPaint(drawNodePointer)
    .onNodeClick((node) => {
      if (!node) return;
      dropdown.closeAll();
      handleNodeClick(node);
    })
    .onNodeHover((node) => {
      const nextId = node ? node.id : null;
      if (state.hoveredNodeId === nextId) return;
      state.hoveredNodeId = nextId;
      requestGraphRefresh();
    })
    .onBackgroundClick(() => {
      dropdown.closeAll();
      clearSelected(true);
    })
    .onNodeDragEnd((node) => {
      node.fx = node.x;
      node.fy = node.y;
    })
    .onZoom(({ k }) => onZoomSemanticSwitchDebounced(k))
    .cooldownTicks(CFG.cooldownTicks)
    .d3AlphaDecay(CFG.alphaDecay)
    .d3VelocityDecay(CFG.velocityDecay);

  wireFilterPanels();
  wireControls();
  rebuildModels();
  resizeGraph();
  applyCurrentModel(false);
  updateFilterLabels();
  updateModeBadge();
  updateInfoPanel();
  resetView(false);
  wireResponsiveSizing();

  function parseOrganisationRows(scriptId, fallbackRows) {
    const rowsScript = document.getElementById(scriptId);
    if (!rowsScript || !rowsScript.textContent) return fallbackRows;

    try {
      const rawRows = JSON.parse(rowsScript.textContent);
      if (!Array.isArray(rawRows)) return fallbackRows;

      const normalizedRows = rawRows
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          return {
            Department: String(row["Department"] || "").trim(),
            "Department Head": String(row["Department Head"] || "").trim(),
            "Team Name": String(row["Team Name"] || "").trim(),
            "Team Leader": String(row["Team Leader"] || "").trim(),
            "Jira Project Name": String(row["Jira Project Name"] || "").trim(),
            "Downstream Dependencies": Array.isArray(row["Downstream Dependencies"])
              ? row["Downstream Dependencies"].map((item) => String(item || "").trim()).filter(Boolean)
              : [],
            Avatar: String(row.Avatar || "").trim()
          };
        })
        .filter((row) => row && row["Team Name"]);

      return normalizedRows.length > 0 ? normalizedRows : fallbackRows;
    } catch (error) {
      console.warn("Organisation graph: invalid organisation rows JSON payload.", error);
      return fallbackRows;
    }
  }

  function emptyModel() {
    return {
      data: { nodes: [], links: [] },
      index: { nodeById: new Map(), outgoing: new Map(), incoming: new Map() }
    };
  }

  function uniqueValues(rows, key) {
    return Array.from(new Set(rows.map((row) => String(row[key] || "").trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }

  function depsFrom(raw) {
    if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
    if (typeof raw === "string") return raw.split(",").map((x) => x.trim()).filter(Boolean);
    return [];
  }

  function filteredRows() {
    const hasPrimary = Boolean(state.primaryDepartment);
    const hasDept = state.selectedDepartments.size > 0;
    const hasTeams = state.selectedTeams.size > 0;
    const hasProjects = state.selectedProjects.size > 0;

    return TEAM_ROWS.filter((row) => {
      if (hasPrimary && row["Department"] !== state.primaryDepartment) return false;
      if (hasDept && !state.selectedDepartments.has(row["Department"])) return false;
      if (hasTeams && !state.selectedTeams.has(row["Team Name"])) return false;
      if (hasProjects && !state.selectedProjects.has(row["Jira Project Name"])) return false;
      return true;
    });
  }

  function filterDomainRows() {
    if (!state.primaryDepartment) return TEAM_ROWS;
    return TEAM_ROWS.filter((row) => row["Department"] === state.primaryDepartment);
  }

  function domainValues(filterKey) {
    const rows = filterDomainRows();
    if (filterKey === FILTER_KEY.TEAM) return uniqueValues(rows, "Team Name");
    if (filterKey === FILTER_KEY.PROJECT) return uniqueValues(rows, "Jira Project Name");
    return uniqueValues(rows, "Department");
  }

  function teamOptionRows() {
    let rows = filterDomainRows();
    if (state.selectedDepartments.size > 0) {
      rows = rows.filter((row) => state.selectedDepartments.has(row["Department"]));
    }
    return rows;
  }

  function teamOptionValues() {
    return uniqueValues(teamOptionRows(), "Team Name");
  }

  function projectOptionRows() {
    let rows = teamOptionRows();
    if (state.selectedTeams.size > 0) {
      rows = rows.filter((row) => state.selectedTeams.has(row["Team Name"]));
    }
    return rows;
  }

  function projectOptionValues() {
    return uniqueValues(projectOptionRows(), "Jira Project Name");
  }

  function teamOptionsWithDepartment() {
    return teamOptionRows()
      .map((row) => ({
        team: row["Team Name"],
        department: row["Department"]
      }))
      .sort((a, b) =>
        a.team.localeCompare(b.team, undefined, { sensitivity: "base" })
      );
  }

  function buildFilterHash() {
    return [
      state.primaryDepartment || "",
      Array.from(state.selectedDepartments).sort().join("|"),
      Array.from(state.selectedTeams).sort().join("|"),
      Array.from(state.selectedProjects).sort().join("|")
    ].join("::");
  }

  function rebuildModels() {
    const filterHash = buildFilterHash();
    const filterChanged = state.lastFilterHash !== null && filterHash !== state.lastFilterHash;
    state.lastFilterHash = filterHash;

    const positions = snapshotNodePositions();
    if (filterChanged) {
      [MODE.TEAM, MODE.DEPARTMENT].forEach((mode) => {
        positions[mode].forEach((entry) => {
          entry.fx = null;
          entry.fy = null;
        });
      });
    }

    const rows = filteredRows();
    const team = buildTeamModel(rows, positions[MODE.TEAM]);
    const department = buildDepartmentModel(rows, team.data.links, positions[MODE.DEPARTMENT]);
    state.models[MODE.TEAM] = team;
    state.models[MODE.DEPARTMENT] = department;
  }

  function snapshotNodePositions() {
    const positions = {
      [MODE.TEAM]: new Map(),
      [MODE.DEPARTMENT]: new Map()
    };

    [MODE.TEAM, MODE.DEPARTMENT].forEach((mode) => {
      const nodes = state.models[mode]?.data?.nodes || [];
      nodes.forEach((node) => {
        if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
        positions[mode].set(node.id, {
          x: node.x,
          y: node.y,
          fx: Number.isFinite(node.fx) ? node.fx : null,
          fy: Number.isFinite(node.fy) ? node.fy : null
        });
      });
    });

    return positions;
  }

  function applyNodePosition(node, positionMap, jitter = 0) {
    const existing = positionMap?.get(node.id);
    if (!existing) return node;
    node.x = existing.x;
    node.y = existing.y;
    if (Number.isFinite(existing.fx)) node.fx = existing.fx;
    if (Number.isFinite(existing.fy)) node.fy = existing.fy;
    if (!jitter) return node;
    node.x += (Math.random() - 0.5) * jitter;
    node.y += (Math.random() - 0.5) * jitter;
    return node;
  }

  function buildTeamModel(rows, positionMap) {
    const byTeam = new Map(rows.map((row) => [row["Team Name"], row]));
    const depOrder = new Map(allDepartments.map((name, index) => [name, index]));
    const slotByDepartment = new Map();

    const nodes = rows.map((row) => {
      const depIndex = depOrder.get(row["Department"]) || 0;
      const slot = slotByDepartment.get(row["Department"]) || 0;
      slotByDepartment.set(row["Department"], slot + 1);
      const lane = depIndex % 3;
      const band = Math.floor(depIndex / 3);
      const localColumn = slot % 2;
      const localRow = Math.floor(slot / 2);
      const node = {
        id: row["Team Name"],
        type: MODE.TEAM,
        teamName: row["Team Name"],
        department: row["Department"],
        departmentHead: row["Department Head"],
        teamLeader: row["Team Leader"],
        projectName: row["Jira Project Name"],
        avatar: row["Avatar"] || initials(row["Team Name"]),
        x: lane * 520 + localColumn * 170 + (Math.random() - 0.5) * 70,
        y: band * 380 + localRow * 140 + (Math.random() - 0.5) * 70
      };
      return applyNodePosition(node, positionMap, 2.5);
    });

    const links = [];
    const seen = new Set();

    rows.forEach((row) => {
      const source = row["Team Name"];
      depsFrom(row["Downstream Dependencies"]).forEach((target) => {
        if (!byTeam.has(target)) return;
        const id = `${source}=>${target}`;
        if (seen.has(id)) return;
        seen.add(id);
        links.push({ id, source, target, weight: 1, mode: MODE.TEAM });
      });
    });

    const data = { nodes, links };
    return { data, index: buildIndex(data) };
  }

  function buildDepartmentModel(rows, _teamLinks, positionMap) {
    const teamsByDept = new Map();
    const headByDept = new Map();
    rows.forEach((row) => {
      const dep = row["Department"];
      if (!teamsByDept.has(dep)) teamsByDept.set(dep, []);
      teamsByDept.get(dep).push(row["Team Name"]);
      if (!headByDept.has(dep)) headByDept.set(dep, row["Department Head"]);
    });

    const visibleDepartments = new Set(rows.map((row) => row["Department"]));
    const teamDept = new Map(TEAM_ROWS.map((row) => [row["Team Name"], row["Department"]]));
    const byEdge = new Map();

    TEAM_ROWS.forEach((row) => {
      const sourceTeam = row["Team Name"];
      const sourceDept = row["Department"];
      if (!visibleDepartments.has(sourceDept)) return;

      depsFrom(row["Downstream Dependencies"]).forEach((targetTeam) => {
        const targetDept = teamDept.get(targetTeam);
        if (!targetDept || !visibleDepartments.has(targetDept) || sourceDept === targetDept) return;

        const id = `${sourceDept}=>${targetDept}`;
        const existing = byEdge.get(id);
        if (existing) {
          existing.weight += 1;
          existing.pairs.push(`${sourceTeam} -> ${targetTeam}`);
        } else {
          byEdge.set(id, {
            id,
            source: sourceDept,
            target: targetDept,
            weight: 1,
            pairs: [`${sourceTeam} -> ${targetTeam}`],
            mode: MODE.DEPARTMENT
          });
        }
        });
    });

    const load = new Map();
    byEdge.forEach((link) => {
      load.set(link.source, (load.get(link.source) || 0) + link.weight);
      load.set(link.target, (load.get(link.target) || 0) + link.weight);
    });

    const nodes = Array.from(teamsByDept.entries()).map(([dep, teams], index) => {
      const lane = index % 3;
      const band = Math.floor(index / 3);
      const node = {
        id: dep,
        type: MODE.DEPARTMENT,
        department: dep,
        departmentHead: headByDept.get(dep) || "Unknown",
        teamCount: teams.length,
        crossDependencyCount: load.get(dep) || 0,
        x: lane * 560 + (Math.random() - 0.5) * 160,
        y: band * 420 + (Math.random() - 0.5) * 150
      };
      return applyNodePosition(node, positionMap, 2.8);
    });

    const data = { nodes, links: Array.from(byEdge.values()) };
    return { data, index: buildIndex(data) };
  }

  function buildIndex(data) {
    const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
    const outgoing = new Map();
    const incoming = new Map();

    data.nodes.forEach((node) => {
      outgoing.set(node.id, []);
      incoming.set(node.id, []);
    });

    data.links.forEach((link) => {
      const source = nodeId(link.source);
      const target = nodeId(link.target);
      if (!outgoing.has(source)) outgoing.set(source, []);
      if (!incoming.has(target)) incoming.set(target, []);
      outgoing.get(source).push(link);
      incoming.get(target).push(link);
    });

    return { nodeById, outgoing, incoming };
  }

  function wireDropdowns() {
    const entries = Array.from(document.querySelectorAll(".top-icon-trigger[aria-controls]"))
      .map((trigger) => {
        const panelId = trigger.getAttribute("aria-controls");
        if (!panelId) return null;
        const panel = document.getElementById(panelId);
        if (!panel) return null;
        return { trigger, panel, panelId, open: false };
      })
      .filter(Boolean);

    const close = (entry) => {
      entry.open = false;
      entry.panel.classList.remove("is-open");
      entry.panel.setAttribute("aria-hidden", "true");
      entry.trigger.setAttribute("aria-expanded", "false");
      entry.trigger.classList.remove("is-active");
    };

    const closeAll = (except = null) => {
      entries.forEach((entry) => {
        if (entry === except) return;
        close(entry);
      });
    };

    const toggle = (entry) => {
      if (entry.open) {
        close(entry);
        return;
      }
      closeAll(entry);
      entry.open = true;
      entry.panel.classList.add("is-open");
      entry.panel.setAttribute("aria-hidden", "false");
      entry.trigger.setAttribute("aria-expanded", "true");
      entry.trigger.classList.add("is-active");
    };

    entries.forEach((entry) => {
      entry.trigger.addEventListener("click", (event) => {
        event.preventDefault();
        toggle(entry);
      });
      entry.trigger.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        toggle(entry);
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeAll();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      entries.forEach((entry) => {
        if (!entry.open) return;
        if (entry.panel.contains(target) || entry.trigger.contains(target)) return;
        close(entry);
      });
    });

    closeAll();

    return {
      closeById(panelId) {
        const entry = entries.find((item) => item.panelId === panelId);
        if (entry) close(entry);
      },
      closeAll() {
        closeAll();
      }
    };
  }

  function wireFilterPanels() {
    renderFilters();
  }

  function renderFilters() {
    renderPrimaryFilter(allDepartments);
    renderMultiFilter(
      ui.deptPanel,
      domainValues(FILTER_KEY.DEPARTMENT),
      state.selectedDepartments,
      "All departments",
      "Department scope (multi-select)",
      () => onFiltersChanged(true)
    );
    renderTeamFilter();
    renderMultiFilter(
      ui.projectPanel,
      projectOptionValues(),
      state.selectedProjects,
      "All projects",
      "Jira project filter (optional)",
      () => onFiltersChanged(true)
    );
  }

  function renderPrimaryFilter(options) {
    const panel = ui.primaryPanel;
    panel.innerHTML = "";

    panel.appendChild(filterTitle("Single department focus"));
    panel.appendChild(filterButton("All departments", !state.primaryDepartment, () => {
      state.primaryDepartment = null;
      onFiltersChanged(true);
      dropdown.closeById("organisation-primary-department-panel");
    }));

    options.forEach((name) => {
      panel.appendChild(filterButton(name, state.primaryDepartment === name, () => {
        state.primaryDepartment = name;
        onFiltersChanged(true);
        dropdown.closeById("organisation-primary-department-panel");
      }));
    });

    if (options.length === 0) {
      panel.appendChild(filterHint("No departments match current selection."));
      return;
    }
    panel.appendChild(filterHint("Use this as a strict single-department lens."));
  }

  function renderMultiFilter(panel, options, selectedSet, allLabel, title, onChange) {
    panel.innerHTML = "";
    panel.appendChild(filterTitle(title));

    panel.appendChild(filterButton(allLabel, selectedSet.size === 0, () => {
      selectedSet.clear();
      onChange();
    }));

    options.forEach((value) => {
      panel.appendChild(filterButton(value, selectedSet.has(value), () => {
        if (selectedSet.has(value)) selectedSet.delete(value);
        else selectedSet.add(value);
        onChange();
      }));
    });

    if (options.length === 0) {
      panel.appendChild(filterHint("No options available with current filters."));
      return;
    }

    panel.appendChild(filterHint("Toggle selected items to include them in the graph."));
  }

  function renderTeamFilter() {
    const panel = ui.teamPanel;
    panel.innerHTML = "";
    panel.appendChild(filterTitle("Team selection (multi-select)"));

    panel.appendChild(filterButton("All teams", state.selectedTeams.size === 0, () => {
      state.selectedTeams.clear();
      onFiltersChanged(true);
    }));

    const options = teamOptionsWithDepartment();
    options.forEach((option) => {
      panel.appendChild(filterButton(
        option.team,
        state.selectedTeams.has(option.team),
        () => {
          if (state.selectedTeams.has(option.team)) state.selectedTeams.delete(option.team);
          else state.selectedTeams.add(option.team);
          onFiltersChanged(true);
        },
        {
          richTeamOption: true,
          iconColor: deptColor(option.department, 0.9),
          badgeText: initials(option.team),
          metaText: option.department
        }
      ));
    });

    if (options.length === 0) {
      panel.appendChild(filterHint("No teams available with current department scope."));
      return;
    }

    panel.appendChild(teamLegend(options));
    panel.appendChild(filterHint("Team colours map to department colours in the legend."));
  }

  function teamLegend(options) {
    const container = document.createElement("div");
    container.className = "organisation-team-legend";

    const heading = document.createElement("p");
    heading.className = "organisation-filter-group-title organisation-team-legend-title";
    heading.textContent = "Department legend";
    container.appendChild(heading);

    sortedUnique(options.map((option) => option.department)).forEach((department) => {
      const row = document.createElement("div");
      row.className = "organisation-team-legend-item";

      const swatch = document.createElement("span");
      swatch.className = "organisation-team-swatch";
      swatch.style.backgroundColor = deptColor(department, 0.86);

      const label = document.createElement("span");
      label.className = "organisation-team-legend-label";
      label.textContent = department;

      row.appendChild(swatch);
      row.appendChild(label);
      container.appendChild(row);
    });

    return container;
  }

  function filterTitle(text) {
    const node = document.createElement("p");
    node.className = "organisation-filter-group-title";
    node.textContent = text;
    return node;
  }

  function filterHint(text) {
    const node = document.createElement("p");
    node.className = "organisation-filter-hint";
    node.textContent = text;
    return node;
  }

  function filterButton(text, selected, onClick, options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "top-dropdown-action";
    if (selected) button.classList.add("is-selected");
    button.setAttribute("aria-pressed", String(selected));

    if (!options.richTeamOption) {
      button.textContent = text;
    } else {
      button.classList.add("organisation-team-option");
      button.setAttribute("aria-label", `${text} (${options.metaText || "team"})`);

      const iconCell = document.createElement("span");
      iconCell.className = "organisation-team-option-icon-cell";

      const iconBadge = document.createElement("span");
      iconBadge.className = "organisation-team-option-icon";
      if (options.iconColor) iconBadge.style.backgroundColor = options.iconColor;
      iconBadge.textContent = String(options.badgeText || "T").slice(0, 2).toUpperCase();
      iconCell.appendChild(iconBadge);

      const textWrap = document.createElement("span");
      textWrap.className = "organisation-team-option-text";

      const teamName = document.createElement("span");
      teamName.className = "organisation-team-option-name";
      teamName.textContent = text;

      const teamMeta = document.createElement("span");
      teamMeta.className = "organisation-team-option-meta";
      teamMeta.textContent = options.metaText || "";

      textWrap.appendChild(teamName);
      textWrap.appendChild(teamMeta);
      button.appendChild(iconCell);
      button.appendChild(textWrap);
    }

    button.addEventListener("click", onClick);
    return button;
  }

  function onFiltersChanged(preserveViewport) {
    reconcileSelections();
    rebuildModels();
    applyCurrentModel(preserveViewport);
    renderFilters();
    updateFilterLabels();
    updateInfoPanel();
  }

  function reconcileSelections() {
    pruneSelection(state.selectedDepartments, new Set(domainValues(FILTER_KEY.DEPARTMENT)));
    pruneSelection(state.selectedTeams, new Set(teamOptionValues()));
    pruneSelection(state.selectedProjects, new Set(projectOptionValues()));

    const allowedPrimary = new Set(allDepartments);
    if (state.primaryDepartment && !allowedPrimary.has(state.primaryDepartment)) {
      state.primaryDepartment = null;
    }
  }

  function pruneSelection(setRef, allowedValues) {
    let changed = false;
    Array.from(setRef).forEach((value) => {
      if (allowedValues.has(value)) return;
      setRef.delete(value);
      changed = true;
    });
    return changed;
  }

  function updateFilterLabels() {
    ui.primaryLabel.textContent = `Primary: ${state.primaryDepartment || "All departments"}`;
    ui.deptLabel.textContent = setSummary("Departments", state.selectedDepartments);
    ui.teamLabel.textContent = setSummary("Teams", state.selectedTeams);
    ui.projectLabel.textContent = setSummary("Projects", state.selectedProjects);
  }

  function setSummary(label, values) {
    if (values.size === 0) return `${label}: All`;
    const arr = Array.from(values);
    if (arr.length === 1) return `${label}: ${arr[0]}`;
    if (arr.length === 2) return `${label}: ${arr[0]}, ${arr[1]}`;
    return `${label}: ${arr.length} selected`;
  }

  function applyCurrentModel(preserveViewport) {
    const model = state.models[state.mode];
    const snapshot = preserveViewport ? viewport() : null;

    graph.graphData(model.data);
    configureSimulation();
    graph.d3ReheatSimulation();

    if (snapshot) {
      graph.centerAt(snapshot.x, snapshot.y, 0);
      graph.zoom(snapshot.zoom, 0);
    }

    syncEmpty(model.data.nodes.length === 0);
    validateSelection();
    updateControlStates();
    requestGraphRefresh();
    updateModeBadge();
  }

  function configureSimulation() {
    if (state.mode === MODE.DEPARTMENT) {
      graph.d3Force("charge").strength(-420);
      graph.d3Force("link").distance((link) => CFG.departmentLinkDistanceBase + (link.weight || 1) * CFG.departmentLinkDistanceStep);
      return;
    }
    graph.d3Force("charge").strength(-260);
    graph.d3Force("link").distance(CFG.teamLinkDistance);
  }

  function validateSelection() {
    if (!state.selectedNodeId) {
      clearHighlight();
      return;
    }
    const model = state.models[state.mode];
    if (state.selectedNodeMode === state.mode && model.index.nodeById.has(state.selectedNodeId)) {
      calculateHighlight();
      return;
    }
    clearSelected(false);
  }

  function nodeId(nodeOrId) {
    if (typeof nodeOrId === "string") return nodeOrId;
    if (nodeOrId && typeof nodeOrId === "object") return nodeOrId.id;
    return "";
  }

  function wireControls() {
    ui.chainBtn.addEventListener("click", () => {
      dropdown.closeAll();
      if (ui.chainBtn.disabled) return;
      state.fullChain = !state.fullChain;
      if (state.selectedNodeId && state.selectedNodeMode === state.mode) {
        calculateHighlight();
        requestGraphRefresh();
      }
      updateControlStates();
      updateInfoPanel();
    });

    ui.resetBtn.addEventListener("click", () => {
      dropdown.closeAll();
      resetView(true);
    });

    ui.focusBtn.addEventListener("click", () => {
      dropdown.closeAll();
      if (ui.focusBtn.disabled) return;
      revealDependenciesAndFocus(true);
    });

    updateControlStates();
  }

  function handleNodeClick(node) {
    const now = Date.now();
    const selectedSameNode = state.selectedNodeId === node.id && state.selectedNodeMode === state.mode;
    const isDoubleClick =
      selectedSameNode &&
      state.lastNodeClickId === node.id &&
      now - state.lastNodeClickAt <= 320;

    state.lastNodeClickId = node.id;
    state.lastNodeClickAt = now;

    if (isDoubleClick) {
      revealDependenciesAndFocus(true);
      return;
    }

    selectNodeOnly(node.id, true);
  }

  function selectNodeOnly(nodeIdValue, focusCamera) {
    state.dependenciesRevealed = false;
    setSelected(nodeIdValue, state.mode, true);
    if (focusCamera) centerCameraOnSelected(280, true);
  }

  function revealDependenciesAndFocus(animated) {
    if (!state.selectedNodeId || state.selectedNodeMode !== state.mode) {
      resetView(Boolean(animated));
      return;
    }
    state.dependenciesRevealed = true;
    calculateHighlight();
    updateControlStates();
    updateInfoPanel();
    requestGraphRefresh();
    fitSelectionAroundSelected(Boolean(animated));
  }

  function centerCameraOnSelected(durationMs, zoomStep = false) {
    const node = selectedNode();
    if (!node || !Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
    const duration = Math.max(0, durationMs || 0);
    muteSemanticZoom(duration);
    graph.centerAt(node.x, node.y, duration);
    if (!zoomStep) return;

    const step = state.mode === MODE.TEAM ? CFG.singleClickZoomStepTeam : CFG.singleClickZoomStepDepartment;
    const targetZoom = clamp(graph.zoom() + step, 0.2, 2.2);
    graph.zoom(targetZoom, duration);
  }

  function fitSelectionAroundSelected(animated) {
    const node = selectedNode();
    if (!node || !Number.isFinite(node.x) || !Number.isFinite(node.y)) return;

    const duration = animated ? 420 : 0;
    const width = frameEl.clientWidth;
    const height = frameEl.clientHeight;
    if (width <= 0 || height <= 0) {
      centerCameraOnSelected(duration);
      return;
    }

    const focusIds = new Set([node.id]);
    state.highlightNodes.forEach((id) => focusIds.add(id));
    const model = state.models[state.mode];
    const focusNodes = Array.from(focusIds)
      .map((id) => model.index.nodeById.get(id))
      .filter((item) => item && Number.isFinite(item.x) && Number.isFinite(item.y));

    if (focusNodes.length <= 1) {
      const targetZoom = state.mode === MODE.TEAM ? Math.max(CFG.focusZoomTeam, graph.zoom()) : Math.max(CFG.focusZoomDepartment, graph.zoom());
      muteSemanticZoom(duration);
      graph.centerAt(node.x, node.y, duration);
      graph.zoom(targetZoom, duration);
      return;
    }

    let maxDx = 0;
    let maxDy = 0;
    focusNodes.forEach((item) => {
      maxDx = Math.max(maxDx, Math.abs(item.x - node.x));
      maxDy = Math.max(maxDy, Math.abs(item.y - node.y));
    });

    const pad = 72;
    const halfW = Math.max(70, width / 2 - pad);
    const halfH = Math.max(70, height / 2 - pad);
    const zoomX = maxDx > 0 ? halfW / (maxDx + 56) : Number.POSITIVE_INFINITY;
    const zoomY = maxDy > 0 ? halfH / (maxDy + 40) : Number.POSITIVE_INFINITY;
    const targetZoom = clamp(Math.min(zoomX, zoomY), 0.2, 2.2);

    muteSemanticZoom(duration);
    graph.centerAt(node.x, node.y, duration);
    graph.zoom(targetZoom, duration);
  }

  function selectedNode() {
    const model = state.models[state.mode];
    if (!model || !state.selectedNodeId || state.selectedNodeMode !== state.mode) return null;
    return model.index.nodeById.get(state.selectedNodeId) || null;
  }

  function onZoomSemanticSwitch(k) {
    if (state.switchingMode || Date.now() < state.semanticZoomMutedUntil) return;
    if (state.mode === MODE.TEAM && k <= CFG.zoomOutSwitch) {
      switchMode(MODE.DEPARTMENT);
      return;
    }
    if (state.mode === MODE.DEPARTMENT && k >= CFG.zoomInSwitch) {
      switchMode(MODE.TEAM);
    }
  }

  function onZoomSemanticSwitchDebounced(k) {
    state.pendingZoomK = k;
    if (state.zoomDebounceTimer) return;
    state.zoomDebounceTimer = window.setTimeout(() => {
      state.zoomDebounceTimer = null;
      const settledK = state.pendingZoomK;
      state.pendingZoomK = null;
      if (Number.isFinite(settledK)) onZoomSemanticSwitch(settledK);
    }, CFG.zoomDebounceMs);
  }

  function switchMode(nextMode) {
    if (state.mode === nextMode) return;
    const selectedSnapshot = state.selectedNodeId
      ? { id: state.selectedNodeId, mode: state.selectedNodeMode }
      : null;
    const view = viewport();

    state.switchingMode = true;
    canvasEl.classList.add("is-fading");
    showOverlay(nextMode === MODE.TEAM ? "Team graph" : "Department graph");

    window.setTimeout(() => {
      let appliedDrilldown = false;
      if (nextMode === MODE.TEAM && selectedSnapshot?.mode === MODE.DEPARTMENT) {
        appliedDrilldown = applyDepartmentDrilldownFilters(selectedSnapshot.id);
      }

      const nextModel = state.models[nextMode];
      if (!nextModel || nextModel.data.nodes.length === 0) {
        canvasEl.classList.remove("is-fading");
        state.switchingMode = false;
        return;
      }

      state.mode = nextMode;
      applyCurrentModel(false);

      if (view && !appliedDrilldown) {
        graph.centerAt(view.x, view.y, 220);
        graph.zoom(view.zoom, 220);
      } else if (appliedDrilldown) {
        muteSemanticZoom(0);
        if (typeof graph.zoomToFit === "function") {
          graph.zoomToFit(0, 70, (node) => nextModel.index.nodeById.has(nodeId(node)));
        }
      }

      const mapped = mapSelection(selectedSnapshot, nextMode);
      if (mapped) setSelected(mapped, nextMode, false);
      else clearSelected(false);

      updateInfoPanel();
      requestGraphRefresh();

      window.setTimeout(() => {
        canvasEl.classList.remove("is-fading");
        state.switchingMode = false;
      }, CFG.fadeMs);
    }, CFG.fadeMs * 0.55);
  }

  function applyDepartmentDrilldownFilters(seedDepartmentId) {
    const scope = relatedDepartmentScope(seedDepartmentId);
    if (scope.size === 0) return false;

    state.selectedDepartments = new Set(scope);
    state.selectedTeams.clear();
    state.selectedProjects.clear();
    if (state.primaryDepartment && !scope.has(state.primaryDepartment)) {
      state.primaryDepartment = null;
    }

    reconcileSelections();
    rebuildModels();
    renderFilters();
    updateFilterLabels();
    return true;
  }

  function relatedDepartmentScope(seedDepartmentId) {
    const model = state.models[MODE.DEPARTMENT];
    if (!model || !model.index.nodeById.has(seedDepartmentId)) return new Set();

    const scope = new Set([seedDepartmentId]);
    const upstream = walkOnModel(model, seedDepartmentId, "up", state.fullChain);
    const downstream = walkOnModel(model, seedDepartmentId, "down", state.fullChain);

    upstream.nodes.forEach((id) => scope.add(id));
    downstream.nodes.forEach((id) => scope.add(id));
    return scope;
  }

  function mapSelection(snapshot, mode) {
    if (!snapshot) return null;
    const model = state.models[mode];
    if (!model) return null;

    if (snapshot.mode === mode && model.index.nodeById.has(snapshot.id)) return snapshot.id;

    if (snapshot.mode === MODE.TEAM && mode === MODE.DEPARTMENT) {
      const teamNode = state.models[MODE.TEAM].index.nodeById.get(snapshot.id);
      const dep = teamNode?.department;
      if (dep && model.index.nodeById.has(dep)) return dep;
    }

    if (snapshot.mode === MODE.DEPARTMENT && mode === MODE.TEAM) {
      const firstTeam = state.models[MODE.TEAM].data.nodes.find((node) => node.department === snapshot.id);
      if (firstTeam && model.index.nodeById.has(firstTeam.id)) return firstTeam.id;
    }

    return null;
  }

  function setSelected(nodeIdValue, mode, refresh) {
    const model = state.models[mode];
    if (!model || !model.index.nodeById.has(nodeIdValue)) {
      clearSelected(refresh);
      return;
    }
    state.selectedNodeId = nodeIdValue;
    state.selectedNodeMode = mode;
    calculateHighlight();
    updateControlStates();
    if (refresh) {
      requestGraphRefresh();
      updateInfoPanel();
    }
  }

  function clearSelected(refresh) {
    state.selectedNodeId = null;
    state.selectedNodeMode = null;
    state.hoveredNodeId = null;
    state.dependenciesRevealed = false;
    state.lastNodeClickId = null;
    state.lastNodeClickAt = 0;
    clearHighlight();
    updateControlStates();
    if (refresh) {
      requestGraphRefresh();
      updateInfoPanel();
    }
  }

  function clearHighlight() {
    state.highlightNodes.clear();
    state.highlightLinks.clear();
    state.upstreamNodes.clear();
    state.downstreamNodes.clear();
  }

  function calculateHighlight() {
    clearHighlight();
    const model = state.models[state.mode];
    if (!model || !state.selectedNodeId || state.selectedNodeMode !== state.mode) return;
    if (!model.index.nodeById.has(state.selectedNodeId)) return;

    state.highlightNodes.add(state.selectedNodeId);
    if (!state.dependenciesRevealed) return;

    const up = walk(state.selectedNodeId, "up");
    const down = walk(state.selectedNodeId, "down");
    up.nodes.forEach((id) => {
      state.highlightNodes.add(id);
      state.upstreamNodes.add(id);
    });
    down.nodes.forEach((id) => {
      state.highlightNodes.add(id);
      state.downstreamNodes.add(id);
    });
    up.links.forEach((id) => state.highlightLinks.add(id));
    down.links.forEach((id) => state.highlightLinks.add(id));
  }

  function walk(startId, direction) {
    return walkOnModel(state.models[state.mode], startId, direction, state.fullChain);
  }

  function walkOnModel(model, startId, direction, followFullChain) {
    const nodes = new Set();
    const links = new Set();
    if (!model || !model.index.nodeById.has(startId)) return { nodes, links };
    const queue = [startId];
    const seen = new Set([startId]);
    const onlyFirstLayer = !followFullChain;

    while (queue.length > 0) {
      const current = queue.shift();
      const list = direction === "down" ? model.index.outgoing.get(current) || [] : model.index.incoming.get(current) || [];

      list.forEach((link) => {
        const next = direction === "down" ? nodeId(link.target) : nodeId(link.source);
        if (!next || next === current) return;
        nodes.add(next);
        links.add(link.id);
        if (!followFullChain || seen.has(next)) return;
        seen.add(next);
        queue.push(next);
      });

      if (onlyFirstLayer) break;
    }

    return { nodes, links };
  }

  function updateInfoPanel() {
    const model = state.models[state.mode];
    const data = model.data;

    ui.infoMode.textContent = state.mode === MODE.TEAM ? "Team graph" : "Department graph";
    ui.infoNodeCount.textContent = String(data.nodes.length);
    ui.infoLinkCount.textContent = String(data.links.length);

    if (!state.selectedNodeId || state.selectedNodeMode !== state.mode) {
      ui.infoTitle.textContent = "No node selected";
      ui.infoSubtitle.textContent = "Select a team or department node to inspect dependency chains.";
      setList(ui.infoSummary, [
        "Use filters and zoom to explore the dependency map.",
        state.mode === MODE.TEAM ? "Zoom out to switch to Department graph." : "Zoom in to switch to Team graph."
      ]);
      setList(ui.infoConnections, ["Choose a node to view related teams."], "No related nodes.");
      setList(ui.infoDirectional, ["Upstream and downstream details appear here."], "No directional data.");
      return;
    }

    const selected = model.index.nodeById.get(state.selectedNodeId);
    if (!selected) {
      clearSelected(true);
      return;
    }

    if (state.mode === MODE.TEAM) {
      updateTeamPanel(selected, model.index);
    } else {
      updateDepartmentPanel(selected, model.index);
    }
  }

  function updateTeamPanel(node, index) {
    const directUpstream = (index.incoming.get(node.id) || []).map((link) => nodeId(link.source)).filter(Boolean);
    const directDownstream = (index.outgoing.get(node.id) || []).map((link) => nodeId(link.target)).filter(Boolean);
    const upstream = state.fullChain ? Array.from(state.upstreamNodes) : directUpstream;
    const downstream = state.fullChain ? Array.from(state.downstreamNodes) : directDownstream;

    ui.infoTitle.textContent = node.teamName;
    ui.infoSubtitle.textContent = `${node.department} | Team lead: ${node.teamLeader}`;

    const summary = [
      `Department head: ${node.departmentHead}`,
      `Jira project: ${node.projectName}`,
      `Direct upstream teams: ${directUpstream.length}`,
      `Direct downstream dependencies: ${directDownstream.length}`
    ];

    if (state.fullChain) {
      summary.push(`Full upstream path: ${state.upstreamNodes.size} team(s)`);
      summary.push(`Full downstream path: ${state.downstreamNodes.size} team(s)`);
    }

    const linked = sortedUnique([...upstream, ...downstream]);
    setList(ui.infoSummary, summary);
    setList(ui.infoConnections, linked, "No direct team connections.");
    setList(ui.infoDirectional, [
      directionText(state.fullChain ? "Upstream (full)" : "Upstream", upstream),
      directionText(state.fullChain ? "Downstream (full)" : "Downstream", downstream)
    ], "No directional dependency data.");
  }

  function updateDepartmentPanel(node, index) {
    const outgoing = index.outgoing.get(node.id) || [];
    const incoming = index.incoming.get(node.id) || [];

    const connectedWeights = new Map();
    outgoing.forEach((link) => {
      const id = nodeId(link.target);
      connectedWeights.set(id, (connectedWeights.get(id) || 0) + (link.weight || 1));
    });
    incoming.forEach((link) => {
      const id = nodeId(link.source);
      connectedWeights.set(id, (connectedWeights.get(id) || 0) + (link.weight || 1));
    });

    const connected = Array.from(connectedWeights.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, weight]) => `${name} (${weight})`);

    ui.infoTitle.textContent = node.department;
    ui.infoSubtitle.textContent = `${node.teamCount} team(s) | Head: ${node.departmentHead}`;

    setList(ui.infoSummary, [
      `Teams in view: ${node.teamCount}`,
      `Cross-department dependencies: ${node.crossDependencyCount}`,
      `Outgoing department edges: ${outgoing.length}`,
      `Incoming department edges: ${incoming.length}`
    ]);

    const upstreamLabels = state.fullChain
      ? Array.from(state.upstreamNodes)
      : incoming.map((link) => nodeId(link.source));
    const downstreamLabels = state.fullChain
      ? Array.from(state.downstreamNodes)
      : outgoing.map((link) => nodeId(link.target));

    setList(ui.infoConnections, connected, "No cross-department links in current filter.");
    setList(ui.infoDirectional, [
      directionText(state.fullChain ? "Upstream (full)" : "Upstream", upstreamLabels),
      directionText(state.fullChain ? "Downstream (full)" : "Downstream", downstreamLabels)
    ], "No directional department dependencies.");
  }

  function directionText(label, values) {
    const unique = sortedUnique(values);
    if (unique.length === 0) return `${label}: none`;
    const preview = unique.slice(0, 3).join(", ");
    return unique.length <= 3 ? `${label}: ${preview}` : `${label}: ${preview}, +${unique.length - 3} more`;
  }

  function setList(element, values, fallback) {
    const list = (values || []).map((value) => String(value).trim()).filter(Boolean);
    const visible = list.slice(0, CFG.maxListItems);
    element.innerHTML = "";

    if (visible.length === 0) {
      const li = document.createElement("li");
      li.textContent = fallback || "No items.";
      element.appendChild(li);
      return;
    }

    visible.forEach((value) => {
      const li = document.createElement("li");
      li.textContent = value;
      element.appendChild(li);
    });

    if (list.length > visible.length) {
      const li = document.createElement("li");
      li.textContent = `+${list.length - visible.length} more`;
      element.appendChild(li);
    }
  }

  function sortedUnique(values) {
    return Array.from(new Set((values || []).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }

  function updateModeBadge() {
    ui.modeBadge.textContent = state.mode === MODE.TEAM ? "Team graph" : "Department graph";
  }

  function updateControlStates() {
    const model = state.models[state.mode];
    const hasNodes = Boolean(model && model.data.nodes.length > 0);

    ui.chainBtn.disabled = !hasNodes;
    ui.focusBtn.disabled = !hasNodes;
    ui.resetBtn.disabled = !hasNodes;
    ui.chainBtn.classList.toggle("Option_selector_active", state.fullChain);
    ui.chainBtn.textContent = state.fullChain ? "Full dependency chain" : "Direct dependencies";
    ui.chainBtn.setAttribute("aria-pressed", String(state.fullChain));
  }

  function requestGraphRefresh() {
    if (state.refreshRaf) return;
    state.refreshRaf = window.requestAnimationFrame(() => {
      state.refreshRaf = null;
      graph.refresh();
    });
  }

  function viewport() {
    const width = frameEl.clientWidth;
    const height = frameEl.clientHeight;
    if (width <= 0 || height <= 0) return null;
    const center = graph.screen2GraphCoords(width / 2, height / 2);
    return { x: center.x, y: center.y, zoom: graph.zoom() };
  }

  function resetView(animated) {
    const model = state.models[state.mode];
    if (!model || model.data.nodes.length === 0) return;

    const duration = animated ? 420 : 0;
    state.fullChain = false;
    clearSelected(false);
    updateInfoPanel();

    muteSemanticZoom(duration);
    if (typeof graph.zoomToFit === "function") {
      graph.zoomToFit(duration, 70, (node) => model.index.nodeById.has(nodeId(node)));
    } else {
      const zoom = state.mode === MODE.TEAM ? CFG.defaultZoomTeam : CFG.defaultZoomDepartment;
      graph.centerAt(0, 0, duration);
      graph.zoom(zoom, duration);
    }
    requestGraphRefresh();
  }

  function muteSemanticZoom(durationMs) {
    const bufferMs = 90;
    const until = Date.now() + Math.max(0, durationMs || 0) + bufferMs;
    state.semanticZoomMutedUntil = Math.max(state.semanticZoomMutedUntil, until);
  }

  function showOverlay(text) {
    if (!overlayEl) return;
    overlayEl.textContent = `Switched to ${text}`;
    overlayEl.classList.add("is-visible");
    if (state.overlayTimer) clearTimeout(state.overlayTimer);
    state.overlayTimer = window.setTimeout(() => overlayEl.classList.remove("is-visible"), 980);
  }

  function syncEmpty(isEmpty) {
    if (!emptyEl) return;
    emptyEl.classList.toggle("d-none", !isEmpty);
  }

  function wireResponsiveSizing() {
    let rafToken = 0;
    const queueResize = () => {
      if (rafToken) return;
      rafToken = window.requestAnimationFrame(() => {
        rafToken = 0;
        resizeGraph();
      });
    };

    window.addEventListener("resize", queueResize);
    window.setTimeout(queueResize, 80);
    window.setTimeout(queueResize, 280);
  }

  function resizeGraph() {
    const rect = frameEl.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width <= 0 || height <= 0) return;
    if (Math.round(graph.width()) === width && Math.round(graph.height()) === height) return;
    graph.width(width);
    graph.height(height);
    requestGraphRefresh();
  }

  function linkWidth(link) {
    const hideAllLinks =
      Boolean(state.selectedNodeId) &&
      state.selectedNodeMode === state.mode &&
      !state.dependenciesRevealed;
    if (hideAllLinks) return 0.12;

    const base = state.mode === MODE.DEPARTMENT ? 1.2 + Math.min(2.3, (link.weight || 1) * 0.4) : 1.1;
    if (state.highlightLinks.size === 0) return base;
    if (state.highlightLinks.has(link.id)) return base + 1.2;
    return Math.max(0.22, base * 0.25);
  }

  function linkColor(link) {
    const hideAllLinks =
      Boolean(state.selectedNodeId) &&
      state.selectedNodeMode === state.mode &&
      !state.dependenciesRevealed;
    if (hideAllLinks) return "rgba(255,255,255,0.02)";

    if (state.highlightLinks.size === 0) {
      if (state.mode === MODE.DEPARTMENT) {
        const alpha = Math.min(0.85, 0.22 + (link.weight || 1) * 0.08);
        return `rgba(206, 228, 255, ${alpha})`;
      }
      return "rgba(206, 228, 255, 0.35)";
    }
    if (state.highlightLinks.has(link.id)) return "rgba(168, 221, 255, 0.95)";
    return "rgba(255, 255, 255, 0.11)";
  }

  function drawNode(node, ctx, scale) {
    const selected = state.selectedNodeId === node.id && state.selectedNodeMode === state.mode;
    const hovered = state.hoveredNodeId === node.id;
    const hasFocusedSelection =
      Boolean(state.selectedNodeId) &&
      state.selectedNodeMode === state.mode &&
      state.highlightNodes.size > 0;
    const related = hasFocusedSelection && state.highlightNodes.has(node.id) && !selected;
    const stage = !hasFocusedSelection ? "default" : selected ? "selected" : related ? "related" : "faded";
    const dimmed = stage === "faded";

    const dim = cardSize(node, scale);
    const x = node.x - dim.w / 2;
    const y = node.y - dim.h / 2;
    const radius = Math.max(6, 11 / Math.max(0.65, scale));
    const baseFillAlpha = stage === "selected" ? 0.96 : stage === "related" ? 0.84 : stage === "faded" ? 0.12 : 0.78;
    const deptFillAlpha = stage === "selected" ? 0.66 : stage === "related" ? 0.48 : stage === "faded" ? 0.08 : 0.3;
    const strokeAlpha = stage === "selected" ? 0.98 : stage === "related" ? 0.84 : stage === "faded" ? 0.16 : 0.62;

    ctx.save();
    const drawShadow = stage !== "faded" && (selected || related || hovered || scale > 0.9);
    ctx.shadowColor = drawShadow ? `rgba(7,24,47,${stage === "selected" ? 0.5 : stage === "related" ? 0.34 : 0.22})` : "transparent";
    ctx.shadowBlur = drawShadow ? (stage === "selected" ? 13 : stage === "related" ? 10 : 7) / scale : 0;
    ctx.shadowOffsetY = drawShadow ? 3 / scale : 0;

    roundedRect(ctx, x, y, dim.w, dim.h, radius);
    ctx.fillStyle = `rgba(8,24,45,${baseFillAlpha})`;
    ctx.fill();

    ctx.shadowColor = "transparent";
    roundedRect(ctx, x, y, dim.w, dim.h, radius);
    ctx.fillStyle = deptColor(node.department, deptFillAlpha);
    ctx.fill();

    roundedRect(ctx, x, y, dim.w, dim.h, radius);
    ctx.lineWidth = (stage === "selected" ? 2.5 : stage === "related" ? 1.85 : stage === "faded" ? 0.9 : 1.35) / scale;
    if (stage === "selected") {
      ctx.strokeStyle = "rgba(168,221,255,0.99)";
    } else if (stage === "related") {
      ctx.strokeStyle = `rgba(202,235,255,${hovered ? 0.96 : strokeAlpha})`;
    } else if (stage === "faded") {
      ctx.strokeStyle = `rgba(255,255,255,${hovered ? 0.28 : strokeAlpha})`;
    } else {
      ctx.strokeStyle = `rgba(255,255,255,${hovered ? 0.86 : strokeAlpha})`;
    }
    ctx.stroke();

    drawNodeText(node, ctx, x, y, dim, scale, { selected, hovered, dimmed, related, stage });
    ctx.restore();
  }

  function drawNodePointer(node, color, ctx, scale) {
    const usedScale = Number.isFinite(scale) ? scale : 1;
    const dim = cardSize(node, usedScale);
    const hitW = dim.w * 0.9;
    const hitH = dim.h * 0.9;
    roundedRect(ctx, node.x - hitW / 2, node.y - hitH / 2, hitW, hitH, Math.max(6, 11 / Math.max(0.65, usedScale)));
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawNodeText(node, ctx, x, y, dim, scale, status) {
    const detail = scale >= 1.05 ? "full" : scale >= 0.72 ? "mid" : "min";
    const nameFont = 11.6 / scale;
    const subFont = 8.8 / scale;
    const titleAlpha = status.selected ? 0.98 : status.related ? 0.96 : status.dimmed ? 0.34 : 0.95;
    const subAlpha = status.selected ? 0.9 : status.related ? 0.86 : status.dimmed ? 0.28 : 0.88;

    if (node.type === MODE.DEPARTMENT) {
      const centerX = x + dim.w / 2;
      const titleFont = `600 ${nameFont}px Ubuntu, sans-serif`;
      const metaFont = `400 ${subFont}px Ubuntu, sans-serif`;
      const lineGap = 2 / scale;
      const maxNameWidth = dim.w - 20 / scale;
      const titleLines = wrapTextLines(ctx, node.department, maxNameWidth, detail === "full" ? 2 : 1, titleFont);
      const metaLines = [];
      if (detail !== "min" || status.selected) {
        metaLines.push(`${node.teamCount} team(s)`);
        if (detail === "full" || status.selected) metaLines.push(`${node.crossDependencyCount} cross links`);
      }

      const titleLineHeight = nameFont + lineGap;
      const metaLineHeight = subFont + lineGap;
      const titleHeight = titleLines.length * titleLineHeight;
      const metaHeight = metaLines.length > 0 ? (3 / scale) + metaLines.length * metaLineHeight : 0;
      const totalHeight = Math.max(0, titleHeight + metaHeight - lineGap);
      let cursorY = y + (dim.h - totalHeight) / 2;

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = `rgba(255,255,255,${titleAlpha})`;
      ctx.font = titleFont;
      titleLines.forEach((line) => {
        ctx.fillText(line, centerX, cursorY);
        cursorY += titleLineHeight;
      });

      if (metaLines.length > 0) {
        cursorY += 3 / scale;
        ctx.fillStyle = `rgba(230,241,255,${subAlpha})`;
        ctx.font = metaFont;
        metaLines.forEach((line) => {
          ctx.fillText(line, centerX, cursorY);
          cursorY += metaLineHeight;
        });
      }
      return;
    }

    const showAvatar = detail !== "min" || status.selected || status.hovered;
    const avatarR = detail === "min" ? 8 / scale : 10 / scale;
    if (showAvatar) drawAvatar(ctx, node, x + 12 / scale, y + dim.h / 2, avatarR, status);
    const textX = showAvatar ? x + 25 / scale : x + 10 / scale;

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = `rgba(255,255,255,${titleAlpha})`;
    ctx.font = `600 ${nameFont}px Ubuntu, sans-serif`;
    ctx.fillText(trim(node.teamName, detail === "full" ? 22 : detail === "mid" ? 16 : 12), textX, y + 8 / scale);

    if (detail === "min" && !status.selected && !status.hovered) return;

    ctx.fillStyle = `rgba(230,241,255,${subAlpha})`;
    ctx.font = `400 ${subFont}px Ubuntu, sans-serif`;
    ctx.fillText(trim(node.department, detail === "full" ? 21 : 16), textX, y + 21 / scale);
    if (detail === "full" || status.selected) ctx.fillText(trim(node.teamLeader, 17), textX, y + 33 / scale);
  }

  function drawAvatar(ctx, node, cx, cy, r, status = {}) {
    const avatarAlpha = status.selected ? 0.96 : status.related ? 0.9 : status.dimmed ? 0.26 : 0.9;
    const ringAlpha = status.selected ? 0.92 : status.related ? 0.84 : status.dimmed ? 0.3 : 0.75;
    const textAlpha = status.selected ? 0.98 : status.related ? 0.95 : status.dimmed ? 0.45 : 0.95;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = deptColor(node.department, avatarAlpha);
    ctx.fill();
    ctx.lineWidth = Math.max(0.9, r * 0.12);
    ctx.strokeStyle = `rgba(255,255,255,${ringAlpha})`;
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${textAlpha})`;
    ctx.font = `600 ${Math.max(6, r * 0.84)}px Ubuntu, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(node.teamName || node.department), cx, cy);
  }

  function cardSize(node, scale) {
    if (node.type === MODE.DEPARTMENT) {
      if (scale >= 1.15) return { w: 228, h: 88 };
      if (scale >= 0.74) return { w: 206, h: 78 };
      return { w: 168, h: 64 };
    }
    if (scale >= 1.25) return { w: 176, h: 64 };
    if (scale >= 0.85) return { w: 154, h: 56 };
    return { w: 124, h: 44 };
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function initials(text) {
    const parts = String(text || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "N";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  function trim(value, max) {
    const text = String(value || "");
    return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}...`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function wrapTextLines(ctx, value, maxWidth, maxLines, font) {
    const text = String(value || "").trim();
    if (!text) return [""];

    const originalFont = ctx.font;
    if (font) ctx.font = font;

    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";

    words.forEach((word) => {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
        return;
      }
      if (current) lines.push(current);
      current = word;
    });

    if (current) lines.push(current);

    while (lines.length > maxLines) {
      const overflow = lines.pop();
      lines[lines.length - 1] = `${lines[lines.length - 1]} ${overflow}`;
    }

    if (lines.length > 0) {
      lines[lines.length - 1] = trimToPixelWidth(ctx, lines[lines.length - 1], maxWidth);
    }

    if (font) ctx.font = originalFont;
    return lines.slice(0, maxLines);
  }

  function trimToPixelWidth(ctx, text, maxWidth) {
    const base = String(text || "");
    if (ctx.measureText(base).width <= maxWidth) return base;
    const ellipsis = "...";
    let out = base;
    while (out.length > 0 && ctx.measureText(`${out}${ellipsis}`).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return out ? `${out}${ellipsis}` : ellipsis;
  }

  function deptColor(name, alpha) {
    return `hsla(${hueHash(String(name || ""))}, 62%, 62%, ${alpha})`;
  }

  function hueHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 360;
  }
})();
