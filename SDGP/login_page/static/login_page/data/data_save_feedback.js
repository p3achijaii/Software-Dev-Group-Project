(() => {
    "use strict";

    function getActiveButtonLabel(selector, fallbackLabel) {
        const activeButton = document.querySelector(selector);
        if (!activeButton) return fallbackLabel;
        return activeButton.textContent.replace(/\s+/g, " ").trim() || fallbackLabel;
    }

    function getActiveChartType() {
        const activeButton = document.querySelector(".data-chart-button.Option_selector_active");
        return (activeButton?.dataset.chartTarget || activeButton?.dataset.chartType || "treemap")
            .toLowerCase();
    }

    function readDataRecords() {
        const recordsScript = document.getElementById("data-visualisation-records");
        if (!recordsScript || !recordsScript.textContent) return [];
        try {
            const parsed = JSON.parse(recordsScript.textContent);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_error) {
            return [];
        }
    }

    function buildSectionRows(records, chartType) {
        if (!records.length) return [];

        if (chartType === "skills") {
            const aggregated = new Map();
            records.forEach((record) => {
                const skillsField = record["Top Skills"] || record.skills || record["Member Skills"] || "";
                const splitSkills = String(skillsField)
                    .split(/[,;\n]/)
                    .map((skill) => skill.trim())
                    .filter(Boolean);
                splitSkills.forEach((skillName) => {
                    aggregated.set(skillName, (aggregated.get(skillName) || 0) + 1);
                });
            });
            const rows = [["Skill", "Mentions"]];
            Array.from(aggregated.entries())
                .sort((a, b) => b[1] - a[1])
                .forEach(([skillName, count]) => {
                    rows.push([skillName, String(count)]);
                });
            return rows;
        }

        const headerSet = new Set();
        records.forEach((record) => {
            Object.keys(record || {}).forEach((key) => headerSet.add(key));
        });
        const headers = Array.from(headerSet);
        const rows = [headers];
        records.forEach((record) => {
            rows.push(headers.map((header) => {
                const cell = record[header];
                if (Array.isArray(cell)) return cell.join(", ");
                if (cell === null || cell === undefined) return "";
                return String(cell);
            }));
        });
        return rows;
    }

    function buildChartPayload(chartType) {
        const records = readDataRecords();
        const titleValue = `${chartType.charAt(0).toUpperCase()}${chartType.slice(1)} chart`;
        const sectionRows = buildSectionRows(records, chartType);
        const today = new Date().toISOString().slice(0, 10);

        return {
            title: titleValue,
            subtitle: "Data visualisation export",
            meta: [
                { label: "Generated on", value: today },
                { label: "Chart type", value: chartType },
                { label: "Records", value: String(records.length) }
            ],
            sections: [
                {
                    heading: "Records",
                    paragraph: "",
                    rows: sectionRows
                }
            ]
        };
    }

    function showToast(toastNode, hideTimeoutBox, message) {
        toastNode.textContent = message;
        toastNode.classList.add("is-visible");
        if (hideTimeoutBox.id) {
            window.clearTimeout(hideTimeoutBox.id);
        }
        hideTimeoutBox.id = window.setTimeout(() => {
            toastNode.classList.remove("is-visible");
        }, 2600);
    }

    async function saveActiveChart(toastNode, hideTimeoutBox) {
        const chartType = getActiveChartType();
        const reportType = getActiveButtonLabel(
            ".data-chart-button.Option_selector_active",
            "Chart"
        );
        const payload = buildChartPayload(chartType);

        try {
            const csrfToken = (window.SDGP_CSRF && window.SDGP_CSRF.getCsrfToken()) || "";
            const response = await fetch("/user-home/tools/data/save/", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrfToken
                },
                body: JSON.stringify({
                    title: payload.title,
                    report_type: reportType,
                    doc_type: "xlsx",
                    payload
                })
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                showToast(toastNode, hideTimeoutBox, errorBody.message || "Failed to save chart.");
                return;
            }

            const result = await response.json();
            if (result.export_url) {
                const downloadLink = document.createElement("a");
                downloadLink.href = result.export_url;
                downloadLink.download = result.file_name || "";
                document.body.appendChild(downloadLink);
                downloadLink.click();
                downloadLink.remove();
            }
            showToast(toastNode, hideTimeoutBox, `Saved as ${result.file_name || "chart"}.`);
        } catch (error) {
            console.warn("Data save: failed.", error);
            showToast(toastNode, hideTimeoutBox, "Failed to save chart.");
        }
    }

    function initSaveFeedback() {
        const saveButton = document.querySelector("#Button_Save .Save_btn");
        if (!saveButton) return;

        const toastNode = document.createElement("div");
        toastNode.className = "save-toast";
        toastNode.setAttribute("role", "status");
        toastNode.setAttribute("aria-live", "polite");
        toastNode.setAttribute("aria-atomic", "true");
        document.body.appendChild(toastNode);

        const hideTimeoutBox = { id: 0 };

        saveButton.addEventListener("click", () => {
            saveActiveChart(toastNode, hideTimeoutBox);
        });
    }

    document.addEventListener("DOMContentLoaded", initSaveFeedback);
})();
