(() => {
    const sidebar = document.querySelector(".Side-Bar-expanded, .Side-Bar-collapsed");
    const main = document.getElementById("Main-Dashboard");
    if (!sidebar || !main) return;

    const CLASSES = {
        sidebarExpanded: ["col-2", "Side-Bar-expanded"],
        sidebarCollapsed: ["col-1", "Side-Bar-collapsed"],
        mainExpanded: ["col-10"],
        mainCollapsed: ["col-11"]
    };

    let pinnedExpanded = false;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");

    function applyExpanded() {
        sidebar.classList.remove(...CLASSES.sidebarCollapsed);
        sidebar.classList.add(...CLASSES.sidebarExpanded);
        main.classList.remove(...CLASSES.mainCollapsed);
        main.classList.add(...CLASSES.mainExpanded);
    }

    function applyCollapsed() {
        sidebar.classList.remove(...CLASSES.sidebarExpanded);
        sidebar.classList.add(...CLASSES.sidebarCollapsed);
        main.classList.remove(...CLASSES.mainExpanded);
        main.classList.add(...CLASSES.mainCollapsed);
    }

    sidebar.addEventListener("pointerenter", () => {
        if (!canHover.matches || pinnedExpanded) return;
        applyExpanded();
    });

    sidebar.addEventListener("pointerleave", () => {
        if (!canHover.matches || pinnedExpanded) return;
        applyCollapsed();
    });

    sidebar.addEventListener("click", (event) => {
        if (event.target.closest("a, button, input, textarea, select, label")) return;
        pinnedExpanded = !pinnedExpanded;
        pinnedExpanded ? applyExpanded() : applyCollapsed();
    });

    sidebar.addEventListener("focusin", () => {
        if (!canHover.matches || pinnedExpanded) return;
        applyExpanded();
    });

    sidebar.addEventListener("focusout", (event) => {
        if (!canHover.matches || pinnedExpanded) return;
        if (!sidebar.contains(event.relatedTarget)) applyCollapsed();
    });

    canHover.addEventListener("change", () => {
        if (!canHover.matches && !pinnedExpanded) applyCollapsed();
    });

    applyCollapsed();
})();
