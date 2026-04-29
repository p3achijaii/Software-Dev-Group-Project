(() => {
    const DATA_RECORDS_SCRIPT_ID = "data-visualisation-records";

    const CHART_COLOR_VARS = [
        "--data-chart-rgb-1",
        "--data-chart-rgb-2",
        "--data-chart-rgb-3",
        "--data-chart-rgb-4",
        "--data-chart-rgb-5",
        "--data-chart-rgb-6"
    ];
    const TOP_SKILLS_LIMIT = 8;
    const PANEL_ACTIVE_CLASS = "data_chart_panel_active";

    function readJsonScriptContent(scriptId, fallbackValue) {
        const scriptElement = document.getElementById(scriptId);
        if (!scriptElement) return fallbackValue;

        try {
            return JSON.parse(scriptElement.textContent || "");
        } catch (error) {
            return fallbackValue;
        }
    }

    function getDataRecords() {
        const records = readJsonScriptContent(DATA_RECORDS_SCRIPT_ID, []);
        return Array.isArray(records) ? records : [];
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function cssVarValue(variableName, fallbackValue) {
        const value = getComputedStyle(document.documentElement)
            .getPropertyValue(variableName)
            .trim();
        return value || fallbackValue;
    }

    function chartAlpha() {
        const parsed = Number.parseFloat(cssVarValue("--data-chart-alpha", "0.8"));
        return clamp(Number.isFinite(parsed) ? parsed : 0.8, 0.1, 0.8);
    }

    function rgbaFromVar(variableName, alpha, fallbackRgb) {
        const rgb = cssVarValue(variableName, fallbackRgb);
        return `rgba(${rgb}, ${alpha})`;
    }

    function chartPalette(alphaValue) {
        const fallbackColors = [
            "58, 132, 206",
            "122, 37, 126",
            "88, 126, 166",
            "78, 110, 150",
            "96, 130, 104",
            "133, 101, 152"
        ];

        return CHART_COLOR_VARS.map((variableName, index) =>
            rgbaFromVar(variableName, alphaValue, fallbackColors[index])
        );
    }

    function splitSkills(skillValue) {
        return String(skillValue || "")
            .split(/[,;|\n]+/g)
            .map((skill) => skill.trim())
            .filter(Boolean);
    }

    function truncateLabel(label, maxLength) {
        if (label.length <= maxLength) return label;
        return `${label.slice(0, Math.max(0, maxLength - 1))}\u2026`;
    }

    function buildTreemapHierarchy(records) {
        const departmentProjectMap = new Map();

        records.forEach((record) => {
            const department = String(record.Department || "Unassigned");
            const jiraProject = String(record["Jira Project Name"] || "Unassigned");

            if (!departmentProjectMap.has(department)) {
                departmentProjectMap.set(department, new Map());
            }

            const projectMap = departmentProjectMap.get(department);
            projectMap.set(jiraProject, (projectMap.get(jiraProject) || 0) + 1);
        });

        const children = Array.from(departmentProjectMap.entries())
            .sort(([departmentA], [departmentB]) => departmentA.localeCompare(departmentB))
            .map(([departmentName, projectMap]) => ({
                name: departmentName,
                children: Array.from(projectMap.entries())
                    .sort(([projectA], [projectB]) => projectA.localeCompare(projectB))
                    .map(([projectName, value]) => ({
                        name: projectName,
                        value
                    }))
            }));

        return {
            name: "Departments",
            children
        };
    }

    function buildHeatmapMatrix(records) {
        const departments = Array.from(
            new Set(records.map((record) => String(record.Department || "Unassigned")))
        ).sort((a, b) => a.localeCompare(b));

        const projects = Array.from(
            new Set(records.map((record) => String(record["Jira Project Name"] || "Unassigned")))
        ).sort((a, b) => a.localeCompare(b));

        const cellMap = new Map();
        records.forEach((record) => {
            const department = String(record.Department || "Unassigned");
            const project = String(record["Jira Project Name"] || "Unassigned");
            const key = `${department}__${project}`;
            cellMap.set(key, (cellMap.get(key) || 0) + 1);
        });

        const cells = [];
        let maxValue = 0;
        departments.forEach((department) => {
            projects.forEach((project) => {
                const value = cellMap.get(`${department}__${project}`) || 0;
                maxValue = Math.max(maxValue, value);
                cells.push({
                    x: project,
                    y: department,
                    v: value
                });
            });
        });

        return {
            departments,
            projects,
            cells,
            maxValue
        };
    }

    function buildSkillsStack(records, topLimit) {
        const departmentSet = new Set();
        const skillTotals = new Map();
        const skillLabels = new Map();
        const skillCountsByDepartment = new Map();

        records.forEach((record) => {
            const department = String(record.Department || "Unassigned");
            const skills = splitSkills(record["Key Skills & Technologies"]);
            const seenSkills = new Set();

            departmentSet.add(department);

            if (!skillCountsByDepartment.has(department)) {
                skillCountsByDepartment.set(department, new Map());
            }

            skills.forEach((skill) => {
                const normalizedSkill = skill.toLowerCase();
                if (seenSkills.has(normalizedSkill)) return;
                seenSkills.add(normalizedSkill);

                if (!skillLabels.has(normalizedSkill)) {
                    skillLabels.set(normalizedSkill, skill);
                }

                skillTotals.set(normalizedSkill, (skillTotals.get(normalizedSkill) || 0) + 1);
                const departmentSkillMap = skillCountsByDepartment.get(department);
                departmentSkillMap.set(
                    normalizedSkill,
                    (departmentSkillMap.get(normalizedSkill) || 0) + 1
                );
            });
        });

        const topSkills = Array.from(skillTotals.entries())
            .sort((firstSkill, secondSkill) => secondSkill[1] - firstSkill[1])
            .slice(0, topLimit)
            .map(([normalizedSkill]) => normalizedSkill);

        const departments = Array.from(departmentSet).sort((a, b) => a.localeCompare(b));
        const topSkillLabels = topSkills.map((normalizedSkill) => skillLabels.get(normalizedSkill));

        const datasetsByDepartment = departments.map((department) => {
            const departmentSkillMap = skillCountsByDepartment.get(department) || new Map();
            const values = topSkills.map(
                (normalizedSkill) => departmentSkillMap.get(normalizedSkill) || 0
            );
            return {
                department,
                values
            };
        });

        return {
            departments,
            topSkillLabels,
            datasetsByDepartment
        };
    }

    function hasMatrixController() {
        if (typeof Chart === "undefined" || !Chart.registry) return false;
        try {
            return Boolean(Chart.registry.getController("matrix"));
        } catch (error) {
            return false;
        }
    }

    function setPanelMessage(targetElement, message) {
        if (!targetElement) return;
        targetElement.innerHTML = `<p class="data_chart_empty_state">${message}</p>`;
    }

    function setCanvasMessage(canvasElement, message) {
        const chartContainer = canvasElement?.closest(".data_chart_canvas");
        if (!chartContainer) return;
        chartContainer.innerHTML = `<p class="data_chart_empty_state">${message}</p>`;
    }

    function initDataCharts() {
        const chartButtons = Array.from(
            document.querySelectorAll(".data-chart-button[data-chart-target]")
        );
        const chartPanels = Array.from(
            document.querySelectorAll(".data_chart_panel[data-chart-panel]")
        );
        const chartViewport = document.getElementById("Data-chart-viewport");
        const treemapContainer = document.getElementById("Data_treemap_container");
        const heatmapCanvas = document.getElementById("Data_heatmap_chart");
        const skillsCanvas = document.getElementById("Data_skills_chart");
        const treemapTooltip = document.getElementById("Data_chart_tooltip");

        if (
            chartButtons.length === 0 ||
            chartPanels.length === 0 ||
            !chartViewport ||
            !treemapContainer
        ) {
            return;
        }

        const availablePanels = new Set(
            chartPanels.map((panel) => panel.dataset.chartPanel).filter(Boolean)
        );

        let activeChartKey = "treemap";
        let heatmapChart = null;
        let skillsChart = null;
        let heatmapInitialized = false;
        let skillsInitialized = false;
        let treemapObserver = null;
        let treemapObserved = false;
        let treemapAnimationFrame = null;

        function hideTreemapTooltip() {
            if (!treemapTooltip) return;
            treemapTooltip.classList.remove("data_chart_tooltip_visible");
            treemapTooltip.setAttribute("aria-hidden", "true");
        }

        function showTreemapTooltip(content, clientX, clientY) {
            if (!treemapTooltip) return;

            treemapTooltip.innerHTML = content;
            treemapTooltip.classList.add("data_chart_tooltip_visible");
            treemapTooltip.setAttribute("aria-hidden", "false");

            const viewportBounds = chartViewport.getBoundingClientRect();
            const tooltipBounds = treemapTooltip.getBoundingClientRect();
            const offset = 12;
            const maxX = Math.max(0, viewportBounds.width - tooltipBounds.width - 8);
            const maxY = Math.max(0, viewportBounds.height - tooltipBounds.height - 8);
            const nextX = clamp(clientX - viewportBounds.left + offset, 0, maxX);
            const nextY = clamp(clientY - viewportBounds.top + offset, 0, maxY);

            treemapTooltip.style.left = `${nextX}px`;
            treemapTooltip.style.top = `${nextY}px`;
        }

        function scheduleTreemapRender() {
            if (activeChartKey !== "treemap") return;
            if (treemapAnimationFrame !== null) return;

            treemapAnimationFrame = window.requestAnimationFrame(() => {
                treemapAnimationFrame = null;
                renderTreemap();
            });
        }

        function renderTreemap() {
            if (typeof d3 === "undefined") {
                setPanelMessage(treemapContainer, "Treemap library is unavailable.");
                return;
            }

            const records = getDataRecords();
            const hierarchyData = buildTreemapHierarchy(records);
            const width = treemapContainer.clientWidth;
            const height = treemapContainer.clientHeight;

            d3.select(treemapContainer).selectAll("*").remove();
            hideTreemapTooltip();

            if (hierarchyData.children.length === 0) {
                setPanelMessage(treemapContainer, "No treemap data available.");
                return;
            }

            if (width < 20 || height < 20) {
                return;
            }

            const root = d3
                .hierarchy(hierarchyData)
                .sum((node) => node.value || 0)
                .sort((nodeA, nodeB) => (nodeB.value || 0) - (nodeA.value || 0));

            d3.treemap()
                .size([width, height])
                .paddingOuter(2)
                .paddingTop(2)
                .paddingInner(2)
                .round(true)(root);

            const alphaValue = chartAlpha();
            const fillPalette = chartPalette(alphaValue);
            const departments = hierarchyData.children.map((item) => item.name);
            const colorByDepartment = d3
                .scaleOrdinal()
                .domain(departments)
                .range(departments.map((_, index) => fillPalette[index % fillPalette.length]));

            const svg = d3
                .select(treemapContainer)
                .append("svg")
                .attr("viewBox", `0 0 ${width} ${height}`)
                .attr("preserveAspectRatio", "none")
                .attr("role", "img")
                .attr("aria-label", "Department and Jira project treemap");

            const leaves = svg
                .selectAll("g")
                .data(root.leaves())
                .enter()
                .append("g")
                .attr("transform", (node) => `translate(${node.x0},${node.y0})`);

            leaves
                .append("rect")
                .attr("class", "data_treemap_node_frame")
                .attr("width", (node) => Math.max(0, node.x1 - node.x0))
                .attr("height", (node) => Math.max(0, node.y1 - node.y0))
                .attr("rx", 8)
                .attr("ry", 8)
                .attr("fill", (node) => colorByDepartment(node.parent.data.name));

            leaves.each(function appendLabels(node) {
                const leafWidth = Math.max(0, node.x1 - node.x0);
                const leafHeight = Math.max(0, node.y1 - node.y0);

                if (leafWidth < 88 || leafHeight < 42) return;

                const label = d3.select(this)
                    .append("text")
                    .attr("class", "data_treemap_node_label")
                    .attr("x", 8)
                    .attr("y", 16);

                const projectName = truncateLabel(node.data.name, leafWidth > 190 ? 24 : 14);
                const teamsLabel = `${node.value || 0} team${(node.value || 0) === 1 ? "" : "s"}`;

                label.append("tspan").text(projectName);
                if (leafHeight > 62) {
                    label.append("tspan").attr("x", 8).attr("dy", 14).text(teamsLabel);
                }
            });

            leaves
                .on("mousemove", (event, node) => {
                    const teamsCount = node.value || 0;
                    const tooltipContent = `<strong>${node.parent.data.name}</strong><br>${node.data.name}<br>Teams: ${teamsCount}`;
                    showTreemapTooltip(tooltipContent, event.clientX, event.clientY);
                })
                .on("mouseleave", hideTreemapTooltip);
        }

        function renderHeatmap() {
            if (heatmapInitialized) return;

            if (typeof Chart === "undefined") {
                setCanvasMessage(heatmapCanvas, "Chart.js is unavailable.");
                heatmapInitialized = true;
                return;
            }

            if (!hasMatrixController()) {
                setCanvasMessage(heatmapCanvas, "Heatmap matrix plugin is unavailable.");
                heatmapInitialized = true;
                return;
            }

            const matrixData = buildHeatmapMatrix(getDataRecords());
            if (
                matrixData.departments.length === 0 ||
                matrixData.projects.length === 0 ||
                !heatmapCanvas
            ) {
                setCanvasMessage(heatmapCanvas, "No heatmap data available.");
                heatmapInitialized = true;
                return;
            }

            const heatmapContext = heatmapCanvas.getContext("2d");
            const alphaMax = chartAlpha();
            const baseRgb = cssVarValue("--data-chart-rgb-1", "58, 132, 206");
            const gridColor = rgbaFromVar("--data-chart-grid-rgb", 0.2, "255, 255, 255");

            heatmapChart = new Chart(heatmapContext, {
                type: "matrix",
                data: {
                    datasets: [
                        {
                            label: "Teams",
                            data: matrixData.cells,
                            borderWidth: 1,
                            borderColor: `rgba(${baseRgb}, 0.45)`,
                            backgroundColor(context) {
                                const value = context.raw?.v || 0;
                                if (value <= 0) return `rgba(${baseRgb}, 0.08)`;

                                const ratio = matrixData.maxValue > 0 ? value / matrixData.maxValue : 0;
                                const scaledAlpha = clamp(0.1 + ratio * (alphaMax - 0.1), 0.1, alphaMax);
                                return `rgba(${baseRgb}, ${scaledAlpha})`;
                            },
                            width(context) {
                                const chartArea = context.chart.chartArea;
                                if (!chartArea) return 0;
                                return Math.max(8, chartArea.width / matrixData.projects.length - 3);
                            },
                            height(context) {
                                const chartArea = context.chart.chartArea;
                                if (!chartArea) return 0;
                                return Math.max(8, chartArea.height / matrixData.departments.length - 3);
                            }
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    layout: {
                        padding: 8
                    },
                    scales: {
                        x: {
                            type: "category",
                            labels: matrixData.projects,
                            offset: true,
                            grid: {
                                color: gridColor
                            },
                            ticks: {
                                color: "rgba(255, 255, 255, 0.86)",
                                maxRotation: 30,
                                minRotation: 0
                            },
                            border: {
                                color: "rgba(255, 255, 255, 0.28)"
                            }
                        },
                        y: {
                            type: "category",
                            labels: matrixData.departments,
                            offset: true,
                            grid: {
                                color: gridColor
                            },
                            ticks: {
                                color: "rgba(255, 255, 255, 0.86)"
                            },
                            border: {
                                color: "rgba(255, 255, 255, 0.28)"
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                title(context) {
                                    const point = context[0]?.raw;
                                    return point ? `${point.y} / ${point.x}` : "";
                                },
                                label(context) {
                                    const teams = context.raw?.v || 0;
                                    return `Teams: ${teams}`;
                                }
                            }
                        }
                    }
                }
            });

            heatmapInitialized = true;
        }

        function renderSkillsStackedBar() {
            if (skillsInitialized) return;

            if (typeof Chart === "undefined" || !skillsCanvas) {
                setCanvasMessage(skillsCanvas, "Chart.js is unavailable.");
                skillsInitialized = true;
                return;
            }

            const skillsData = buildSkillsStack(getDataRecords(), TOP_SKILLS_LIMIT);
            if (skillsData.topSkillLabels.length === 0) {
                setCanvasMessage(skillsCanvas, "No skills data available.");
                skillsInitialized = true;
                return;
            }

            const alphaValue = chartAlpha();
            const fillPalette = chartPalette(alphaValue);
            const borderPalette = chartPalette(0.9);
            const gridColor = rgbaFromVar("--data-chart-grid-rgb", 0.2, "255, 255, 255");
            const skillsContext = skillsCanvas.getContext("2d");

            skillsChart = new Chart(skillsContext, {
                type: "bar",
                data: {
                    labels: skillsData.topSkillLabels,
                    datasets: skillsData.datasetsByDepartment.map((departmentData, index) => ({
                        label: departmentData.department,
                        data: departmentData.values,
                        backgroundColor: fillPalette[index % fillPalette.length],
                        borderColor: borderPalette[index % borderPalette.length],
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false,
                        maxBarThickness: 30
                    }))
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    layout: {
                        padding: 8
                    },
                    scales: {
                        x: {
                            stacked: true,
                            grid: {
                                color: gridColor,
                                display: false
                            },
                            ticks: {
                                color: "rgba(255, 255, 255, 0.86)",
                                maxRotation: 18,
                                minRotation: 0
                            },
                            border: {
                                color: "rgba(255, 255, 255, 0.28)"
                            }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            grid: {
                                color: gridColor
                            },
                            ticks: {
                                color: "rgba(255, 255, 255, 0.86)",
                                precision: 0
                            },
                            border: {
                                color: "rgba(255, 255, 255, 0.28)"
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                color: "rgba(255, 255, 255, 0.9)",
                                boxWidth: 10,
                                boxHeight: 10,
                                usePointStyle: true,
                                pointStyle: "rectRounded",
                                padding: 14
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label(context) {
                                    const value = context.raw || 0;
                                    return `${context.dataset.label}: ${value}`;
                                }
                            }
                        }
                    }
                }
            });

            skillsInitialized = true;
        }

        function updateTreemapObserver() {
            if (!treemapObserver || !treemapContainer) return;

            if (activeChartKey === "treemap" && !treemapObserved) {
                treemapObserver.observe(treemapContainer);
                treemapObserved = true;
                return;
            }

            if (activeChartKey !== "treemap" && treemapObserved) {
                treemapObserver.unobserve(treemapContainer);
                treemapObserved = false;
            }
        }

        function resizeActiveChart() {
            if (activeChartKey === "treemap") {
                scheduleTreemapRender();
                return;
            }

            if (activeChartKey === "heatmap" && heatmapChart) {
                window.requestAnimationFrame(() => heatmapChart.resize());
                return;
            }

            if (activeChartKey === "skills" && skillsChart) {
                window.requestAnimationFrame(() => skillsChart.resize());
            }
        }

        function ensureChartInitialized(chartKey) {
            if (chartKey === "treemap") {
                renderTreemap();
                return;
            }

            if (chartKey === "heatmap") {
                renderHeatmap();
                return;
            }

            if (chartKey === "skills") {
                renderSkillsStackedBar();
            }
        }

        function applyChartState(nextChartKey) {
            const resolvedChartKey = availablePanels.has(nextChartKey)
                ? nextChartKey
                : activeChartKey;

            activeChartKey = resolvedChartKey;
            hideTreemapTooltip();

            chartPanels.forEach((panel) => {
                const isActive = panel.dataset.chartPanel === activeChartKey;
                panel.classList.toggle(PANEL_ACTIVE_CLASS, isActive);
                panel.setAttribute("aria-hidden", String(!isActive));
            });

            chartButtons.forEach((button) => {
                const isActive = button.dataset.chartTarget === activeChartKey;
                button.classList.toggle("Option_selector_active", isActive);
                button.setAttribute("aria-pressed", String(isActive));
                button.setAttribute("aria-selected", String(isActive));
            });

            ensureChartInitialized(activeChartKey);
            updateTreemapObserver();
            resizeActiveChart();
        }

        chartButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const targetChart = button.dataset.chartTarget || "";
                if (!availablePanels.has(targetChart)) return;
                applyChartState(targetChart);
            });
        });

        if (typeof ResizeObserver !== "undefined") {
            treemapObserver = new ResizeObserver(() => {
                scheduleTreemapRender();
            });
        }

        window.addEventListener("resize", resizeActiveChart);

        const activeButton = chartButtons.find(
            (button) =>
                button.classList.contains("Option_selector_active") &&
                availablePanels.has(button.dataset.chartTarget || "")
        );
        const fallbackButton = chartButtons.find((button) =>
            availablePanels.has(button.dataset.chartTarget || "")
        );
        const defaultChart = activeButton?.dataset.chartTarget || fallbackButton?.dataset.chartTarget || "treemap";

        applyChartState(defaultChart);
    }

    document.addEventListener("DOMContentLoaded", initDataCharts);
})();
