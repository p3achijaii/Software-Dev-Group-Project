const searchFieldIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
</svg>`;

const searchableFields = document.querySelectorAll(".question_form_text");

searchableFields.forEach((fieldWrapper) => {
    const fieldLabel = fieldWrapper.querySelector("label");
    const fieldInput = fieldWrapper.querySelector("input, textarea");

    if (!fieldLabel || !fieldInput) {
        return;
    }

    const labelText = fieldLabel.textContent.trim();
    if (!/search/i.test(labelText)) {
        return;
    }

    if (fieldWrapper.querySelector(".search-field-icon")) {
        return;
    }

    fieldWrapper.classList.add("has-search-icon");

    const iconButton = document.createElement("button");
    iconButton.type = "button";
    iconButton.className = "search-field-icon";
    iconButton.setAttribute("aria-label", "Focus search field");
    iconButton.innerHTML = searchFieldIcon;

    iconButton.addEventListener("click", () => {
        fieldInput.focus();
    });

    fieldInput.insertAdjacentElement("afterend", iconButton);
});
