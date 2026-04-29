(() => {
    function toggleOptionState(button, isActive) {
        button.classList.toggle("Option_selector_active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    }

    function syncVisibleTemplateTextareas(activeDocType, activeTemplateKey) {
        const activeDocPanel = document.querySelector(
            `.report-doc-panel[data-doc-panel="${activeDocType}"]`
        );
        if (!activeDocPanel) return;

        const templateSelector = activeDocType === "excel"
            ? `.excel-template-page[data-excel-template="${activeTemplateKey}"]`
            : `.pdf-template-page[data-pdf-template="${activeTemplateKey}"]`;
        const activeTemplatePanel = activeDocPanel.querySelector(templateSelector);
        if (!activeTemplatePanel) return;

        const textareas = Array.from(activeTemplatePanel.querySelectorAll("textarea"));
        textareas.forEach((textarea) => {
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
        });
    }

    function initReportsPreviewSwitching() {
        const docTypeButtons = Array.from(document.querySelectorAll(".report-doc-type-button[data-doc-type]"));
        const reportTypeButtons = Array.from(document.querySelectorAll(".report-type-button[data-report-template-target]"));
        const docPanels = Array.from(document.querySelectorAll(".report-doc-panel[data-doc-panel]"));
        const pdfTemplatePanels = Array.from(document.querySelectorAll(".pdf-template-page[data-pdf-template]"));
        const excelTemplatePanels = Array.from(document.querySelectorAll(".excel-template-page[data-excel-template]"));

        if (
            docTypeButtons.length === 0 ||
            docPanels.length === 0 ||
            pdfTemplatePanels.length === 0 ||
            excelTemplatePanels.length === 0
        ) {
            return;
        }

        const templateConfigByDocType = {
            pdf: {
                panels: pdfTemplatePanels,
                datasetKey: "pdfTemplate",
                activeClass: "pdf-template-page-active"
            },
            excel: {
                panels: excelTemplatePanels,
                datasetKey: "excelTemplate",
                activeClass: "excel-template-page-active"
            }
        };

        function getTemplateKeyFromPanel(panel, docType) {
            const config = templateConfigByDocType[docType];
            if (!config) return "";
            return panel.dataset[config.datasetKey] || "";
        }

        function getAvailableTemplateKeys(docType) {
            const config = templateConfigByDocType[docType];
            if (!config) return new Set();
            return new Set(
                config.panels.map((panel) => getTemplateKeyFromPanel(panel, docType)).filter(Boolean)
            );
        }

        const availableDocTypes = new Set(
            docPanels.map((panel) => panel.dataset.docPanel).filter(Boolean)
        );
        const availableTemplateKeysByDocType = {
            pdf: getAvailableTemplateKeys("pdf"),
            excel: getAvailableTemplateKeys("excel")
        };
        const allTemplateKeys = new Set([
            ...availableTemplateKeysByDocType.pdf,
            ...availableTemplateKeysByDocType.excel
        ]);

        const defaultDocType =
            docTypeButtons.find((button) =>
                availableDocTypes.has(button.dataset.docType || "")
            )?.dataset.docType ||
            docPanels[0].dataset.docPanel ||
            "pdf";

        const defaultTemplateKey =
            reportTypeButtons.find((button) =>
                allTemplateKeys.has(button.dataset.reportTemplateTarget || "")
            )?.dataset.reportTemplateTarget ||
            Array.from(allTemplateKeys)[0] ||
            "no-of-teams";

        let activeDocType = defaultDocType;
        let activeTemplateKey = defaultTemplateKey;

        function resolveTemplateKeyForDocType(docType, templateKey) {
            const availableTemplateKeys = availableTemplateKeysByDocType[docType] || new Set();
            if (availableTemplateKeys.has(templateKey)) return templateKey;

            const buttonMatchedTemplate = reportTypeButtons
                .map((button) => button.dataset.reportTemplateTarget || "")
                .find((key) => availableTemplateKeys.has(key));
            if (buttonMatchedTemplate) return buttonMatchedTemplate;

            const firstPanel = templateConfigByDocType[docType]?.panels[0];
            return firstPanel ? getTemplateKeyFromPanel(firstPanel, docType) : templateKey;
        }

        function renderDocPanels(docType) {
            docPanels.forEach((panel) => {
                const isActive = panel.dataset.docPanel === docType;
                panel.classList.toggle("report-doc-panel-active", isActive);
                panel.setAttribute("aria-hidden", String(!isActive));
            });

            docTypeButtons.forEach((button) => {
                const isActive = button.dataset.docType === docType;
                toggleOptionState(button, isActive);
            });
        }

        function renderTemplatePanels(docType, templateKey) {
            const config = templateConfigByDocType[docType];
            if (!config) return;

            config.panels.forEach((panel) => {
                const isActive = getTemplateKeyFromPanel(panel, docType) === templateKey;
                panel.classList.toggle(config.activeClass, isActive);
                panel.setAttribute("aria-hidden", String(!isActive));
            });
        }

        function renderReportTypeButtons(templateKey) {
            reportTypeButtons.forEach((button) => {
                const isActive = button.dataset.reportTemplateTarget === templateKey;
                toggleOptionState(button, isActive);
            });
        }

        function setReportTypeButtonAvailability(docType) {
            const availableTemplateKeys = availableTemplateKeysByDocType[docType] || new Set();
            reportTypeButtons.forEach((button) => {
                const templateKey = button.dataset.reportTemplateTarget || "";
                const isAvailable = availableTemplateKeys.has(templateKey);
                button.disabled = !isAvailable;
                button.setAttribute("aria-disabled", String(!isAvailable));
            });
        }

        function applyState(docType, templateKey) {
            const resolvedDocType =
                availableDocTypes.has(docType) ? docType : defaultDocType;
            const resolvedTemplateKey = resolveTemplateKeyForDocType(
                resolvedDocType,
                templateKey
            );

            activeDocType = resolvedDocType;
            activeTemplateKey = resolvedTemplateKey;

            renderDocPanels(activeDocType);
            setReportTypeButtonAvailability(activeDocType);
            renderTemplatePanels(activeDocType, activeTemplateKey);
            renderReportTypeButtons(activeTemplateKey);
            syncVisibleTemplateTextareas(activeDocType, activeTemplateKey);
        }

        reportTypeButtons.forEach((button) => {
            button.addEventListener("click", () => {
                if (button.disabled) return;
                const templateKey = button.dataset.reportTemplateTarget || activeTemplateKey;
                applyState(activeDocType, templateKey);
            });
        });

        docTypeButtons.forEach((button) => {
            button.addEventListener("click", () => {
                applyState(button.dataset.docType || activeDocType, activeTemplateKey);
            });
        });

        applyState(activeDocType, activeTemplateKey);
    }

    document.addEventListener("DOMContentLoaded", initReportsPreviewSwitching);
})();
