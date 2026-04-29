const loginForm = document.getElementById("login-form");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const signInButton = document.getElementById("sign-in-btn");
const loginFeedback = document.getElementById("login-feedback");
const forgotPasswordLink = document.getElementById("forgot-password-link");
const signUpUrl = loginForm?.dataset.signUpUrl || signInButton?.dataset.signUpUrl || "";

function setLoginFeedback(message, type) {
    loginFeedback.textContent = message;
    loginFeedback.classList.remove("is-error", "is-success");

    if (type) {
        loginFeedback.classList.add(type);
    }
}

function hasInputContent() {
    return loginEmailInput.value.trim().length > 0 || loginPasswordInput.value.trim().length > 0;
}

function updateSubmitButtonState() {
    const signInMode = hasInputContent();

    signInButton.textContent = signInMode ? "Sign In" : "Sign Up";
    signInButton.dataset.mode = signInMode ? "sign-in" : "sign-up";
}

function updateFieldState(input) {
    const fieldWrapper = input.closest(".question_form_text");

    if (!fieldWrapper) {
        return;
    }

    fieldWrapper.classList.toggle("has-value", input.value.length > 0);
}

function bindFloatingLabels(formElement) {
    const formInputs = formElement.querySelectorAll(".question_form_text input");

    formInputs.forEach((input) => {
        updateFieldState(input);
        input.addEventListener("input", () => updateFieldState(input));
        input.addEventListener("blur", () => updateFieldState(input));
    });
}

function getCsrfToken(formElement) {
    return formElement.querySelector("input[name='csrfmiddlewaretoken']").value;
}

async function submitFormData(url, formData, csrfToken) {
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "X-CSRFToken": csrfToken,
            "X-Requested-With": "XMLHttpRequest"
        },
        body: new URLSearchParams(formData)
    });

    const contentType = response.headers.get("content-type") || "";
    let responseData = {};

    if (contentType.includes("application/json")) {
        try {
            responseData = await response.json();
        } catch {
            responseData = {};
        }
    } else {
        await response.text();
        throw { message: "Wrong password or e-mail." };
    }

    if (!response.ok) {
        throw responseData && typeof responseData === "object"
            ? responseData
            : { message: "Wrong password or e-mail." };
    }

    return responseData;
}

if (loginForm && loginEmailInput && loginPasswordInput && signInButton && loginFeedback) {
    loginEmailInput.addEventListener("input", updateSubmitButtonState);
    loginPasswordInput.addEventListener("input", updateSubmitButtonState);

    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener("click", () => {
            const emailValue = loginEmailInput.value.trim().toLowerCase();
            const passwordResetBaseUrl = forgotPasswordLink.dataset.baseHref;

            if (emailValue) {
                forgotPasswordLink.href = `${passwordResetBaseUrl}?email=${encodeURIComponent(emailValue)}`;
                return;
            }

            forgotPasswordLink.href = passwordResetBaseUrl;
        });
    }

    bindFloatingLabels(loginForm);
    updateSubmitButtonState();

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const signInMode = hasInputContent();

        if (!signInMode) {
            setLoginFeedback("", "");
            if (signUpUrl) {
                window.location.href = signUpUrl;
            }
            return;
        }

        const emailValue = loginEmailInput.value.trim().toLowerCase();
        const passwordValue = loginPasswordInput.value;

        if (!emailValue || !passwordValue) {
            setLoginFeedback("Enter both e-mail and password.", "is-error");
            return;
        }

        try {
            const responseData = await submitFormData(
                loginForm.action,
                {
                    email: emailValue,
                    password: passwordValue
                },
                getCsrfToken(loginForm)
            );

            setLoginFeedback(responseData.message, "is-success");
            window.location.href = responseData.redirect_to;
        } catch (error) {
            const fallbackMessage = "Wrong password or e-mail.";
            const message = error && typeof error === "object" && "message" in error
                ? error.message
                : fallbackMessage;
            setLoginFeedback(message || fallbackMessage, "is-error");
        }
    });
}
