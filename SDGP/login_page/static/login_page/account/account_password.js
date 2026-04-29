(() => {
    const passwordInput = document.getElementById("account-password");
    if (!passwordInput) {
        return;
    }

    const VALID_CLASS = "is-password-valid";
    const INVALID_CLASS = "is-password-invalid";

    function syncPasswordBorderState() {
        const passwordValue = passwordInput.value;
        const hasValue = passwordValue.length > 0;
        const meetsLengthRule = passwordValue.length >= 8;

        passwordInput.classList.remove(VALID_CLASS, INVALID_CLASS);

        if (!hasValue) {
            return;
        }

        passwordInput.classList.add(meetsLengthRule ? VALID_CLASS : INVALID_CLASS);
    }

    passwordInput.addEventListener("input", syncPasswordBorderState);
    passwordInput.addEventListener("blur", syncPasswordBorderState);
    syncPasswordBorderState();
})();
