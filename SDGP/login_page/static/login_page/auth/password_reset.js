const resetForm = document.getElementById("reset-form");
const resetEmailInput = document.getElementById("reset-email");
const newPasswordInput = document.getElementById("new-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const ruleRows = document.querySelectorAll(".Rows_Suggestion[data-rule]");
const resetButton = document.getElementById("sign-in-btn");
const resetFeedback = document.getElementById("reset-feedback");

const redDotIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-circle-fill" viewBox="0 0 16 16">
  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14"/>
</svg>`;

const greenCheckCircleIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16">
  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0m-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
</svg>`;

function setResetFeedback(message, type) {
    resetFeedback.textContent = message;
    resetFeedback.classList.remove("is-error", "is-success");

    if (type) {
        resetFeedback.classList.add(type);
    }
}

function updateFieldState(input) {
    const fieldWrapper = input.closest(".question_form_text");

    if (!fieldWrapper) {
        return;
    }

    fieldWrapper.classList.toggle("has-value", input.value.length > 0);
}

function bindFloatingLabels() {
    const resetInputs = resetForm.querySelectorAll(".question_form_text input");

    resetInputs.forEach((input) => {
        updateFieldState(input);
        input.addEventListener("input", () => updateFieldState(input));
        input.addEventListener("blur", () => updateFieldState(input));
    });
}

function getRuleState(ruleKey, value) {
    const hasLowercase = /[a-z]/.test(value);
    const hasUppercase = /[A-Z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecial = /[^A-Za-z0-9]/.test(value);

    if (ruleKey === "length") {
        if (value.length >= 8) {
            return { state: "met", isMet: true };
        }
        if (value.length > 0) {
            return { state: "partial", isMet: false };
        }
        return { state: "not-met", isMet: false };
    }

    if (ruleKey === "case") {
        if (hasLowercase && hasUppercase) {
            return { state: "met", isMet: true };
        }
        if (hasLowercase || hasUppercase) {
            return { state: "partial", isMet: false };
        }
        return { state: "not-met", isMet: false };
    }

    if (ruleKey === "number") {
        if (hasNumber) {
            return { state: "met", isMet: true };
        }
        if (value.length > 0) {
            return { state: "partial", isMet: false };
        }
        return { state: "not-met", isMet: false };
    }

    if (ruleKey === "special") {
        if (hasSpecial) {
            return { state: "met", isMet: true };
        }
        if (value.length > 0) {
            return { state: "partial", isMet: false };
        }
        return { state: "not-met", isMet: false };
    }

    return { state: "not-met", isMet: false };
}

function evaluatePassword(value) {
    return {
        length: getRuleState("length", value),
        case: getRuleState("case", value),
        number: getRuleState("number", value),
        special: getRuleState("special", value)
    };
}

function updateRuleStates(passwordValue) {
    const ruleResults = evaluatePassword(passwordValue);
    const allRulesMet = Object.values(ruleResults).every((ruleResult) => ruleResult.isMet);

    ruleRows.forEach((row) => {
        const ruleKey = row.dataset.rule;
        const status = row.querySelector(".rule-status");
        const ruleIcon = row.querySelector(".rule-icon");
        const ruleResult = ruleResults[ruleKey] || { state: "not-met", isMet: false };

        row.classList.remove("rule-not-met", "rule-partial", "rule-met");
        row.classList.add(`rule-${ruleResult.state}`);

        status.textContent = "";
        ruleIcon.innerHTML = ruleResult.state === "met" ? greenCheckCircleIcon : redDotIcon;
    });

    resetButton.disabled = !allRulesMet;
    return allRulesMet;
}

newPasswordInput.addEventListener("input", () => {
    updateRuleStates(newPasswordInput.value);
    setResetFeedback("", "");
});

resetEmailInput.addEventListener("input", () => {
    setResetFeedback("", "");
});

confirmPasswordInput.addEventListener("input", () => {
    setResetFeedback("", "");
});

resetForm.addEventListener("submit", (event) => {
    const passwordValue = newPasswordInput.value;
    const isValidPassword = updateRuleStates(passwordValue);

    if (!isValidPassword) {
        event.preventDefault();
        setResetFeedback("Password does not meet all requirements yet.", "is-error");
        return;
    }
});

bindFloatingLabels();
updateRuleStates("");
