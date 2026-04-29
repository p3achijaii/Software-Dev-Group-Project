(() => {
    "use strict";

    function getCookie(name) {
        const cookieString = document.cookie || "";
        const cookies = cookieString.split(";");
        for (let index = 0; index < cookies.length; index += 1) {
            const trimmed = cookies[index].trim();
            if (trimmed.startsWith(`${name}=`)) {
                return decodeURIComponent(trimmed.substring(name.length + 1));
            }
        }
        return "";
    }

    function getCsrfToken() {
        const fromCookie = getCookie("csrftoken");
        if (fromCookie) return fromCookie;

        const tokenInput = document.querySelector("input[name='csrfmiddlewaretoken']");
        return tokenInput ? tokenInput.value : "";
    }

    window.SDGP_CSRF = {
        getCookie,
        getCsrfToken
    };
})();
