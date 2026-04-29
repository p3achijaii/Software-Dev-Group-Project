function setupInboxTemplateSwitching() {
    const templateOne = document.getElementById("Template_1_New_message");
    const templateTwo = document.getElementById("Template_2_ViewandReply");
    const btnSendOrNew = document.querySelector(".btn_send_or_new");
    const mailList = document.getElementById("mail-list");
    const modeButtons = Array.from(document.querySelectorAll(".Selection_Buttons .Button_option[data-mode]"));
    const pageNaming = document.querySelector(".Naming");

    const cancelMenuTrigger = document.getElementById("cancel-menu-trigger");
    const cancelMenuPanel = document.getElementById("cancel-menu-panel");
    const cancelAction = document.getElementById("cancel-action");
    const saveDraftAction = document.getElementById("save-draft-action");

    const templateOneRecipient = document.getElementById("Template_1_Recipient");
    const templateOneSubject = document.getElementById("Template_1_Subject");
    const templateOneMessage = document.getElementById("Template_1_Message");

    const templateTwoRecipient = document.getElementById("Template_2_Recipient");
    const templateTwoSubject = document.getElementById("Template_2_Subject");
    const templateTwoPreviousMessage = document.getElementById("Template_2_Previous_Message");
    const templateTwoReplyMessage = document.getElementById("Template_2_Reply_Message");

    if (
        !templateOne ||
        !templateTwo ||
        !btnSendOrNew ||
        !mailList ||
        modeButtons.length === 0 ||
        !cancelMenuTrigger ||
        !cancelMenuPanel ||
        !cancelAction ||
        !saveDraftAction ||
        !templateOneRecipient ||
        !templateOneSubject ||
        !templateOneMessage ||
        !templateTwoRecipient ||
        !templateTwoSubject ||
        !templateTwoPreviousMessage ||
        !templateTwoReplyMessage
    ) {
        return;
    }

    const BASE_HEIGHT = 30;
    const MAX_HEIGHT = 350;
    const LABEL_SHIFT_STEP = -0.5;
    const TRASH_ICON_OUTLINE = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16"><path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/></svg>`;
    const allTemplateFields = [
        templateOneRecipient,
        templateOneSubject,
        templateOneMessage,
        templateTwoRecipient,
        templateTwoSubject,
        templateTwoPreviousMessage,
        templateTwoReplyMessage
    ];

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

    const mailboxState = readJsonScriptContent("inbox-mailbox-state", {
        inbox: [],
        sent: [],
        drafts: []
    });
    const inboxActionUrl = readJsonScriptContent("inbox-action-url", "");
    const inboxComposePrefill = readJsonScriptContent("inbox-compose-prefill", {});

    let activeMode = "inbox";
    let selectedMessageId = null;
    let selectedMessageMode = null;
    let isCancelMenuOpen = false;
    let isSavingMailboxAction = false;

    function escapeHtml(text) {
        return String(text || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\"", "&quot;")
            .replaceAll("'", "&#39;");
    }

    function getInputWrapper(inputField) {
        return inputField.closest(".question_form_text") || inputField.closest(".question_form_text_long");
    }

    function syncHasValueState(inputField) {
        const inputWrapper = getInputWrapper(inputField);
        if (!inputWrapper) return;
        inputWrapper.classList.toggle("has-value", inputField.value.trim().length > 0);
    }

    function syncTextAreaSizing(textArea) {
        const textAreaWrapper = textArea.closest(".question_form_text_long");
        if (!textAreaWrapper) return;

        if (textArea.value.trim().length === 0) {
            textArea.style.height = `${BASE_HEIGHT}px`;
            textArea.style.overflowY = "hidden";
            textAreaWrapper.style.setProperty("--skills-label-shift", "0px");
            return;
        }

        textArea.style.height = "auto";

        const rawHeight = Math.max(BASE_HEIGHT, textArea.scrollHeight);
        const nextHeight = Math.min(rawHeight, MAX_HEIGHT);
        const expandedSteps = Math.max(0, Math.ceil((nextHeight - BASE_HEIGHT) / 22));

        textArea.style.height = `${nextHeight}px`;
        textArea.style.overflowY = rawHeight > MAX_HEIGHT ? "auto" : "hidden";
        textAreaWrapper.style.setProperty("--skills-label-shift", `${expandedSteps * LABEL_SHIFT_STEP}px`);
    }

    function syncFieldState(inputField) {
        syncHasValueState(inputField);
        if (inputField.tagName === "TEXTAREA") {
            syncTextAreaSizing(inputField);
        }
    }

    function clearTemplateOneFields() {
        templateOneRecipient.value = "";
        templateOneSubject.value = "";
        templateOneMessage.value = "";

        syncFieldState(templateOneRecipient);
        syncFieldState(templateOneSubject);
        syncFieldState(templateOneMessage);
    }

    function clearTemplateTwoFields() {
        templateTwoRecipient.value = "";
        templateTwoSubject.value = "";
        templateTwoPreviousMessage.value = "";
        templateTwoReplyMessage.value = "";

        syncFieldState(templateTwoRecipient);
        syncFieldState(templateTwoSubject);
        syncFieldState(templateTwoPreviousMessage);
        syncFieldState(templateTwoReplyMessage);
    }

    function isTemplateVisible(templateToCheck) {
        return !templateToCheck.classList.contains("Template_hidden");
    }

    function updateSendButtonLabel() {
        if (isTemplateVisible(templateOne)) {
            btnSendOrNew.textContent = "Send e-mail";
            return;
        }

        if (isTemplateVisible(templateTwo)) {
            btnSendOrNew.textContent = "Reply to the e-mail";
            return;
        }

        btnSendOrNew.textContent = "New E-mail";
    }

    function clearSelectedMessage() {
        selectedMessageId = null;
        selectedMessageMode = null;
    }

    function hideTemplates() {
        templateOne.classList.add("Template_hidden");
        templateTwo.classList.add("Template_hidden");
        updateSendButtonLabel();
    }

    function showTemplateOne() {
        templateOne.classList.remove("Template_hidden");
        templateTwo.classList.add("Template_hidden");
        updateSendButtonLabel();
    }

    function showTemplateOneWithData(messageData) {
        templateOneRecipient.value = messageData.recipient || "";
        templateOneSubject.value = messageData.subject || "";
        templateOneMessage.value = messageData.body || "";

        syncFieldState(templateOneRecipient);
        syncFieldState(templateOneSubject);
        syncFieldState(templateOneMessage);
        showTemplateOne();
    }

    function showTemplateTwoWithData(messageData) {
        templateTwoRecipient.value = messageData.recipient || "";
        templateTwoSubject.value = messageData.subject || "";
        templateTwoPreviousMessage.value = messageData.previousMessage || "";
        templateTwoReplyMessage.value = messageData.replyMessage || "";

        syncFieldState(templateTwoRecipient);
        syncFieldState(templateTwoSubject);
        syncFieldState(templateTwoPreviousMessage);
        syncFieldState(templateTwoReplyMessage);

        templateTwo.classList.remove("Template_hidden");
        templateOne.classList.add("Template_hidden");
        updateSendButtonLabel();
    }

    function hasComposeContent() {
        return (
            templateOneRecipient.value.trim().length > 0 ||
            templateOneSubject.value.trim().length > 0 ||
            templateOneMessage.value.trim().length > 0
        );
    }

    function hasReplyContent() {
        return templateTwoReplyMessage.value.trim().length > 0;
    }

    function getMessagesByMode(mode) {
        return mailboxState[mode] || [];
    }

    function findMessageInMode(messageId, mode) {
        return getMessagesByMode(mode).find((message) => message.id === messageId) || null;
    }

    function getModeDisplayName(mode) {
        if (mode === "sent") return "Sent page";
        if (mode === "drafts") return "Drafts page";
        return "Inbox page";
    }

    function renderMailList(mode) {
        const messages = getMessagesByMode(mode);
        mailList.innerHTML = "";

        if (messages.length === 0) {
            mailList.innerHTML = `<div class="row"><div class="col-12"><p class="Inbox_empty_state">No messages found.</p></div></div>`;
            document.dispatchEvent(new CustomEvent("inbox:rows-rendered"));
            return;
        }

        const rowsHtml = messages.map((message) => {
            const safeSubject = escapeHtml(message.subject || "No subject");
            const isSelected = message.id === selectedMessageId && mode === selectedMessageMode;
            const selectedClass = isSelected ? " Inbox_row_is_read" : "";

            return `<div class="row Inbox_row${selectedClass}" data-message-id="${message.id}" data-mode="${mode}">
                <div class="col-10">
                    <p class="e_mailsubject">${safeSubject}</p>
                </div>
                <div class="col-2 Trash_icon d-flex justify-content-end">
                    ${TRASH_ICON_OUTLINE}
                </div>
            </div>`;
        }).join("");

        mailList.innerHTML = rowsHtml;
        document.dispatchEvent(new CustomEvent("inbox:rows-rendered"));
    }

    function clearMainConsole() {
        clearTemplateOneFields();
        clearTemplateTwoFields();
        hideTemplates();
        clearSelectedMessage();
        closeCancelMenu();
    }

    function setActiveMode(mode) {
        const previousMode = activeMode;
        activeMode = mode;

        if (previousMode !== mode) {
            clearMainConsole();
        }

        modeButtons.forEach((modeButton) => {
            const isCurrent = modeButton.dataset.mode === mode;
            modeButton.classList.toggle("Button_option_active", isCurrent);
            modeButton.setAttribute("aria-pressed", String(isCurrent));
        });

        if (pageNaming) {
            pageNaming.textContent = getModeDisplayName(mode);
        }

        renderMailList(mode);
    }

    function openInboxMessage(message) {
        showTemplateTwoWithData({
            recipient: message.recipient,
            subject: message.subject,
            previousMessage: message.previousMessage || message.body,
            replyMessage: ""
        });
    }

    function openSentMessage(message) {
        showTemplateTwoWithData({
            recipient: message.recipient,
            subject: message.subject,
            previousMessage: message.body || message.previousMessage,
            replyMessage: ""
        });
    }

    function openDraftMessage(message) {
        if (message.draftType === "reply") {
            showTemplateTwoWithData({
                recipient: message.recipient,
                subject: message.subject,
                previousMessage: message.previousMessage,
                replyMessage: message.body
            });
            return;
        }

        showTemplateOneWithData(message);
    }

    function getComposePrefillData() {
        if (!inboxComposePrefill || typeof inboxComposePrefill !== "object") {
            return null;
        }

        const recipient = String(inboxComposePrefill.recipient || "").trim();
        const subject = String(inboxComposePrefill.subject || "").trim();
        const body = String(inboxComposePrefill.body || "").trim();

        if (!recipient && !subject && !body) {
            return null;
        }

        return {
            recipient,
            subject,
            body
        };
    }

    function closeCancelMenu() {
        isCancelMenuOpen = false;
        cancelMenuPanel.classList.remove("is-open");
        cancelMenuPanel.setAttribute("aria-hidden", "true");
        cancelMenuTrigger.setAttribute("aria-expanded", "false");
    }

    function openCancelMenu() {
        isCancelMenuOpen = true;
        cancelMenuPanel.classList.add("is-open");
        cancelMenuPanel.setAttribute("aria-hidden", "false");
        cancelMenuTrigger.setAttribute("aria-expanded", "true");
    }

    function toggleCancelMenu() {
        if (isCancelMenuOpen) {
            closeCancelMenu();
            return;
        }

        openCancelMenu();
    }

    function buildComposePayload(action, mode) {
        if (!hasComposeContent()) return null;

        return {
            action,
            mode,
            draft_type: "compose",
            recipient: templateOneRecipient.value.trim(),
            subject: templateOneSubject.value.trim() || "No subject",
            body: templateOneMessage.value.trim(),
            previous_message: ""
        };
    }

    function buildReplyPayload(action, mode) {
        if (!hasReplyContent()) return null;

        return {
            action,
            mode,
            draft_type: "reply",
            recipient: templateTwoRecipient.value.trim(),
            subject: templateTwoSubject.value.trim() || "No subject",
            body: templateTwoReplyMessage.value.trim(),
            previous_message: templateTwoPreviousMessage.value.trim(),
            source_message_id: selectedMessageMode === "inbox" ? selectedMessageId : null
        };
    }

    async function postMailboxAction(payload) {
        if (!inboxActionUrl || isSavingMailboxAction) return null;

        isSavingMailboxAction = true;
        btnSendOrNew.disabled = true;
        saveDraftAction.disabled = true;

        try {
            const response = await fetch(inboxActionUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCsrfToken(),
                    "X-Requested-With": "XMLHttpRequest"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.warn("Inbox: failed to save mailbox action.", error);
            return null;
        } finally {
            isSavingMailboxAction = false;
            btnSendOrNew.disabled = false;
            saveDraftAction.disabled = false;
        }
    }

    function upsertMessage(messageData) {
        if (!messageData || !messageData.mode || !mailboxState[messageData.mode]) return;

        const messages = mailboxState[messageData.mode];
        const existingIndex = messages.findIndex((message) => message.id === messageData.id);

        if (existingIndex >= 0) {
            messages[existingIndex] = messageData;
            return;
        }

        messages.unshift(messageData);
    }

    function removeMessage(messageId, mode) {
        if (!messageId || !mode || !mailboxState[mode]) return false;

        const messages = mailboxState[mode];
        const existingIndex = messages.findIndex((message) => message.id === messageId);

        if (existingIndex < 0) {
            return false;
        }

        messages.splice(existingIndex, 1);
        return true;
    }

    function handleCancelAction() {
        clearTemplateOneFields();
        clearTemplateTwoFields();
        hideTemplates();
        clearSelectedMessage();
        renderMailList(activeMode);
        closeCancelMenu();
    }

    async function handleSaveDraftAction() {
        let draftPayload = null;

        if (isTemplateVisible(templateOne)) {
            draftPayload = buildComposePayload("save_draft", "drafts");
        } else if (isTemplateVisible(templateTwo)) {
            draftPayload = buildReplyPayload("save_draft", "drafts");
        }

        if (draftPayload) {
            const responseData = await postMailboxAction(draftPayload);
            if (responseData && responseData.message) {
                upsertMessage(responseData.message);
                if (activeMode === "drafts") {
                    renderMailList("drafts");
                }
            }
        }

        closeCancelMenu();
    }

    async function handleSendAction() {
        if (!isTemplateVisible(templateOne) && !isTemplateVisible(templateTwo)) {
            clearSelectedMessage();
            renderMailList(activeMode);
            showTemplateOne();
            return;
        }

        let sentPayload = null;

        if (isTemplateVisible(templateOne)) {
            sentPayload = buildComposePayload("send", "sent");
            if (!sentPayload || sentPayload.body.length === 0) {
                templateOneMessage.focus();
                return;
            }
        } else if (isTemplateVisible(templateTwo)) {
            sentPayload = buildReplyPayload("send", "sent");
            if (!sentPayload) {
                templateTwoReplyMessage.focus();
                return;
            }
        }

        const responseData = await postMailboxAction(sentPayload);
        if (!responseData || !responseData.message) {
            return;
        }

        upsertMessage(responseData.message);
        upsertMessage(responseData.source_message);
        clearTemplateOneFields();
        clearTemplateTwoFields();
        hideTemplates();
        clearSelectedMessage();
        renderMailList(activeMode);
    }

    async function handleDeleteMessage(clickedRow) {
        const messageId = Number(clickedRow.dataset.messageId);
        const messageMode = clickedRow.dataset.mode || activeMode;
        if (!messageId || !messageMode) {
            return;
        }

        const responseData = await postMailboxAction({
            action: "delete",
            message_id: messageId
        });
        if (!responseData || responseData.message_id !== messageId) {
            return;
        }

        removeMessage(messageId, messageMode);

        if (selectedMessageId === messageId && selectedMessageMode === messageMode) {
            clearTemplateOneFields();
            clearTemplateTwoFields();
            hideTemplates();
            clearSelectedMessage();
        }

        renderMailList(activeMode);
    }

    mailList.addEventListener("click", (event) => {
        const clickedRow = event.target.closest(".Inbox_row");
        if (!clickedRow || !mailList.contains(clickedRow)) {
            return;
        }

        if (event.target.closest(".Trash_icon")) {
            event.preventDefault();
            event.stopPropagation();
            handleDeleteMessage(clickedRow);
            return;
        }

        const messageId = Number(clickedRow.dataset.messageId);
        const message = findMessageInMode(messageId, activeMode);
        if (!message) {
            return;
        }

        selectedMessageId = message.id;
        selectedMessageMode = activeMode;
        renderMailList(activeMode);

        if (activeMode === "inbox") {
            openInboxMessage(message);
            return;
        }

        if (activeMode === "sent") {
            openSentMessage(message);
            return;
        }

        openDraftMessage(message);
    });

    modeButtons.forEach((modeButton) => {
        modeButton.addEventListener("click", () => {
            setActiveMode(modeButton.dataset.mode);
        });
    });

    btnSendOrNew.addEventListener("click", handleSendAction);
    cancelAction.addEventListener("click", handleCancelAction);
    saveDraftAction.addEventListener("click", handleSaveDraftAction);

    cancelMenuTrigger.addEventListener("click", toggleCancelMenu);
    cancelMenuTrigger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleCancelMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeCancelMenu();
        }
    });

    document.addEventListener("click", (event) => {
        if (
            isCancelMenuOpen &&
            !cancelMenuPanel.contains(event.target) &&
            !cancelMenuTrigger.contains(event.target)
        ) {
            closeCancelMenu();
        }
    });

    allTemplateFields.forEach((inputField) => {
        inputField.addEventListener("input", () => {
            syncFieldState(inputField);
        });
        syncFieldState(inputField);
    });

    closeCancelMenu();
    hideTemplates();
    clearTemplateOneFields();
    clearTemplateTwoFields();
    setActiveMode("inbox");

    const composePrefillData = getComposePrefillData();
    if (composePrefillData) {
        clearSelectedMessage();
        renderMailList(activeMode);
        showTemplateOneWithData(composePrefillData);
        templateOneSubject.focus();
    }
}

document.addEventListener("DOMContentLoaded", setupInboxTemplateSwitching);
