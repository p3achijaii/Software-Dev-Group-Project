(() => {
    const DEPARTMENT_NAME_FALLBACKS = ["Engineering", "Product", "Data", "Operations", "Support"];
    const TEAM_NAME_FALLBACKS = ["Team Alpha", "Team Beta", "Team Gamma", "Team Delta", "Team Epsilon"];

    function formatLocalDate(now) {
        return now.toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
    }

    function formatLocalTime(now) {
        return now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function formatTemplateTime(now) {
        return now
            .toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true
            })
            .replace(" AM", " A.M.")
            .replace(" PM", " P.M.");
    }

    function formatReportingPeriod(now) {
        return now.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric"
        });
    }

    function readStorageValue(storageName, key) {
        try {
            const storage = storageName === "local" ? window.localStorage : window.sessionStorage;
            return (storage.getItem(key) || "").trim();
        } catch (_error) {
            return "";
        }
    }

    function readJsonScriptValue(scriptId) {
        const scriptNode = document.getElementById(scriptId);
        if (!scriptNode) return "";

        try {
            const parsedValue = JSON.parse(scriptNode.textContent || "\"\"");
            return String(parsedValue || "").trim();
        } catch (_error) {
            return "";
        }
    }

    function getGeneratedByName() {
        const fromDjangoContext = readJsonScriptValue("reports-generated-by");
        if (fromDjangoContext) return fromDjangoContext;

        const candidateKeys = ["member_name", "memberName", "username", "userName", "full_name", "fullName"];
        for (const key of candidateKeys) {
            const fromLocalStorage = readStorageValue("local", key);
            if (fromLocalStorage) return fromLocalStorage;

            const fromSessionStorage = readStorageValue("session", key);
            if (fromSessionStorage) return fromSessionStorage;
        }

        return "Operations Lead";
    }

    function syncMetaValues() {
        const now = new Date();
        const dateText = `Generation Date: ${formatLocalDate(now)}`;
        const timeText = `Generation Time: ${formatLocalTime(now)}`;

        document.querySelectorAll("[data-meta-date]").forEach((node) => {
            node.textContent = dateText;
        });

        document.querySelectorAll("[data-meta-time]").forEach((node) => {
            node.textContent = timeText;
        });
    }

    function markGeneratedTextTokens() {
        const tokenMap = {
            "[MM/DD/YYYY]": "date",
            "[HH:MM A.M./P.M.]": "time",
            "[MEMBER_NAME]": "member-name",
            "[Member_Name]": "member-name",
            "[REPORTING_PERIOD]": "reporting-period",
            "[Department_name]": "department-name",
            "[Department_Name]": "department-name",
            "[Team_Name]": "team-name"
        };

        document.querySelectorAll(".generated_text").forEach((node) => {
            if (node.dataset.generatedToken) return;
            const templateToken = node.textContent.trim();
            const mappedToken = tokenMap[templateToken];
            if (mappedToken) {
                node.dataset.generatedToken = mappedToken;
            }
        });
    }

    function syncGeneratedTextPlaceholders() {
        const now = new Date();
        const generatedByName = getGeneratedByName();
        const reportingPeriod = formatReportingPeriod(now);
        let departmentIndex = 0;
        let teamIndex = 0;

        document.querySelectorAll(".generated_text[data-generated-token]").forEach((node) => {
            const token = node.dataset.generatedToken || "";

            if (token === "date") {
                node.textContent = formatLocalDate(now);
                return;
            }

            if (token === "time") {
                node.textContent = formatTemplateTime(now);
                return;
            }

            if (token === "member-name") {
                node.textContent = generatedByName;
                return;
            }

            if (token === "reporting-period") {
                node.textContent = reportingPeriod;
                return;
            }

            if (token === "department-name") {
                if (!node.dataset.generatedValue) {
                    node.dataset.generatedValue =
                        DEPARTMENT_NAME_FALLBACKS[departmentIndex % DEPARTMENT_NAME_FALLBACKS.length];
                    departmentIndex += 1;
                }
                node.textContent = node.dataset.generatedValue;
                return;
            }

            if (token === "team-name") {
                if (!node.dataset.generatedValue) {
                    node.dataset.generatedValue =
                        TEAM_NAME_FALLBACKS[teamIndex % TEAM_NAME_FALLBACKS.length];
                    teamIndex += 1;
                }
                node.textContent = node.dataset.generatedValue;
            }
        });
    }

    function syncAllGeneratedValues() {
        syncMetaValues();
        markGeneratedTextTokens();
        syncGeneratedTextPlaceholders();
    }

    document.addEventListener("DOMContentLoaded", () => {
        syncAllGeneratedValues();
        window.setInterval(syncAllGeneratedValues, 60 * 1000);
    });
})();
